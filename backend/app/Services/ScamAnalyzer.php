<?php

namespace App\Services;

/**
 * Rule-based scam scoring (English and Taglish).
 *
 * Every matching rule adds its weight to the risk score and produces one
 * plain-language red flag, together with the exact words that triggered it.
 * "Critical" rules (money, fake cheques, task scams) set a minimum score on
 * their own. Good signs lower the score slightly, but never when a critical
 * rule fired, because scammers can copy legitimate-sounding wording.
 *
 * Every user-facing text carries an English ("en") and a Tagalog ("tl") version
 * so the app can switch language without asking the server again.
 */
class ScamAnalyzer
{
    private const FREE_EMAIL_DOMAINS = [
        'gmail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com', 'hotmail.com', 'live.com',
        'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'mail.com', 'gmx.com', 'ymail.com',
    ];

    public const CRITICAL_FLOOR = 60;
    private const MAX_GOOD_SIGN_DISCOUNT = 20;

    /**
     * @param  list<array<string, mixed>>  $extraFlags  extra red flags (title, detail, tl, weight, severity, evidence)
     * @param  list<array{en: string, tl: string}>  $extraPositives  extra good signs
     * @return array{
     *     score: int,
     *     level: string,
     *     flags: list<array{title: string, detail: string, tl: array{title: string, detail: string}, severity: string, evidence: ?string}>,
     *     positives: list<array{en: string, tl: string}>
     * }
     */
    public function analyze(string $raw, array $extraFlags = [], array $extraPositives = []): array
    {
        $text = mb_strtolower($raw);
        $flags = [];
        $score = 0;
        $critical = false;

        foreach ($this->rules() as $rule) {
            $evidence = $rule['check']($text, $raw);
            if ($evidence === null) {
                continue;
            }

            $score += $rule['weight'];
            $critical = $critical || ($rule['critical'] ?? false);
            $flags[] = [
                'title' => $rule['title'],
                'detail' => $rule['detail'],
                'tl' => $rule['tl'],
                'severity' => $rule['severity'],
                'evidence' => $evidence === '' ? null : $evidence,
            ];
        }

        // Findings from outside the text rules, such as the company domain check.
        foreach ($extraFlags as $extra) {
            $score += $extra['weight'];
            $flags[] = [
                'title' => $extra['title'],
                'detail' => $extra['detail'],
                'tl' => $extra['tl'],
                'severity' => $extra['severity'],
                'evidence' => $extra['evidence'] ?? null,
            ];
        }

        $positives = $critical ? [] : [...$this->goodSigns($text), ...$extraPositives];
        $score -= min(self::MAX_GOOD_SIGN_DISCOUNT, count($positives) * 5);

        if ($critical) {
            $score = max($score, self::CRITICAL_FLOOR);
        }

        $score = max(0, min(100, $score));

        usort($flags, fn ($a, $b) => $this->severityRank($b['severity']) <=> $this->severityRank($a['severity']));

        return [
            'score' => $score,
            'level' => $score >= 60 ? 'high' : ($score >= 30 ? 'medium' : 'low'),
            'flags' => $flags,
            'positives' => $positives,
            'critical' => $critical,
        ];
    }

