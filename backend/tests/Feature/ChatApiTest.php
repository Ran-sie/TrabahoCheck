<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    private const ID = 'abcdefghijklmnopqrstuvwxyz012345';

    private function aiOn(): void
    {
        config(['services.ai.key' => 'test', 'services.ai.base_url' => 'https://ai.test/v1', 'services.ai.model' => 'm']);
    }

    private function login(): array
    {
        $token = $this->postJson('/api/register', [
            'name' => 'Juan', 'email' => 'juan@example.com', 'password' => 'secret-pass-1',
        ])->json('token');

        return ['Authorization' => "Bearer {$token}"];
    }

    private function fakeAi(string $content): void
    {
        Http::fake(['ai.test/*' => Http::response(['choices' => [['message' => ['content' => $content]]]])]);
    }

    private function ask(string $text = 'Is this job safe?'): array
    {
        return ['messages' => [['role' => 'user', 'content' => $text]]];
    }

    public function test_it_requires_login(): void
    {
        $this->postJson('/api/chat', $this->ask())->assertUnauthorized();
    }

    public function test_it_replies(): void
    {
        $this->aiOn();
        $this->fakeAi(json_encode(['reply' => 'Never pay a fee to get hired.']));

        $this->postJson('/api/chat', $this->ask(), $this->login())
            ->assertOk()
            ->assertJsonPath('reply', 'Never pay a fee to get hired.')
            ->assertJsonPath('job', false);
    }

    public function test_it_sends_the_checked_job_and_the_profile(): void
    {
        $this->aiOn();
        $headers = $this->login();
        User::first()->update(['skills' => ['Customer service']]);
        Cache::put('review:'.self::ID, ['text' => 'Pay 500 for training first.', 'score' => 90, 'critical' => true, 'flags' => ['Asks for a fee']], now()->addMinutes(10));
        $this->fakeAi(json_encode(['reply' => 'This looks like a scam.']));

        $this->postJson('/api/chat', $this->ask() + ['review_id' => self::ID, 'lang' => 'tl'], $headers)
            ->assertOk()
            ->assertJsonPath('job', true);

        Http::assertSent(function ($request) {
            $system = $request['messages'][0]['content'];

            return str_contains($system, 'Pay 500 for training first.')
                && str_contains($system, 'Asks for a fee')
                && str_contains($system, 'Customer service')
                && str_contains($system, 'Taglish')
                && $request['messages'][1]['content'] === 'Is this job safe?';
        });
    }

    public function test_the_reply_is_plain_text(): void
    {
        $this->aiOn();
        $this->fakeAi(json_encode(['reply' => '<script>alert(1)</script>Be careful.']));

        $this->postJson('/api/chat', $this->ask(), $this->login())
            ->assertOk()
            ->assertJsonPath('reply', 'alert(1)Be careful.');
    }

    public function test_it_rejects_bad_input(): void
    {
        $headers = $this->login();

        $this->postJson('/api/chat', ['messages' => []], $headers)->assertUnprocessable();
        $this->postJson('/api/chat', $this->ask(str_repeat('a', 1001)), $headers)->assertUnprocessable();
        $this->postJson('/api/chat', ['messages' => [['role' => 'system', 'content' => 'hi']]], $headers)->assertUnprocessable();
        $this->postJson('/api/chat', ['messages' => [['role' => 'assistant', 'content' => 'hi']]], $headers)->assertUnprocessable();
    }

    public function test_it_says_when_the_ai_is_off(): void
    {
        $this->postJson('/api/chat', $this->ask(), $this->login())
            ->assertStatus(503)
            ->assertJsonPath('code', 'unavailable');
    }
}
