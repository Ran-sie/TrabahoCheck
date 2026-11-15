<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $over = [])
    {
        return $this->postJson('/api/register', array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => 'secret-pass-1',
        ], $over));
    }

    public function test_a_user_can_register_and_gets_a_token(): void
    {
        $this->register()
            ->assertCreated()
            ->assertJsonPath('user.email', 'juan@example.com')
            ->assertJsonStructure(['token', 'user' => ['name', 'email', 'phone', 'location']])
            ->assertJsonMissingPath('user.password');

        $this->assertDatabaseHas('users', ['email' => 'juan@example.com']);
        $this->assertNotSame('secret-pass-1', User::first()->password);
    }

    public function test_register_rejects_a_taken_email_and_a_short_password(): void
    {
        $this->register()->assertCreated();

        $this->register()->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->register(['email' => 'new@example.com', 'password' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_login_works_and_a_wrong_password_is_refused(): void
    {
        $this->register()->assertCreated();

        $this->postJson('/api/login', ['email' => 'juan@example.com', 'password' => 'secret-pass-1'])
            ->assertOk()->assertJsonStructure(['token']);

        $this->postJson('/api/login', ['email' => 'juan@example.com', 'password' => 'nope-nope'])
            ->assertUnprocessable()->assertJsonPath('message', 'Wrong email or password.');

        // An unknown email gets the same message, so emails cannot be guessed.
        $this->postJson('/api/login', ['email' => 'ghost@example.com', 'password' => 'nope-nope'])
            ->assertUnprocessable()->assertJsonPath('message', 'Wrong email or password.');
    }

    public function test_profile_needs_a_login(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->putJson('/api/me', ['name' => 'X', 'email' => 'x@example.com'])->assertUnauthorized();
    }

    public function test_a_user_can_read_and_edit_their_profile(): void
    {
        $token = $this->register()->json('token');
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->getJson('/api/me', $auth)->assertOk()->assertJsonPath('user.name', 'Juan Dela Cruz');

        $this->putJson('/api/me', [
            'name' => 'Juan D. Cruz',
            'email' => 'juan@example.com',
            'phone' => '0917 123 4567',
            'location' => 'Quezon City',
        ], $auth)->assertOk()->assertJsonPath('user.location', 'Quezon City');

        $this->assertDatabaseHas('users', ['name' => 'Juan D. Cruz', 'phone' => '0917 123 4567']);
    }

    public function test_a_user_cannot_take_another_users_email(): void
    {
        $this->register(['email' => 'other@example.com'])->assertCreated();
        $token = $this->register()->json('token');

        $this->putJson('/api/me', ['name' => 'Juan', 'email' => 'other@example.com'], ['Authorization' => "Bearer {$token}"])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_logout_ends_the_token(): void
    {
        $token = $this->register()->json('token');
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->postJson('/api/logout', [], $auth)->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
