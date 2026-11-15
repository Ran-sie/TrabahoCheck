<?php

namespace App\Http\Controllers;

use App\Services\AiReviewer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Second step of a check: the page first shows the instant rule-based result,
 * then asks for the slower AI opinion using the id from that result.
 */
class AiReviewController extends Controller
{
    public function __invoke(Request $request, AiReviewer $reviewer): JsonResponse
    {
        $data = $request->validate(['id' => ['required', 'string', 'size:32', 'alpha_num']]);

        $saved = Cache::get('review:'.$data['id']);
        if (! is_array($saved)) {
            return response()->json(['message' => 'This check has expired.'], 404);
        }

        $review = $reviewer->review($saved['text'], $saved['score'], $saved['flags']);
        if ($review === null) {
            return response()->json(['message' => 'The AI opinion is not available right now.'], 503);
        }

        $review['final'] = AiReviewer::headline($review['risk'], (bool) ($saved['critical'] ?? false));

        return response()->json($review);
    }
}
