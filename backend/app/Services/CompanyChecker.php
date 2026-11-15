<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Checks the company websites and email domains named in a job post.
 *
 * It only looks the domain up (DNS and public registration records). It never
 * opens the website itself, so a malicious post cannot make the server fetch
 * an arbitrary address.
 */
class CompanyChecker
{
    private const MAX_DOMAINS = 2;

    /** Job boards, social sites, chat apps and free mail are not "the company". */
    private const IGNORED = [
        'indeed.com', 'upwork.com', 'linkedin.com', 'facebook.com', 'fb.com', 'fb.me', 'messenger.com',
        'onlinejobs.ph', 'jobstreet.com', 'jobstreet.com.ph', 'kalibrr.com', 'glassdoor.com', 'freelancer.com',
        'fiverr.com', 'google.com', 'goo.gl', 'bit.ly', 'tinyurl.com', 't.me', 'telegram.org', 'telegram.me',
        'wa.me', 'whatsapp.com', 'youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com', 'twitter.com',
        'x.com', 'gmail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com', 'hotmail.com', 'live.com',
        'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'mail.com', 'gmx.com', 'ymail.com',
    ];

    private const SECOND_LEVEL = ['com', 'co', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne'];
    private const RESERVED_TLDS = ['example', 'test', 'invalid', 'localhost', 'local', 'internal'];

    /**
     * @return array{
     *     domains: list<array{domain: string, age_days: ?int, exists: bool}>,
     *     flags: list<array<string, mixed>>,
     *     positives: list<array{en: string, tl: string}>
     * }
     */
    public function check(string $text): array
    {
        $domains = [];
        $flags = [];
        $positives = [];

        foreach ($this->extractDomains($text) as $domain) {
            $info = $this->lookupDomain($domain);
            $domains[] = ['domain' => $domain, 'age_days' => $info['age_days'], 'exists' => $info['exists']];

            if (! $info['exists']) {
                $flags[] = [
                    'title' => 'A company website or email domain does not exist',
                    'detail' => 'The domain named in the post is not registered or does not work. Real companies have working websites and email.',
                    'tl' => [
                        'title' => 'Hindi umiiral ang website o email domain ng kumpanya',
                        'detail' => 'Ang domain na nasa post ay hindi rehistrado o hindi gumagana. May gumaganang website at email ang totoong kumpanya.',
                    ],
                    'weight' => 20, 'severity' => 'high', 'evidence' => $domain,
                ];

                continue;
            }

            $age = $info['age_days'];
            if ($age !== null && $age < 30) {
                $flags[] = $this->newDomainFlag($domain, $age, 25, 'high');
            } elseif ($age !== null && $age < 180) {
                $flags[] = $this->newDomainFlag($domain, $age, 20, 'medium');
            } elseif ($age !== null && $age >= 730) {
                $years = intdiv($age, 365);
                $positives[] = [
                    'en' => "The company domain {$domain} was registered {$years}+ years ago",
                    'tl' => "Ang domain ng kumpanya na {$domain} ay nairehistro {$years}+ taon na ang nakalipas",
                ];
            }
        }

        return ['domains' => $domains, 'flags' => $flags, 'positives' => $positives];
    }

    /**
     * Company domains found in the post: company email addresses first, then
     * links written with http(s):// or www.
     *
     * @return list<string>
     */
    public function extractDomains(string $text): array
    {
        $text = mb_strtolower($text);
        $found = [];

        preg_match_all('/[a-z0-9._%+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)/', $text, $emails);
        preg_match_all('~(?:https?://|www\.)([a-z0-9-]+(?:\.[a-z0-9-]+)+)~', $text, $links);

        foreach ([...$emails[1], ...$links[1]] as $host) {
            $domain = $this->registrable(preg_replace('/^www\./', '', $host));

            if ($domain === null || in_array($domain, self::IGNORED, true) || in_array($domain, $found, true)) {
                continue;
            }

            $found[] = $domain;
            if (count($found) === self::MAX_DOMAINS) {
                break;
            }
        }

        return $found;
    }

    /** Reduces a host such as "careers.acme.com.ph" to "acme.com.ph". */
    private function registrable(string $host): ?string
    {
        $labels = explode('.', trim($host, '.'));
        if (count($labels) < 2) {
            return null;
        }

        $tld = end($labels);
        if (! preg_match('/^[a-z]{2,24}$/', $tld) || in_array($tld, self::RESERVED_TLDS, true)) {
            return null;
        }

        $second = $labels[count($labels) - 2];
        $keep = (strlen($tld) === 2 && in_array($second, self::SECOND_LEVEL, true)) ? 3 : 2;

        return implode('.', array_slice($labels, -$keep));
    }

    /**
     * @return array{age_days: ?int, exists: bool}
     */
    protected function lookupDomain(string $domain): array
    {
        $cacheKey = 'company-domain:'.$domain;
        if (is_array($cached = Cache::get($cacheKey))) {
            return $cached;
        }

        $age = null;
        $registered = null; // null = the registry could not be reached

        try {
            $response = Http::timeout(5)->acceptJson()->get('https://rdap.org/domain/'.$domain);

            if ($response->status() === 404) {
                $registered = false;
            } elseif ($response->successful()) {
                $registered = true;
                foreach ((array) $response->json('events', []) as $event) {
                    if (($event['eventAction'] ?? '') === 'registration' && isset($event['eventDate'])) {
                        $age = max(0, (int) floor((time() - strtotime($event['eventDate'])) / 86400));
                    }
                }
            }
        } catch (\Throwable) {
            // Registry unreachable: decide from DNS alone.
        }

        $resolves = false;
        foreach (['NS', 'A', 'AAAA', 'MX'] as $type) {
            $resolves = $resolves || checkdnsrr($domain.'.', $type);
        }

        $info = ['age_days' => $age, 'exists' => self::domainExists($registered, $resolves)];

        // Do not remember an answer that came from a failed lookup.
        if ($registered !== null) {
            Cache::put($cacheKey, $info, now()->addDay());
        }

        return $info;
    }

    /**
     * A missing registry record is not proof: the registry behind rdap.org does
     * not cover every country (for example .ph), so real Philippine company
     * domains also come back "not found". A domain only counts as missing when
     * the registry does not know it AND DNS has nothing for it.
     */
    public static function domainExists(?bool $registered, bool $resolves): bool
    {
        if ($registered === true || $resolves) {
            return true;
        }

        // Registry unreachable and no DNS answer: we cannot tell, so do not accuse.
        return $registered === null;
    }

    /** @return array<string, mixed> */
    private function newDomainFlag(string $domain, int $age, int $weight, string $severity): array
    {
        return [
            'title' => 'The company website is brand new',
            'detail' => 'Scam companies often use a website registered only days or weeks ago. Established companies have older domains.',
            'tl' => [
                'title' => 'Bago pa lang ang website ng kumpanya',
                'detail' => 'Madalas gumagamit ang scam ng website na nairehistro lang ilang araw o linggo pa lang. Mas matagal na ang domain ng matatag na kumpanya.',
            ],
            'weight' => $weight, 'severity' => $severity,
            'evidence' => "{$domain} ({$age} d)",
        ];
    }
}
