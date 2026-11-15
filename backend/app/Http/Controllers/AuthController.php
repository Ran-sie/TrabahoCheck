<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\ProfileData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8), 'max:200'],
        ]);

        $user = User::create($data);

        return $this->session($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // One message for both cases, so the form cannot be used to find which emails exist.
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Wrong email or password.'], 422);
        }

        return $this->session($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => self::present($request->user())]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->merge(['website' => ProfileData::withScheme($request->input('website'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'location' => ['nullable', 'string', 'max:120'],
            ...ProfileData::rules(),
        ]);

        $user->update(array_merge($data, ProfileData::tidy($data)));

        return response()->json(['user' => self::present($user->refresh())]);
    }

    private function session(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => self::present($user),
        ], $status);
    }

    /** @return array<string, mixed> */
    public static function present(User $user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'location' => $user->location,
            'headline' => $user->headline,
            'summary' => $user->summary,
            'website' => $user->website,
            'skills' => $user->skills ?? [],
            'experience' => $user->experience ?? [],
            'education' => $user->education ?? [],
            'certifications' => $user->certifications ?? [],
            'languages' => $user->languages ?? [],
            'resume' => $user->resume_path ? [
                'name' => $user->resume_name,
                'size' => $user->resume_size,
                'uploaded_at' => $user->resume_uploaded_at?->toIso8601String(),
            ] : null,
        ];
    }
}
