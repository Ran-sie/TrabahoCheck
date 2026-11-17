<?php

namespace App\Support;

use App\Models\User;

/** A user's saved profile as plain text, for sending to the AI. */
class ProfileText
{
    private const MAX_CHARS = 5000;

    /** True when the profile has enough in it to be reviewed or compared with a job. */
    public static function hasContent(User $user): bool
    {
        return filled($user->headline) || filled($user->summary)
            || ! empty($user->skills) || ! empty($user->experience);
    }

    public static function for(User $user): string
    {
        $lines = [];

        foreach (['headline' => 'Headline', 'summary' => 'Summary'] as $field => $label) {
            if (filled($user->{$field})) {
                $lines[] = "{$label}: {$user->{$field}}";
            }
        }

        if (! empty($user->skills)) {
            $lines[] = 'Skills: '.implode(', ', (array) $user->skills);
        }

        foreach ((array) $user->experience as $job) {
            $when = trim(($job['start'] ?? '').' - '.($job['end'] ?? ''), ' -');
            $lines[] = trim('Experience: '.($job['title'] ?? '').' at '.($job['company'] ?? '').($when !== '' ? " ({$when})" : '')
                .(filled($job['description'] ?? null) ? ': '.$job['description'] : ''));
        }

        foreach ((array) $user->education as $school) {
            $lines[] = trim('Education: '.($school['degree'] ?? '').' at '.($school['school'] ?? ''));
        }

        foreach (['certifications' => 'Certifications', 'languages' => 'Languages'] as $field => $label) {
            if (! empty($user->{$field})) {
                $lines[] = "{$label}: ".implode(', ', (array) $user->{$field});
            }
        }

        return mb_substr(implode("\n", $lines), 0, self::MAX_CHARS);
    }
}
