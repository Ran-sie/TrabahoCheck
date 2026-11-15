<?php

namespace App\Http\Controllers;

use App\Services\AiReviewer;
use App\Services\CompanyChecker;
use App\Services\JobFetcher;
use App\Services\ScamAnalyzer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use RuntimeException;

class CheckController extends Controller
{
    /** Reason codes thrown by JobFetcher, in English and Tagalog. */
    private const REASONS = [
        'unreachable' => ['We could not open that link.', 'Hindi namin mabuksan ang link na iyon.'],
        'blocked' => ['That site did not let us read the post.', 'Hindi kami pinayagan ng site na basahin ang post.'],
        'redirects' => ['That link redirected too many times.', 'Masyadong maraming beses na-redirect ang link na iyon.'],
        'invalid_url' => ['Please enter a valid http or https link.', 'Maglagay ng tamang http o https na link.'],
        'not_found' => ['We could not find that website.', 'Hindi namin mahanap ang website na iyon.'],
        'not_allowed' => ['That link is not allowed.', 'Hindi pinapayagan ang link na iyon.'],
        'too_short' => ['We could not read enough of the post to check it.', 'Kulang ang nabasa namin sa post para masuri ito.'],
        'not_job' => ['This does not look like a job post.', 'Hindi mukhang job post ito.'],
    ];

    /** Words a job post (honest or scam) almost always uses. Fewer than two means it is probably not a job post. */
    private const JOB_WORDS = [
        'job', 'jobs', 'hiring', 'hire', 'hired', 'vacancy', 'vacancies', 'position', 'apply', 'application',
        'salary', 'wage', 'pay', 'paid', 'earn', 'earnings', 'income', 'commission', 'employer', 'employee',
        'employment', 'recruit', 'recruiter', 'resume', 'cv', 'interview', 'work', 'working', 'worker', 'role',
        'career', 'careers', 'duties', 'responsibilities', 'requirements', 'qualifications', 'experience',
        'full-time', 'part-time', 'shift', 'benefits', 'freelance', 'remote', 'task', 'tasks', 'money', 'fee',
        'telegram', 'whatsapp', 'messenger', 'daily', 'slots', 'opportunity', 'online', 'home',
        'trabaho', 'sahod', 'aplikante', 'magtrabaho', 'kumita', 'kita', 'empleyado',
    ];

    public function __invoke(
        Request $request,
        JobFetcher $fetcher,
        ScamAnalyzer $analyzer,
        CompanyChecker $company,
        AiReviewer $ai,
    ): JsonResponse {
        $data = $request->validate([
            'url' => ['nullable', 'url', 'max:2048', 'required_without:text'],
            'text' => ['nullable', 'string', 'max:30000', 'required_without:url'],
            'lang' => ['nullable', 'in:en,tl'],
        ]);

        $lang = ($data['lang'] ?? 'en') === 'tl' ? 1 : 0;
        $text = trim($data['text'] ?? '');

        if ($text === '') {
            try {
                $text = $fetcher->fetchText($data['url']);
            } catch (RuntimeException $e) {
                return $this->unreadable($e->getMessage(), $lang);
            }
        }

        if (mb_strlen($text) < 80) {
            return $this->unreadable('too_short', $lang);
        }

        if (! $this->looksLikeJobPost($text)) {
            return $this->unreadable('not_job', $lang);
        }

        $companyInfo = $company->check($text);
        $result = $analyzer->analyze($text, $companyInfo['flags'], $companyInfo['positives']);
        $result['company'] = $companyInfo['domains'];
        $result['review_id'] = $ai->available() ? $this->rememberForReview($text, $result) : null;

        return response()->json($result);
    }

    /**
     * Keeps the post for ten minutes so the AI step can read it without the
     * browser sending it again. Nothing is written to the database.
     *
     * @param  array<string, mixed>  $result
     */
    private function rememberForReview(string $text, array $result): string
    {
        $id = Str::random(32);

        Cache::put('review:'.$id, [
            'text' => $text,
            'score' => $result['score'],
            'critical' => $result['critical'],
            'flags' => array_column($result['flags'], 'title'),
        ], now()->addMinutes(10));

        return $id;
    }

    /** A search page, a login page or random text has almost none of these words. */
    private function looksLikeJobPost(string $text): bool
    {
        $pattern = '~(?<![\p{L}\p{N}])('.implode('|', array_map(fn ($w) => preg_quote($w, '~'), self::JOB_WORDS)).')(?![\p{L}\p{N}])~iu';

        preg_match_all($pattern, $text, $found);

        return count(array_unique(array_map('mb_strtolower', $found[1]))) >= 2;
    }

    private function unreadable(string $code, int $lang): JsonResponse
    {
        $reason = self::REASONS[$code][$lang] ?? self::REASONS['unreachable'][$lang];

        if ($code === 'not_job') {
            $hint = $lang === 1
                ? 'Buksan ang mismong job post, tapos i-paste ang link o ang text nito.'
                : 'Open the job post itself, then paste its link or its text.';
        } else {
            $hint = $lang === 1
                ? 'Subukang i-paste na lang ang text ng trabaho.'
                : 'Try pasting the job text instead.';
        }

        return response()->json([
            'message' => $reason.' '.$hint,
            'needs_text' => true,
        ], 422);
    }
}
