<?php

namespace App\Http\Controllers;

use App\Services\ResumeReviewer;
use App\Support\ProfileText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** AI feedback on the logged-in user's saved profile, treated as their resume. */
class ResumeReviewController extends Controller
{
    public function __invoke(Request $request, ResumeReviewer $reviewer): JsonResponse
    {
        $user = $request->user();

        if (! ProfileText::hasContent($user)) {
            return response()->json(['message' => 'Add your details to your profile first.', 'code' => 'empty_profile'], 422);
        }

        $review = $reviewer->review($user);
        if ($review === null) {
            return response()->json(['message' => 'The resume review is not available right now.', 'code' => 'unavailable'], 503);
        }

        return response()->json($review);
    }
}
