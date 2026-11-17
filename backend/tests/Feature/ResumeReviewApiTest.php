<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResumeReviewApiTest extends TestCase
{
    use RefreshDatabase;

    private function aiOn(): void
    {
        config(['services.ai.key' => 'test', 'services.ai.base_url' => 'https://ai.test/v1', 'services.ai.model' => 'm']);
    }

    private function login(array $profile = ['headline' => 'Virtual assistant', 'skills' => ['Excel', 'Email support']]): array
    {
        $token = $this->postJson('/api/register', [
            'name' => 'Juan', 'email' => 'juan@example.com', 'password' => 'secret-pass-1',
        ])->json('token');

        if ($profile !== []) {
            User::first()->update($profile);
        }

        return ['Authorization' => "Bearer {$token}"];
    }

    private function fakeAi(array $body): void
    {
        Http::fake(['ai.test/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode($body)]]],
        ])]);
    }

    public function test_it_requires_login(): void
    {
        $this->postJson('/api/me/resume/review')->assertUnauthorized();
    }

    public function test_it_reviews_the_saved_profile(): void
    {
        $this->aiOn();
        $this->fakeAi([
            'score' => 55,
            'summary_en' => 'A decent start.',
            'summary_tl' => 'Magandang simula.',
            'strengths' => [['en' => 'Clear skills list', 'tl' => 'Malinaw ang skills']],
            'improvements' => [['en' => 'Add numbers to your results.', 'tl' => 'Magdagdag ng numero.']],
            'headline' => 'Virtual Assistant | Excel and Email Support',
            'about' => 'I support busy teams with fast, accurate admin work.',
        ]);

        $this->postJson('/api/me/resume/review', [], $this->login())
            ->assertOk()
            ->assertJsonPath('score', 55)
            ->assertJsonPath('level', 'okay')
            ->assertJsonPath('strengths.0.en', 'Clear skills list')
            ->assertJsonPath('improvements.0.tl', 'Magdagdag ng numero.')
            ->assertJsonPath('headline', 'Virtual Assistant | Excel and Email Support');

        Http::assertSent(fn ($request) => str_contains($request['messages'][1]['content'], 'Email support'));
    }

    public function test_an_empty_profile_is_asked_to_add_details_first(): void
    {
        $this->aiOn();
        Http::fake();

        $this->postJson('/api/me/resume/review', [], $this->login([]))
            ->assertStatus(422)
            ->assertJsonPath('code', 'empty_profile');

        Http::assertNothingSent();
    }

    public function test_it_returns_503_when_the_ai_is_off(): void
    {
        config(['services.ai.key' => null]);

        $this->postJson('/api/me/resume/review', [], $this->login())
            ->assertStatus(503)
            ->assertJsonPath('code', 'unavailable');
    }

    public function test_an_unusable_ai_reply_is_a_503_not_a_crash(): void
    {
        $this->aiOn();
        Http::fake(['ai.test/*' => Http::response(['choices' => [['message' => ['content' => 'sorry, no json']]]])]);

        $this->postJson('/api/me/resume/review', [], $this->login())->assertStatus(503);
    }

    public function test_the_reply_is_cleaned_and_limited(): void
    {
        $this->aiOn();
        $this->fakeAi([
            'score' => -20,
            'summary_en' => '<b>Needs work</b>',
            'strengths' => [],
            'improvements' => array_fill(0, 8, ['en' => 'Fix it']),
            'headline' => str_repeat('h', 300),
            'about' => '<script>x</script>Hello there',
        ]);

        $response = $this->postJson('/api/me/resume/review', [], $this->login())
            ->assertOk()
            ->assertJsonPath('score', 0)
            ->assertJsonPath('level', 'weak')
            ->assertJsonPath('summary.en', 'Needs work')
            ->assertJsonCount(5, 'improvements')
            ->assertJsonPath('about', 'xHello there');

        $this->assertSame(120, mb_strlen($response->json('headline')));
    }
}
