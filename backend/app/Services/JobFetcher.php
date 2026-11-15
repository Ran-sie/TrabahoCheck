<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Downloads a job page and turns it into plain text for the analyzer.
 */
class JobFetcher
{
    private const MAX_REDIRECTS = 3;

    /**
     * @throws RuntimeException when the page cannot be read.
     */
    public function fetchText(string $url): string
    {
        $html = $this->download($url);

        return $this->extractText($html);
    }

    private function download(string $url): string
    {
        for ($i = 0; $i <= self::MAX_REDIRECTS; $i++) {
            $this->assertSafeUrl($url);

            try {
                $response = Http::withoutRedirecting()
                    ->timeout(10)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (compatible; TrabahoCheck/1.0)',
                        'Accept' => 'text/html,application/xhtml+xml',
                    ])
                    ->get($url);
            } catch (\Throwable) {
                throw new RuntimeException('unreachable');
            }

            if ($response->redirect()) {
                $location = $response->header('Location');
                if ($location === '') {
                    break;
                }
                $url = $this->resolveRedirect($url, $location);

                continue;
            }

            if (! $response->successful()) {
                throw new RuntimeException('blocked');
            }

            return substr($response->body(), 0, 2_000_000);
        }

        throw new RuntimeException('redirects');
    }

    /**
     * Only public http(s) addresses are allowed, so the server cannot be
     * used to reach internal services (SSRF protection).
     */
    private function assertSafeUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = $parts['host'] ?? '';

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            throw new RuntimeException('invalid_url');
        }

        $ips = filter_var($host, FILTER_VALIDATE_IP)
            ? [$host]
            : (gethostbynamel($host) ?: []);

        if ($ips === []) {
            throw new RuntimeException('not_found');
        }

        foreach ($ips as $ip) {
            $isPublic = filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if ($isPublic === false) {
                throw new RuntimeException('not_allowed');
            }
        }
    }

    private function resolveRedirect(string $base, string $location): string
    {
        if (preg_match('#^https?://#i', $location)) {
            return $location;
        }

        $parts = parse_url($base);
        $origin = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '');

        if (str_starts_with($location, '/')) {
            return $origin.$location;
        }

        return $origin.'/'.$location;
    }

    private function extractText(string $html): string
    {
        $chunks = $this->jobPostingFromJsonLd($html);

        $body = preg_replace('#<(script|style|noscript|svg)\b[^>]*>.*?</\1>#is', ' ', $html) ?? $html;
        $body = preg_replace('#<(br|/p|/div|/li|/h[1-6])\b[^>]*>#i', "\n", $body) ?? $body;
        $chunks[] = $this->clean(strip_tags($body));

        return trim(implode("\n", array_filter($chunks)));
    }

    /**
     * Many job sites embed the post as JSON-LD, which is cleaner than the page body.
     *
     * @return list<string>
     */
    private function jobPostingFromJsonLd(string $html): array
    {
        $out = [];

        if (! preg_match_all('#<script[^>]+application/ld\+json[^>]*>(.*?)</script>#is', $html, $matches)) {
            return $out;
        }

        foreach ($matches[1] as $json) {
            $data = json_decode(html_entity_decode($json), true);
            if (! is_array($data)) {
                continue;
            }

            $items = isset($data['@graph']) ? $data['@graph'] : (array_is_list($data) ? $data : [$data]);

            foreach ($items as $item) {
                if (! is_array($item) || ($item['@type'] ?? null) !== 'JobPosting') {
                    continue;
                }

                $out[] = (string) ($item['title'] ?? '');
                $out[] = (string) ($item['hiringOrganization']['name'] ?? '');
                $out[] = $this->clean(strip_tags(html_entity_decode((string) ($item['description'] ?? ''))));
                if (isset($item['baseSalary'])) {
                    $out[] = 'Salary: '.json_encode($item['baseSalary']);
                }
            }
        }

        return $out;
    }

    private function clean(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5);
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;

        return trim(preg_replace('/\s*\n\s*/', "\n", $text) ?? $text);
    }
}
