<?php

namespace App\Http\Controllers;

use App\Services\JobFitReviewer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * How well does the logged-in user's profile fit the job they just checked?
 * It reads the job post from the same short-lived cache entry as the AI review,
 * so the browser does not send the post again.
 */
class JobFitController extends Controller
{
    public function __invoke(Request $request, JobFitReviewer $reviewer): JsonResponse
    {
        $data = $request->validate(['id' => ['required', 'string', 'size:32', 'alpha_num']]);

        $saved = Cache::get('review:'.$data['id']);
        if (! is_array($saved)) {
            return response()->json(['message' => 'This check has expired.', 'code' => 'expired'], 404);
        }

        $user = $request->user();
        if (! $reviewer->hasProfile($user)) {
            return response()->json(['message' => 'Add your details to your profile first.', 'code' => 'empty_profile'], 422);
        }

        $fit = $reviewer->fit($saved['text'], $user);
        if ($fit === null) {
            return response()->json(['message' => 'The job fit is not available right now.', 'code' => 'unavailable'], 503);
        }

        return response()->json($fit);
    }
}
