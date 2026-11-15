<?php

namespace App\Http\Controllers;

use App\Services\ResumeParser;
use App\Services\ResumeReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** A user's resume file. It is private: only its owner can download it. */
class ResumeController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            // The 2 MB cap matches PHP's default upload limit.
            'resume' => ['required', 'file', 'mimes:pdf,docx', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $request->file('resume');

        // Stored under a random name, so the original name can never reach the file system.
        $path = $file->storeAs('resumes', Str::uuid().'.'.$file->extension());

        $this->discard($user->resume_path);

        $user->forceFill([
            'resume_path' => $path,
            'resume_name' => Str::limit(preg_replace('/[^\p{L}\p{N} ._()-]/u', '', $file->getClientOriginalName()) ?: 'resume', 150, ''),
            'resume_size' => $file->getSize(),
            'resume_uploaded_at' => now(),
        ])->save();

        return response()->json(['user' => AuthController::present($user->refresh())], 201);
    }

    public function show(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $user->resume_path || ! Storage::exists($user->resume_path)) {
            return response()->json(['message' => 'No resume uploaded.'], 404);
        }

        return Storage::download($user->resume_path, $user->resume_name);
    }

    /** Reads the saved resume and suggests basic details. Nothing is saved: the user reviews first. */
    public function autofill(Request $request, ResumeReader $reader, ResumeParser $parser): JsonResponse
    {
        $user = $request->user();

        if (! $user->resume_path) {
            return response()->json(['message' => 'No resume uploaded.'], 404);
        }

        $text = $reader->text($user->resume_path);

        // A scanned resume (a photo inside a PDF) has no text to read.
        if ($text === null) {
            return response()->json(['message' => 'unreadable'], 422);
        }

        $result = $parser->parse($text);

        return response()->json($result);
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->discard($user->resume_path);
        $user->forceFill([
            'resume_path' => null,
            'resume_name' => null,
            'resume_size' => null,
            'resume_uploaded_at' => null,
        ])->save();

        return response()->json(['user' => AuthController::present($user->refresh())]);
    }

    private function discard(?string $path): void
    {
        if ($path) {
            Storage::delete($path);
        }
    }
}
