<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\TwoFactorAuthenticationService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private TwoFactorAuthenticationService $twoFactorService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->twoFactorService = app(TwoFactorAuthenticationService::class);
    }

    /**
     * Test admin login screen renders successfully.
     */
    public function test_admin_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/admin/login');
        $response->assertStatus(200);
    }

    /**
     * Test valid admin can login successfully without 2FA.
     */
    public function test_admin_can_login_with_valid_credentials(): void
    {
        $response = $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticated();
    }

    /**
     * Test admin cannot login with incorrect password.
     */
    public function test_admin_cannot_login_with_invalid_password(): void
    {
        $response = $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    /**
     * Test deactivated admin cannot login.
     */
    public function test_deactivated_admin_cannot_login(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $admin->update(['status' => \App\Enums\User\UserStatus::Inactive]);

        $response = $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    /**
     * Test standard non-admin member cannot login to admin panel.
     */
    public function test_non_admin_cannot_login_to_admin_panel(): void
    {
        $member = User::factory()->create([
            'email' => 'member@example.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->post('/admin/login', [
            'email' => 'member@example.com',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    /**
     * Test admin logout destroys session and redirects to login.
     */
    public function test_admin_can_logout(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        $response = $this->actingAs($admin)->post('/admin/logout');

        $response->assertRedirect(route('admin.login'));
        $this->assertGuest();
    }

    /**
     * Test admin with 2FA enabled is redirected to two-factor challenge screen.
     */
    public function test_admin_with_2fa_redirects_to_challenge_page(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $secret = $this->twoFactorService->generateSecretKey();
        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes();

        $admin->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $response->assertRedirect(route('admin.two-factor.challenge'));
        $this->assertGuest();
        $this->assertTrue(session()->has('login.id'));
    }

    /**
     * Test admin can verify 2FA challenge with valid TOTP code.
     */
    public function test_admin_can_verify_2fa_with_valid_totp_code(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $secret = $this->twoFactorService->generateSecretKey();
        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes();

        $admin->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
            'two_factor_confirmed_at' => now(),
        ]);

        $validCode = $this->twoFactorService->calculateTotp($secret);

        $response = $this->withSession(['login.id' => $admin->id])
            ->post('/admin/two-factor-challenge', [
                'code' => $validCode,
            ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin);
        $this->assertTrue(session('auth.two_factor_verified'));
    }

    /**
     * Test admin cannot verify 2FA challenge with invalid TOTP code.
     */
    public function test_admin_cannot_verify_2fa_with_invalid_totp_code(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $secret = $this->twoFactorService->generateSecretKey();
        $admin->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->withSession(['login.id' => $admin->id])
            ->post('/admin/two-factor-challenge', [
                'code' => '999999',
            ]);

        $response->assertSessionHasErrors('code');
        $this->assertGuest();
    }

    /**
     * Test admin can verify 2FA with emergency recovery code, and the code is consumed.
     */
    public function test_admin_can_verify_2fa_with_recovery_code_and_consumes_it(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $secret = $this->twoFactorService->generateSecretKey();
        $recoveryCodes = ['ABCDE-12345', 'FGHIJ-67890'];

        $admin->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->withSession(['login.id' => $admin->id])
            ->post('/admin/two-factor-challenge', [
                'recovery_code' => 'ABCDE-12345',
            ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin);

        // Assert code was consumed
        $admin->refresh();
        $remainingCodes = $this->twoFactorService->getRecoveryCodesForUser($admin);
        $this->assertCount(1, $remainingCodes);
        $this->assertNotContains('ABCDE-12345', $remainingCodes);
        $this->assertContains('FGHIJ-67890', $remainingCodes);
    }

    /**
     * Test admin can setup and enable 2FA from settings.
     */
    public function test_admin_can_setup_and_enable_2fa(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        // 1. Setup endpoint
        $setupResponse = $this->actingAs($admin)->postJson('/admin/two-factor/setup');
        $setupResponse->assertStatus(200);
        $secret = $setupResponse->json('secret');
        $this->assertNotEmpty($secret);
        $this->assertNotEmpty($setupResponse->json('qr_code_svg'));

        // 2. Enable endpoint with valid TOTP code
        $code = $this->twoFactorService->calculateTotp($secret);
        $enableResponse = $this->actingAs($admin)
            ->withSession(['two_factor.pending_secret' => $secret])
            ->post('/admin/two-factor/enable', [
                'code' => $code,
            ]);

        $enableResponse->assertRedirect();
        $admin->refresh();

        $this->assertTrue($admin->hasTwoFactorEnabled());
        $this->assertNotEmpty($this->twoFactorService->getRecoveryCodesForUser($admin));
    }

    /**
     * Test admin can disable 2FA with valid password.
     */
    public function test_admin_can_disable_2fa_with_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $secret = $this->twoFactorService->generateSecretKey();
        $admin->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(['TEST-12345']),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['auth.two_factor_verified' => true])
            ->post('/admin/two-factor/disable', [
                'password' => 'password',
            ]);

        $response->assertRedirect();
        $admin->refresh();

        $this->assertFalse($admin->hasTwoFactorEnabled());
        $this->assertNull($admin->two_factor_secret);
        $this->assertNull($admin->two_factor_confirmed_at);
    }

    /**
     * Test RBAC: user without permission cannot perform restricted actions.
     */
    public function test_user_without_permission_is_forbidden(): void
    {
        // Create an editor with only 'dashboard.view' and 'users.view'
        $editor = User::factory()->create([
            'password' => Hash::make('password'),
        ]);
        $editorRole = Role::where('name', 'Editor')->first();
        $editor->assignRole($editorRole);

        // Editor can access dashboard and view users
        $this->actingAs($editor)->get('/admin')->assertStatus(200);
        $this->actingAs($editor)->get('/admin/users')->assertStatus(200);

        // Editor CANNOT create users (requires 'users.create')
        $createResponse = $this->actingAs($editor)->post('/admin/users', [
            'name' => 'Forbidden User',
            'email' => 'forbidden@example.com',
            'password' => 'password123!',
        ]);
        $createResponse->assertStatus(403);

        // Editor CANNOT access analytics (requires 'analytics.view')
        $analyticsResponse = $this->actingAs($editor)->get('/admin/analytics');
        $analyticsResponse->assertStatus(403);
    }

    /**
     * Test password reset request and password reset execution.
     */
    public function test_admin_can_request_password_reset_and_reset_password(): void
    {
        // 1. Request reset link
        $forgotResponse = $this->post('/admin/forgot-password', [
            'email' => 'admin@example.com',
        ]);
        $forgotResponse->assertRedirect();

        $record = DB::table('password_reset_tokens')->where('email', 'admin@example.com')->first();
        $this->assertNotNull($record);

        // Generate raw token and hash it in DB
        $rawToken = 'test-reset-token-1234567890';
        DB::table('password_reset_tokens')->where('email', 'admin@example.com')->update([
            'token' => Hash::make($rawToken),
            'created_at' => Carbon::now(),
        ]);

        // 2. Perform reset
        $resetResponse = $this->post('/admin/reset-password', [
            'token' => $rawToken,
            'email' => 'admin@example.com',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]);

        $resetResponse->assertRedirect(route('admin.login'));

        // 3. Verify user can login with new password
        $admin = User::where('email', 'admin@example.com')->first();
        $this->assertTrue(Hash::check('NewSecurePassword123!', $admin->password));
    }

    /**
     * Test admin user cannot delete their own account.
     */
    public function test_admin_cannot_delete_own_account(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        $response = $this->actingAs($admin)->delete("/admin/users/{$admin->id}");

        $response->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    /**
     * Test user with 2FA enabled cannot access admin pages without 2FA session verification.
     */
    public function test_user_with_2fa_cannot_bypass_challenge(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        // Attempting to visit /admin without session auth.two_factor_verified
        $response = $this->actingAs($admin)->get('/admin');

        $response->assertRedirect(route('admin.two-factor.challenge'));
    }

    /**
     * Test admin can update profile details and change password.
     */
    public function test_admin_can_update_profile_and_change_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        // Update profile name
        $profileResponse = $this->actingAs($admin)->put('/admin/profile', [
            'name' => 'Updated Admin Name',
            'email' => 'admin@example.com',
        ]);
        $profileResponse->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => 'Updated Admin Name']);

        // Update password
        $passwordResponse = $this->actingAs($admin)->put('/admin/profile/password', [
            'current_password' => 'password',
            'password' => 'BrandNewPassword123!',
            'password_confirmation' => 'BrandNewPassword123!',
        ]);
        $passwordResponse->assertRedirect();
        $admin->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword123!', $admin->password));
    }

    /**
     * Test password reset with expired token fails.
     */
    public function test_password_reset_with_expired_token_fails(): void
    {
        $rawToken = 'expired-token';
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => 'admin@example.com'],
            [
                'token' => Hash::make($rawToken),
                'created_at' => Carbon::now()->subMinutes(61), // Expired > 60 mins
            ]
        );

        $response = $this->post('/admin/reset-password', [
            'token' => $rawToken,
            'email' => 'admin@example.com',
            'password' => 'SomePassword123!',
            'password_confirmation' => 'SomePassword123!',
        ]);

        $response->assertSessionHasErrors('email');
    }

    /**
     * Test admin can view recovery codes with valid password.
     */
    public function test_admin_can_view_recovery_codes_with_valid_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $codes = ['REC1-11111', 'REC2-22222'];
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_recovery_codes' => json_encode($codes),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['auth.two_factor_verified' => true])
            ->postJson('/admin/two-factor/recovery-codes', [
                'password' => 'password',
            ]);

        $response->assertStatus(200);
        $this->assertSame($codes, $response->json('recovery_codes'));
    }

    /**
     * Test admin cannot view recovery codes with invalid password.
     */
    public function test_admin_cannot_view_recovery_codes_with_invalid_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_recovery_codes' => json_encode(['REC1-11111']),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['auth.two_factor_verified' => true])
            ->postJson('/admin/two-factor/recovery-codes', [
                'password' => 'wrong-password',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    /**
     * Test admin can regenerate recovery codes with valid password.
     */
    public function test_admin_can_regenerate_recovery_codes_with_valid_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $oldCodes = ['OLD-11111'];
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_recovery_codes' => json_encode($oldCodes),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['auth.two_factor_verified' => true])
            ->post('/admin/two-factor/recovery-codes/regenerate', [
                'password' => 'password',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('recovery_codes');

        $admin->refresh();
        $newCodes = $this->twoFactorService->getRecoveryCodesForUser($admin);
        $this->assertCount(8, $newCodes);
        $this->assertNotContains('OLD-11111', $newCodes);
    }

    /**
     * Test admin cannot disable 2FA with invalid password.
     */
    public function test_admin_cannot_disable_2fa_with_invalid_password(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['auth.two_factor_verified' => true])
            ->post('/admin/two-factor/disable', [
                'password' => 'wrong-password',
            ]);

        $response->assertSessionHasErrors('password');
        $this->assertTrue($admin->fresh()->hasTwoFactorEnabled());
    }

    /**
     * Test enabling 2FA with expired session fails gracefully.
     */
    public function test_enabling_2fa_without_pending_secret_fails(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        $response = $this->actingAs($admin)
            ->post('/admin/two-factor/enable', [
                'code' => '123456',
            ]);

        $response->assertSessionHasErrors('code');
    }

    /**
     * Test 2FA challenge is rate limited after too many invalid attempts.
     */
    public function test_2fa_challenge_is_rate_limited_after_multiple_failures(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();
        $admin->update([
            'two_factor_secret' => $this->twoFactorService->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->withSession(['login.id' => $admin->id])
                ->post('/admin/two-factor-challenge', [
                    'code' => '000000',
                ]);
        }

        // 6th attempt should be blocked by rate limiter
        $response = $this->withSession(['login.id' => $admin->id])
            ->post('/admin/two-factor-challenge', [
                'code' => '000000',
            ]);

        $response->assertSessionHasErrors('code');
        $errors = session('errors')->get('code');
        $this->assertStringContainsString('Too many login attempts', $errors[0]);
    }
}
