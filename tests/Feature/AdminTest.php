<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->adminUser = User::where('email', 'admin@example.com')->first();
    }

    /**
     * Test unauthenticated users are redirected to login.
     */
    public function test_unauthenticated_users_are_redirected_to_admin_login(): void
    {
        $response = $this->get('/admin');
        $response->assertRedirect('/admin/login');
    }

    /**
     * Test admin dashboard can be rendered when authenticated.
     */
    public function test_admin_dashboard_can_be_rendered(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin');

        $response->assertStatus(200);
    }

    /**
     * Test admin users page can be rendered.
     */
    public function test_admin_users_page_can_be_rendered(): void
    {
        User::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/users');

        $response->assertStatus(200);
    }

    /**
     * Test new user can be created from admin.
     */
    public function test_admin_can_create_new_user(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/users', [
            'name' => 'John Admin',
            'email' => 'john.admin@example.com',
            'password' => 'secretPassword123!',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'email' => 'john.admin@example.com',
        ]);
    }

    /**
     * Test user can be deleted from admin.
     */
    public function test_admin_can_delete_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($this->adminUser)->delete("/admin/users/{$user->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    /**
     * Test user can be updated from admin.
     */
    public function test_admin_can_update_user(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'original@example.com',
        ]);

        $response = $this->actingAs($this->adminUser)->put("/admin/users/{$user->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'password' => 'newSecretPassword123!',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);
    }

    /**
     * Test user can be updated without changing password.
     */
    public function test_admin_can_update_user_without_changing_password(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'keepemail@example.com',
        ]);

        $response = $this->actingAs($this->adminUser)->put("/admin/users/{$user->id}", [
            'name' => 'Updated Name Only',
            'email' => 'keepemail@example.com',
            'password' => '',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name Only',
            'email' => 'keepemail@example.com',
        ]);
    }

    /**
     * Test admin users page can be rendered and includes is_2fa status.
     */
    public function test_admin_users_page_can_be_rendered_and_includes_is_2fa(): void
    {
        User::factory()->withTwoFactor()->create([
            'name' => 'Protected Admin',
            'email' => 'protected@example.com',
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/users');
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Users')
            ->has('users.data.0.is_2fa')
        );
    }

    /**
     * Test admin can reset and disable two factor for a user.
     */
    public function test_admin_can_reset_user_two_factor_authentication(): void
    {
        $user = User::factory()->withTwoFactor()->create([
            'name' => 'Locked Out User',
            'email' => 'lockedout@example.com',
        ]);

        $this->assertTrue($user->fresh()->is_2fa);
        $this->assertNotNull($user->fresh()->{'2fa_secret'});

        $response = $this->actingAs($this->adminUser)->put("/admin/users/{$user->id}", [
            'name' => 'Locked Out User',
            'email' => 'lockedout@example.com',
            'reset_2fa' => true,
        ]);

        $response->assertRedirect();

        $fresh = $user->fresh();
        $this->assertFalse($fresh->is_2fa);
        $this->assertNull($fresh->{'2fa_secret'});
        $this->assertNull($fresh->{'2fa_confirmed_at'});
        $this->assertNull($fresh->{'2fa_recovery_codes'});
    }

    /**
     * Test analytics and settings pages can be rendered.
     */
    public function test_admin_analytics_and_settings_can_be_rendered(): void
    {
        $this->actingAs($this->adminUser)->get('/admin/analytics')->assertStatus(200);
        $this->actingAs($this->adminUser)->get('/admin/settings')->assertStatus(200);
    }
}
