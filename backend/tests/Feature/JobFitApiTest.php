<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobFitApiTest extends TestCase
{
    use RefreshDatabase;

    private const ID = 'abcdefghijklmnopqrstuvwxyz012345';

    private function aiOn(): void
    {
        config(['services.ai.key' => 'test', 'services.ai.base_url' => 'https://ai.test/v1', 'services.ai.model' => 'm']);
    }

    private function login(array $profile = ['skills' => ['Excel', 'Customer service']]): array
    {
        $token = $this->postJson('/api/register', [
            'name' => 'Juan', 'email' => 'juan@example.com', 'password' => 'secret-pass-1',
        ])->json('token');

        if ($profile !== []) {
            User::first()->update($profile);
        }

        return ['Authorization' => "Bearer {$token}"];
    }

    private function savedCheck(): void
    {
        Cache::put('review:'.self::ID, [
            'text' => 'Hiring a customer support agent. Requires Excel and good English. Salary 20000 per month.',
            'score' => 5,
            'critical' => false,
            'flags' => [],
        ], now()->addMinutes(10));
    }

    private function fakeAi(array $body): void
    {
        Http::fake(['ai.test/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode($body)]]],
        ])]);
    }

    public function test_it_requires_login(): void
    {
        $this->postJson('/api/job-fit', ['id' => self::ID])->assertUnauthorized();
    }

    public function test_it_scores_the_profile_against_the_saved_job(): void
    {
        $this->aiOn();
        $this->savedCheck();
        $this->fakeAi([
            'score' => 72,
            'summary_en' => 'Good fit.',
            'summary_tl' => 'Bagay ka.',
            'matched' => ['Excel'],
            'missing' => ['Zendesk'],
            'tips' => [['en' => 'Add a support project.', 'tl' => 'Magdagdag ng support project.']],
        ]);

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login())
            ->assertOk()
            ->assertJsonPath('score', 72)
            ->assertJsonPath('level', 'strong')
            ->assertJsonPath('matched.0', 'Excel')
            ->assertJsonPath('missing.0', 'Zendesk')
            ->assertJsonPath('tips.0.en', 'Add a support project.');

        // The profile and the job post both reach the model.
        Http::assertSent(fn ($request) => str_contains($request['messages'][1]['content'], 'Customer service')
            && str_contains($request['messages'][1]['content'], 'customer support agent'));
    }

    public function test_an_empty_profile_is_asked_to_add_details_first(): void
    {
        $this->aiOn();
        $this->savedCheck();
        Http::fake();

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login([]))
            ->assertStatus(422)
            ->assertJsonPath('code', 'empty_profile');

        Http::assertNothingSent();
    }

    public function test_an_expired_check_returns_404(): void
    {
        $this->aiOn();

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login())
            ->assertNotFound()
            ->assertJsonPath('code', 'expired');
    }

    public function test_it_returns_503_when_the_ai_is_off_or_fails(): void
    {
        $this->savedCheck();
        config(['services.ai.key' => null]);

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login())
            ->assertStatus(503)
            ->assertJsonPath('code', 'unavailable');
    }

    public function test_an_unusable_ai_reply_is_a_503_not_a_crash(): void
    {
        $this->aiOn();
        $this->savedCheck();
        Http::fake(['ai.test/*' => Http::response(['choices' => [['message' => ['content' => 'not json']]]])]);

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login())->assertStatus(503);
    }

    public function test_the_reply_is_cleaned_and_limited(): void
    {
        $this->aiOn();
        $this->savedCheck();
        $this->fakeAi([
            'score' => 250,
            'summary_en' => '<b>Great</b> match',
            'matched' => ['Excel', 'excel', '<i>SQL</i>', 5, str_repeat('x', 100)],
            'missing' => [],
            'tips' => [['en' => 'a'], ['en' => 'b'], ['en' => 'c'], ['en' => 'd']],
        ]);

        $this->postJson('/api/job-fit', ['id' => self::ID], $this->login())
            ->assertOk()
            ->assertJsonPath('score', 100)
            ->assertJsonPath('summary.en', 'Great match')
            ->assertJsonPath('summary.tl', 'Great match')
            ->assertJsonCount(3, 'matched')
            ->assertJsonCount(3, 'tips');
    }
}