    /**
     * @return list<array{
     *     title: string, detail: string, tl: array{title: string, detail: string},
     *     weight: int, severity: string, critical?: bool, check: callable(string, string): ?string
     * }>
     */
    private function rules(): array
    {
        return [
            [
                'title' => 'Asks you to pay money to get the job',
                'detail' => 'Real employers do not charge applicants for training, uniforms, equipment, or "processing". Never pay to get hired.',
                'tl' => [
                    'title' => 'Humihingi ng bayad para makuha ang trabaho',
                    'detail' => 'Hindi naniningil ang totoong employer para sa training, uniporme, equipment, o "processing". Huwag magbayad para lang matanggap.',
                ],
                'weight' => 35, 'severity' => 'high', 'critical' => true,
                'check' => fn (string $t) => $this->find($t, [
                    '(registration|application|processing|training|medical|clearance|insurance|activation|onboarding|membership|admin(istrative)?|verification) fee',
                    '(security|refundable|starter) deposit',
                    'starter kit',
                    'pay (a|the|for|your)\b[^.]{0,30}(fee|deposit|kit|training|equipment|laptop|uniform|background check)',
                    '(send|transfer|remit) (us )?(money|payment|\$?\d+)',
                    'upfront (payment|fee|cost)',
                    '(buy|purchase) your own (equipment|laptop|computer|software|kit)',
                    'western union|moneygram',
                    'gcash[^.]{0,40}(fee|payment|send|deposit)',
                    // Taglish
                    'bayad muna|magbayad (muna|ng|para)|kailangan (mag-?)?bayad',
                    'down ?payment|puhunan muna',
                    '(mag-?)?(send|padala|deposit|deposito) (ng|ka ng) (pera|bayad|pambili|puhunan)',
                    'pambili ng (laptop|equipment|kit|uniform)|pang-?(process|registration)',
                ]),
            ],
            [
                'title' => 'Fake-cheque or gift-card pattern',
                'detail' => 'Scammers send a cheque, ask you to deposit it, then ask you to send money back or buy gift cards. The cheque later bounces.',
                'tl' => [
                    'title' => 'Mukhang peke-tseke o gift card na modus',
                    'detail' => 'Nagpapadala sila ng tseke, ipapa-deposit, tapos ipapabalik ang pera o ipabibili ng gift card. Babalik ang tseke dahil peke ito.',
                ],
                'weight' => 35, 'severity' => 'high', 'critical' => true,
                'check' => fn (string $t) => $this->find($t, [
                    '(send|mail|issue) you a (check|cheque)',
                    '(deposit|cash) (the|this|your) (check|cheque)',
                    'mobile deposit',
                    'gift cards?',
                    'reimburse you[^.]{0,40}(equipment|supplies|purchase)',
                    'buy (your )?(equipment|supplies)[^.]{0,40}(vendor|supplier|our)',
                    'padadalhan (ka|kita) ng (tseke|check)',
                ]),
            ],
            [
                'title' => 'Looks like a "do simple tasks to earn" scam',
                'detail' => 'Liking videos, rating products, or boosting orders for commission is a well-known scam that makes you pay more and more to "unlock" earnings.',
                'tl' => [
                    'title' => 'Mukhang modus na "gumawa ng simpleng task para kumita"',
                    'detail' => 'Ang pag-like ng videos, pag-rate ng products, o pag-boost ng orders kapalit ng komisyon ay kilalang scam. Hihingan ka ng bayad para "ma-unlock" ang kita.',
                ],
                'weight' => 35, 'severity' => 'high', 'critical' => true,
                'check' => fn (string $t) => $this->find($t, [
                    'like (and|&) (subscribe|share|follow)',
                    'rate (products|apps|hotels|restaurants|videos)',
                    'boost (ratings?|rankings?|sales|traffic)',
                    'complete (simple|easy|daily|online) tasks',
                    '(simple|easy) tasks?',
                    'click(ing)? (on )?ads?',
                    'order optimi[sz]ation',
                    'commission (for|per) (each |every )?task',
                    'unlock (more |new )?tasks',
                    'watch (videos?|ads?)[^.]{0,30}(earn|paid|money)',
                    'recharge (your )?(account|wallet)',
                    // Taglish
                    '(mag-?|i-?)(like|rate|subscribe)( ng| ang| sa)? (videos?|products?|produkto|youtube|tiktok|page)',
                    'simpleng (task|trabaho|gawain)',
                    'komisyon (sa|kada|bawat) (task|order|like)',
                ]),
            ],
            [
                'title' => 'Involves crypto or "investing" to start',
                'detail' => 'A real job pays you. It does not ask you to invest, trade, or move crypto.',
                'tl' => [
                    'title' => 'May kinalaman sa crypto o "pag-invest" bago magsimula',
                    'detail' => 'Ang totoong trabaho ay nagbabayad sa iyo. Hindi ka nito pinapa-invest, pinapa-trade, o pinapalipat ng crypto.',
                ],
                'weight' => 25, 'severity' => 'high',
                'check' => fn (string $t) => $this->find($t, [
                    'bitcoin|\busdt\b|crypto(currency)? (wallet|trading|exchange)|binance',
                    'forex trading|trading platform',
                    '\binvest(ment)? (required|needed|first|your)',
                    'mag-?invest (muna|ka|ng)',
                ]),
            ],
            [
                'title' => 'Asks for sensitive details too early',
                'detail' => 'Bank logins, card numbers, passwords, OTP codes, or ID photos should never be needed just to apply.',
                'tl' => [
                    'title' => 'Humihingi ng sensitibong detalye agad',
                    'detail' => 'Hindi dapat hingin ang bank login, card number, password, OTP, o litrato ng ID para lang mag-apply.',
                ],
                'weight' => 25, 'severity' => 'high',
                'check' => fn (string $t) => $this->find($t, [
                    '(send|provide|share|submit)[^.]{0,25}(bank account|card number|credit card|debit card|atm card|password|passport|social security)',
                    '(photo|picture|selfie|copy) (of|with) (your )?(id|passport)',
                    '\botp\b|one[- ]time (pin|password)',
                    'your (bank|online banking) (login|password|details)',
                    // Taglish
                    '(ibigay|ipadala|i-?send|ipasa)[^.]{0,25}(bank account|atm|password|pin|otp|card number|id)',
                    '(picture|litrato|selfie) (ng|with) (id|valid id)',
                ]),
            ],
            [
                'title' => 'Contact is only through a chat app',
                'detail' => 'Scam posts push you to Telegram, WhatsApp, Viber, or similar instead of a company email or website.',
                'tl' => [
                    'title' => 'Sa chat app lang ang contact',
                    'detail' => 'Itinutulak ka ng scam sa Telegram, WhatsApp, Viber, o katulad imbes na company email o website.',
                ],
                'weight' => 20, 'severity' => 'medium',
                'check' => fn (string $t) => $this->find($t, [
                    'telegram|\bt\.me/|\bwa\.me/',
                    'whatsapp|viber|wechat|line app|signal app',
                    '(contact|message|add) (us|me|our (hr|recruiter|manager)) (on|via|through) (messenger|facebook)',
                    '(i-?)?(message|chat|add) (mo )?(kami|ako) (sa|via) (telegram|whatsapp|viber|messenger)',
                ]),
            ],
            [
                'title' => 'Pay is far above normal for the work',
                'detail' => 'A very high salary for simple tasks is a common bait.',
                'tl' => [
                    'title' => 'Napakataas ng sahod para sa trabaho',
                    'detail' => 'Ang sobrang taas na sahod para sa simpleng trabaho ay karaniwang pain.',
                ],
                'weight' => 25, 'severity' => 'medium',
                'check' => fn (string $t) => $this->unrealisticPay($t),
            ],
            [
                'title' => 'Recruiter uses a free personal email',
                'detail' => 'Real companies usually email from their own domain, not Gmail, Yahoo, or Outlook.',
                'tl' => [
                    'title' => 'Libreng personal na email ang gamit ng recruiter',
                    'detail' => 'Karaniwang gumagamit ang totoong kumpanya ng sariling domain, hindi Gmail, Yahoo, o Outlook.',
                ],
                'weight' => 15, 'severity' => 'medium',
                'check' => fn (string $t) => $this->onlyFreeEmails($t),
            ],
            [
                'title' => 'Hires without a real interview',
                'detail' => 'Legitimate employers screen candidates. Instant hiring is a warning sign.',
                'tl' => [
                    'title' => 'Tinatanggap agad nang walang tunay na interview',
                    'detail' => 'Sinasala ng totoong employer ang mga aplikante. Delikado ang agarang pagtanggap.',
                ],
                'weight' => 15, 'severity' => 'medium',
                'check' => fn (string $t) => $this->find($t, [
                    '(no|without|skip(ping)?) (the )?interview',
                    'hired (immediately|instantly|on the spot|today)',
                    'instant(ly)? hire',
                    'start (working )?today',
                    'you (are|re) hired',
                    // Taglish
                    'walang interview|hindi na kailangan ng interview',
                    'hired agad|agad (na )?(hired|ma-?hire|tanggap)|diretso (hire|tanggap)',
                ]),
            ],
            [
                'title' => 'Promises easy or guaranteed income',
                'detail' => 'Phrases like "easy money" or "guaranteed income" are typical scam language.',
                'tl' => [
                    'title' => 'Nangangako ng madali o siguradong kita',
                    'detail' => 'Ang mga salitang tulad ng "easy money" o "guaranteed income" ay karaniwang gamit ng scam.',
                ],
                'weight' => 15, 'severity' => 'medium',
                'check' => fn (string $t) => $this->find($t, [
                    'guaranteed (income|earnings|salary|pay)',
                    'easy money|make money fast|quick money',
                    'get paid (daily|everyday|instantly)',
                    'earn (up to )?[^.]{0,15}(daily|every day|per day)',
                    'passive income|financial freedom',
                    'work (only )?\d+ (hours?|hrs?) (a|per) (day|week)[^.]{0,30}earn',
                    // Taglish
                    'kumita (ng|ka)[^.]{0,30}(araw-?araw|daily|kada araw|bawat araw)',
                    '(sahod|sweldo|kita) (na )?(araw-?araw|arawan|agad)',
                    'malaking (kita|sahod|sweldo)',
                    'walang puhunan|easy lang|madaling (kita|pera|trabaho)',
                    'kahit nasa bahay lang',
                ]),
            ],
            [
                'title' => 'Company details are vague',
                'detail' => 'No clear company name, address, or website.',
                'tl' => [
                    'title' => 'Malabo ang detalye ng kumpanya',
                    'detail' => 'Walang malinaw na pangalan ng kumpanya, address, o website.',
                ],
                'weight' => 15, 'severity' => 'medium',
                'check' => fn (string $t) => $this->vagueCompany($t) ? '' : null,
            ],
            [
                'title' => 'Asks you to comment or message instead of apply',
                'detail' => 'Posts that say "comment interested" or "PM me" are usually social-media bait, not real hiring.',
                'tl' => [
                    'title' => 'Pinapa-comment o pinapa-message imbes na mag-apply',
                    'detail' => 'Ang mga post na "comment interested" o "PM me" ay kadalasang pain sa social media, hindi totoong hiring.',
                ],
                'weight' => 12, 'severity' => 'medium',
                'check' => fn (string $t) => $this->find($t, [
                    'comment (interested|"?hire|me|"?yes)',
                    '\b(pm|dm|inbox) me\b',
                    'message me (for|to) (details|apply|know)',
                    'interested\?? ?(comment|pm|dm|inbox)',
                    // Taglish
                    '(mag-?|i-?)?(comment|pm|dm) (ng |mo |na )?(interested|int\b|ako|kami|"?hire)',
                    '(pm|dm|inbox) (mo )?(ako|kami)',
                    'mag-?pm (sa|sa akin|kay)',
                ]),
            ],
            [
                'title' => 'Pressures you to act fast',
                'detail' => 'Urgency such as "limited slots" stops you from checking the company.',
                'tl' => [
                    'title' => 'Pinipilit kang magmadali',
                    'detail' => 'Ginagamit ang pagmamadali, tulad ng "limited slots", para hindi mo na masuri ang kumpanya.',
                ],
                'weight' => 10, 'severity' => 'low',
                'check' => fn (string $t) => $this->find($t, [
                    'urgent(ly)? (hiring|need|needed)',
                    'limited (slots?|vacanc(y|ies)|openings?)',
                    'act (fast|now)|hurry',
                    'slots? (are )?(filling|almost)',
                    'last chance|today only',
                    // Taglish
                    'kailangan agad|madaliang (hiring|hire)',
                    '(limitado|konti|kaunti)( lang| na lang)? (ang )?(slots?|puwesto)',
                    'mag-?apply na (ngayon|agad)',
                ]),
            ],
            [
                'title' => 'Says you were "selected" before applying',
                'detail' => 'Being picked for a job you never applied for is a common scam opener.',
                'tl' => [
                    'title' => 'Sinasabing napili ka na bago ka pa nag-apply',
                    'detail' => 'Ang pagkakapili sa trabahong hindi mo inaplayan ay karaniwang simula ng scam.',
                ],
                'weight' => 10, 'severity' => 'low',
                'check' => fn (string $t) => $this->find($t, [
                    'you (have been|were|are) (selected|chosen|shortlisted)',
                    'congratulations',
                    'napili ka|ikaw ay napili|binabati ka',
                ]),
            ],
            [
                'title' => 'No experience or skills needed',
                'detail' => 'Some entry-level jobs are fine with this, but combined with high pay it is a warning sign.',
                'tl' => [
                    'title' => 'Walang kailangang experience o skills',
                    'detail' => 'Puwede ito sa ilang entry-level na trabaho, pero kapag sinabayan ng mataas na sahod, delikado.',
                ],
                'weight' => 8, 'severity' => 'low',
                'check' => fn (string $t) => $this->find($t, [
                    'no (prior |previous )?experience (needed|required|necessary)',
                    'no (skills?|degree|diploma) (needed|required)',
                    'anyone can (do|apply)',
                    // Taglish
                    'walang (kailangang )?(experience|karanasan|skills?|diploma|degree)',
                    'hindi (na )?kailangan ng (experience|diploma|degree|skills?)',
                    'kahit (sino|walang experience|undergrad|high school)',
                ]),
            ],
            [
                'title' => 'Written in a pushy or sloppy style',
                'detail' => 'Heavy ALL CAPS or lots of exclamation marks is common in scam posts.',
                'tl' => [
                    'title' => 'Sigaw o pabaya ang pagkakasulat',
                    'detail' => 'Karaniwan sa scam ang sobrang ALL CAPS o maraming tandang padamdam.',
                ],
                'weight' => 8, 'severity' => 'low',
                'check' => fn (string $t, string $raw) => $this->shouty($raw),
            ],
            [
                'title' => 'No clear duties or requirements',
                'detail' => 'Real job posts explain what you will do and what they need from you.',
                'tl' => [
                    'title' => 'Walang malinaw na tungkulin o requirements',
                    'detail' => 'Ipinapaliwanag ng totoong job post kung ano ang gagawin mo at ano ang kailangan sa iyo.',
                ],
                'weight' => 10, 'severity' => 'low',
                'check' => fn (string $t) => $this->countMatches($t, [
                    'requirements?', 'qualifications?', 'responsibilit(y|ies)', 'duties', 'skills?',
                    'you will', 'job description', 'experience', 'tungkulin', 'kwalipikasyon',
                ]) < 2 ? '' : null,
            ],
        ];
    }

