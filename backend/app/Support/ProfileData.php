<?php

namespace App\Support;

/**
 * The resume-style part of a profile: headline, summary, skills, work history
 * and so on. One place defines the shape, so saving a profile and reading a
 * resume with the AI both end up with exactly the same safe data.
 */
class ProfileData
{
    /** Longest allowed text for each simple field. */
    private const TEXT = ['headline' => 120, 'summary' => 1500, 'website' => 200];

    /** Longest allowed item and most items for each plain list. */
    private const LISTS = [
        'skills' => ['item' => 40, 'max' => 30],
        'certifications' => ['item' => 100, 'max' => 10],
        'languages' => ['item' => 40, 'max' => 10],
    ];

    private const MAX_EXPERIENCE = 10;

    private const MAX_EDUCATION = 6;

    /** @return array<string, mixed> */
    public static function rules(): array
    {
        $rules = [
            'headline' => ['nullable', 'string', 'max:'.self::TEXT['headline']],
            'summary' => ['nullable', 'string', 'max:'.self::TEXT['summary']],
            'website' => ['nullable', 'string', 'url', 'max:'.self::TEXT['website']],

            'experience' => ['nullable', 'array', 'max:'.self::MAX_EXPERIENCE],
            'experience.*.title' => ['required', 'string', 'max:100'],
            'experience.*.company' => ['nullable', 'string', 'max:100'],
            'experience.*.start' => ['nullable', 'string', 'max:30'],
            'experience.*.end' => ['nullable', 'string', 'max:30'],
            'experience.*.description' => ['nullable', 'string', 'max:800'],

            'education' => ['nullable', 'array', 'max:'.self::MAX_EDUCATION],
            'education.*.school' => ['required', 'string', 'max:120'],
            'education.*.degree' => ['nullable', 'string', 'max:120'],
            'education.*.start' => ['nullable', 'string', 'max:30'],
            'education.*.end' => ['nullable', 'string', 'max:30'],
        ];

        foreach (self::LISTS as $key => $limit) {
            $rules[$key] = ['nullable', 'array', 'max:'.$limit['max']];
            $rules["{$key}.*"] = ['nullable', 'string', 'max:'.$limit['item']];
        }

        return $rules;
    }

    /**
     * Adds https:// to a website typed without it, so "linkedin.com/in/me" is accepted.
     */
    public static function withScheme(mixed $website): mixed
    {
        if (is_string($website) && trim($website) !== '' && ! preg_match('#^https?://#i', trim($website))) {
            return 'https://'.trim($website);
        }

        return $website;
    }

    /**
     * Cleans already-validated input: no blank list items, no repeats, no empty rows.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function tidy(array $data): array
    {
        $out = [];

        foreach (array_keys(self::TEXT) as $key) {
            $value = isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : '';
            $out[$key] = $value === '' ? null : $value;
        }

        foreach (array_keys(self::LISTS) as $key) {
            $out[$key] = self::strings($data[$key] ?? []);
        }

        $out['experience'] = self::rows($data['experience'] ?? [], 'title', ['title', 'company', 'start', 'end', 'description']);
        $out['education'] = self::rows($data['education'] ?? [], 'school', ['school', 'degree', 'start', 'end']);

        return $out;
    }

    /**
     * Turns untrusted AI output into the same shape, cutting anything too long
     * or wrong instead of failing, because a partly useful answer is still useful.
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public static function fromAi(array $raw): array
    {
        $data = [];

        foreach (self::TEXT as $key => $max) {
            $data[$key] = self::plain($raw[$key] ?? null, $max);
        }
        // Only keep a website that is a real web address.
        $site = $data['website'] === null ? null : self::withScheme($data['website']);
        $data['website'] = $site !== null && filter_var($site, FILTER_VALIDATE_URL) ? $site : null;

        foreach (self::LISTS as $key => $limit) {
            $items = [];
            foreach (array_slice(self::asList($raw[$key] ?? null), 0, $limit['max'] * 2) as $item) {
                // An over-long item is usually a sentence, not a skill, so it is dropped rather than cut short.
                $text = self::plain($item, $limit['item'] + 1);
                $items[] = $text !== null && mb_strlen($text) <= $limit['item'] ? $text : null;
            }
            $data[$key] = array_slice(self::strings($items), 0, $limit['max']);
        }

        $data['experience'] = array_slice(self::aiRows($raw['experience'] ?? null, ['title' => 100, 'company' => 100, 'start' => 30, 'end' => 30, 'description' => 800], 'title'), 0, self::MAX_EXPERIENCE);
        $data['education'] = array_slice(self::aiRows($raw['education'] ?? null, ['school' => 120, 'degree' => 120, 'start' => 30, 'end' => 30], 'school'), 0, self::MAX_EDUCATION);

        return $data;
    }

    /** @return list<string> */
    private static function strings(mixed $items): array
    {
        $seen = [];
        foreach ((array) $items as $item) {
            if (! is_string($item) || trim($item) === '') {
                continue;
            }
            $item = trim($item);
            $seen[mb_strtolower($item)] ??= $item;
        }

        return array_values($seen);
    }

    /**
     * @param  list<string>  $fields
     * @return list<array<string, ?string>>
     */
    private static function rows(mixed $rows, string $required, array $fields): array
    {
        $out = [];
        foreach ((array) $rows as $row) {
            if (! is_array($row) || trim((string) ($row[$required] ?? '')) === '') {
                continue;
            }
            $clean = [];
            foreach ($fields as $field) {
                $value = isset($row[$field]) && is_string($row[$field]) ? trim($row[$field]) : '';
                $clean[$field] = $value === '' ? null : $value;
            }
            $out[] = $clean;
        }

        return $out;
    }

    /**
     * @param  array<string, int>  $fields  field name => longest allowed text
     * @return list<array<string, ?string>>
     */
    private static function aiRows(mixed $rows, array $fields, string $required): array
    {
        $out = [];
        foreach (self::asList($rows) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $clean = [];
            foreach ($fields as $field => $max) {
                $clean[$field] = self::plain($row[$field] ?? null, $max);
            }
            if ($clean[$required] !== null) {
                $out[] = $clean;
            }
        }

        return $out;
    }

    /** @return list<mixed> */
    private static function asList(mixed $value): array
    {
        return is_array($value) ? array_values($value) : [];
    }

    /** Text only: tags removed, trimmed, cut to length, and "null"-like words turned into nothing. */
    private static function plain(mixed $value, int $max): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim(mb_substr(strip_tags($value), 0, $max));

        return in_array(mb_strtolower($value), ['', 'null', 'n/a', 'none'], true) ? null : $value;
    }
}
