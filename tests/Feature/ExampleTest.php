<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('admin.dashboard'));

        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::where('email', 'admin@example.com')->first();

        $adminResponse = $this->actingAs($admin)->get('/admin');

        $adminResponse->assertStatus(200);
    }
}