    /**
     * @return list<array{en: string, tl: string}>
     */
    private function goodSigns(string $t): array
    {
        $signs = [];

        if ($this->hasCompanyEmail($t)) {
            $signs[] = ['en' => 'Lists a company email address', 'tl' => 'May nakalistang company email'];
        }
        if (preg_match('/(technical|initial|panel|video|hr|phone|final) interview|schedule an? interview|interview process/u', $t)) {
            $signs[] = ['en' => 'Mentions a real interview process', 'tl' => 'Binanggit ang totoong proseso ng interview'];
        }
        if (preg_match('/\b(sss|philhealth|pag-?ibig|13th month|hmo|health insurance|paid (time off|leave)|holiday pay)\b/u', $t)) {
            $signs[] = ['en' => 'Mentions standard employee benefits', 'tl' => 'Binanggit ang karaniwang benepisyo ng empleyado'];
        }
        if ($this->countMatches($t, ['requirements?', 'qualifications?', 'responsibilit(y|ies)', 'duties', 'job description']) >= 2) {
            $signs[] = ['en' => 'Describes clear duties and requirements', 'tl' => 'Malinaw ang tungkulin at requirements'];
        }

        return $signs;
    }

    /**
     * Returns the first matching phrase, or null. A match is ignored when it
     * sits right after a negation such as "no", "never", "without", or the
     * Tagalog "walang" / "hindi" / "huwag", so that "we never ask for a
     * registration fee" does not count as a fee request.
     *
     * @param  list<string>  $patterns
     */
    private function find(string $text, array $patterns): ?string
    {
        foreach ($patterns as $pattern) {
            if (! preg_match_all('~'.$pattern.'~iu', $text, $m, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            foreach ($m[0] as [$match, $offset]) {
                $before = mb_strcut($text, max(0, $offset - 30), min(30, $offset));
                if (preg_match('/\b(no|never|not|without|don\'t|do not|won\'t|zero|free of|walang|hindi|huwag|wag|di|libre)\b[^.]{0,25}$/u', $before)) {
                    continue;
                }

                return trim($match);
            }
        }

        return null;
    }

    /** @param list<string> $patterns */
    private function countMatches(string $text, array $patterns): int
    {
        $count = 0;
        foreach ($patterns as $pattern) {
            if (preg_match('/\b'.$pattern.'\b/iu', $text)) {
                $count++;
            }
        }

        return $count;
    }

    private function unrealisticPay(string $text): ?string
    {
        $text = str_replace(',', '', $text);
        $easyJob = (bool) preg_match('/no (prior |previous )?experience|no (skills?|degree|diploma)|anyone can|walang (kailangang )?(experience|karanasan)|kahit (sino|walang experience)/u', $text);

        $pattern = '/(?:(?<usd>\$|usd\s?|us\$)|(?<php>₱|php\s?|\bp))\s?(?<amount>\d{2,7})(?:\.\d+)?\s*(?:\/|per\s|a\s|each\s|kada\s|bawat\s|sa isang\s|isang\s)?\s*(?<unit>hour|hr|day|daily|week|weekly|araw|arawan|oras|linggo|lingguhan)\b/u';
        if (! preg_match_all($pattern, $text, $m, PREG_SET_ORDER)) {
            return null;
        }

        foreach ($m as $hit) {
            $amount = (int) $hit['amount'];
            $isPeso = ($hit['php'] ?? '') !== '';
            $unit = match ($hit['unit']) {
                'hour', 'hr', 'oras' => 'hour',
                'day', 'daily', 'araw', 'arawan' => 'day',
                default => 'week',
            };

            // Lower limits when the post also says no experience is needed.
            $limit = match ($unit) {
                'hour' => $isPeso ? ($easyJob ? 800 : 2500) : ($easyJob ? 25 : 60),
                'day' => $isPeso ? ($easyJob ? 1500 : 5000) : ($easyJob ? 100 : 200),
                default => $isPeso ? ($easyJob ? 10000 : 25000) : ($easyJob ? 700 : 1500),
            };

            if ($amount >= $limit) {
                return trim($hit[0]);
            }
        }

        return null;
    }

    private function onlyFreeEmails(string $text): ?string
    {
        $emails = $this->emails($text);
        if ($emails === []) {
            return null;
        }

        foreach ($emails as $domain) {
            if (! in_array($domain, self::FREE_EMAIL_DOMAINS, true)) {
                return null;
            }
        }

        return '@'.$emails[0];
    }

    private function hasCompanyEmail(string $text): bool
    {
        foreach ($this->emails($text) as $domain) {
            if (! in_array($domain, self::FREE_EMAIL_DOMAINS, true)) {
                return true;
            }
        }

        return false;
    }

    /** @return list<string> */
    private function emails(string $text): array
    {
        preg_match_all('/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/i', $text, $m);

        return array_map('strtolower', $m[1]);
    }

    private function vagueCompany(string $text): bool
    {
        $hasCompany = (bool) preg_match('/\b(inc|corp|corporation|ltd|llc|co\.|company|incorporated|pty|solutions|technologies|group|kumpanya)\b/u', $text);
        $hasWebsite = (bool) preg_match('/https?:\/\/|www\./u', $text);
        $hasAddress = (bool) preg_match('/\b(street|st\.|avenue|ave\.|road|rd\.|blvd|city|makati|taguig|manila|cebu|quezon|pasig|davao)\b/u', $text);

        return ! ($hasCompany || $hasWebsite || $hasAddress || $this->hasCompanyEmail($text));
    }

    private function shouty(string $raw): ?string
    {
        $letters = preg_match_all('/\p{L}/u', $raw);
        if ($letters < 150) {
            return null;
        }

        $upper = preg_match_all('/\p{Lu}/u', $raw);
        $bangs = substr_count($raw, '!');

        if ($upper / $letters > 0.4) {
            return 'ALL CAPS';
        }
        if ($bangs >= 5) {
            return $bangs.' × !';
        }

        return null;
    }

    private function severityRank(string $severity): int
    {
        return match ($severity) {
            'high' => 3,
            'medium' => 2,
            default => 1,
        };
    }
}
