<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> */
    private function auth(): array
    {
        $token = $this->postJson('/api/register', [
            'name' => 'Juan', 'email' => 'juan@example.com', 'password' => 'secret-pass-1',
        ])->json('token');

        return ['Authorization' => "Bearer {$token}"];
    }

    /** @return array<string, mixed> */
    private function base(array $over = []): array
    {
        return array_merge(['name' => 'Juan', 'email' => 'juan@example.com'], $over);
    }

    public function test_a_new_profile_starts_with_empty_lists(): void
    {
        $this->getJson('/api/me', $this->auth())
            ->assertOk()
            ->assertJsonPath('user.skills', [])
            ->assertJsonPath('user.experience', [])
            ->assertJsonPath('user.headline', null);
    }

    public function test_a_user_can_save_a_full_resume_style_profile(): void
    {
        $auth = $this->auth();

        $this->putJson('/api/me', $this->base([
            'headline' => 'Web Developer',
            'summary' => 'I build websites.',
            'website' => 'linkedin.com/in/juan',
            'skills' => ['PHP', 'React', ' php ', '', 'Laravel'],
            'languages' => ['Filipino', 'English'],
            'certifications' => ['AWS Cloud Practitioner'],
            'experience' => [['title' => 'Intern', 'company' => 'Acme', 'start' => 'Jun 2024', 'end' => 'Present', 'description' => 'Fixed bugs.']],
            'education' => [['school' => 'Cebu Tech', 'degree' => 'BS IT', 'start' => '2021', 'end' => '2025']],
        ]), $auth)
            ->assertOk()
            ->assertJsonPath('user.headline', 'Web Developer')
            ->assertJsonPath('user.website', 'https://linkedin.com/in/juan')
            // Blank items are dropped and repeats (in any capitalisation) are kept once.
            ->assertJsonPath('user.skills', ['PHP', 'React', 'Laravel'])
            ->assertJsonPath('user.experience.0.company', 'Acme')
            ->assertJsonPath('user.education.0.school', 'Cebu Tech');

        $this->getJson('/api/me', $auth)->assertJsonPath('user.skills', ['PHP', 'React', 'Laravel']);
    }

    public function test_profile_lists_are_limited_and_checked(): void
    {
        $auth = $this->auth();

        $this->putJson('/api/me', $this->base(['skills' => array_map(fn ($i) => "skill{$i}", range(1, 31))]), $auth)
            ->assertUnprocessable()->assertJsonValidationErrors('skills');
        $this->putJson('/api/me', $this->base(['website' => 'not a web address']), $auth)
            ->assertUnprocessable()->assertJsonValidationErrors('website');
        $this->putJson('/api/me', $this->base(['experience' => [['company' => 'No title here']]]), $auth)
            ->assertUnprocessable()->assertJsonValidationErrors('experience.0.title');
        $this->putJson('/api/me', $this->base(['summary' => str_repeat('a', 1501)]), $auth)
            ->assertUnprocessable()->assertJsonValidationErrors('summary');
    }

    public function test_saving_empty_lists_clears_them(): void
    {
        $auth = $this->auth();

        $this->putJson('/api/me', $this->base(['skills' => ['PHP']]), $auth)->assertJsonPath('user.skills', ['PHP']);
        $this->putJson('/api/me', $this->base(['skills' => []]), $auth)->assertJsonPath('user.skills', []);
    }
}
