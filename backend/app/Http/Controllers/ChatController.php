<?php

namespace App\Http\Controllers;

use App\Services\ChatAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * The chat window. The browser sends the chat so far (nothing is stored) and,
 * if the user just checked a job, that check's id so the AI knows which job it is.
 */
class ChatController extends Controller
{
    public function __invoke(Request $request, ChatAssistant $assistant): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:'.ChatAssistant::MAX_TURNS],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:'.ChatAssistant::MAX_MESSAGE_CHARS],
            'review_id' => ['nullable', 'string', 'size:32', 'alpha_num'],
            'lang' => ['nullable', 'string', 'in:en,tl'],
        ]);

        if (end($data['messages'])['role'] !== 'user') {
            return response()->json(['message' => 'The last message must be from you.'], 422);
        }

        // An expired check is fine: the chat simply goes on without the job.
        $check = null;
        if (filled($data['review_id'] ?? null)) {
            $saved = Cache::get('review:'.$data['review_id']);
            if (is_array($saved)) {
                $check = ['text' => (string) $saved['text'], 'score' => (int) $saved['score'], 'flags' => (array) $saved['flags']];
            }
        }

        $reply = $assistant->reply($data['messages'], $request->user(), $check, $data['lang'] ?? 'en');
        if ($reply === null) {
            return response()->json(['message' => 'The chat is not available right now.', 'code' => 'unavailable'], 503);
        }

        return response()->json(['reply' => $reply, 'job' => $check !== null]);
    }
}
