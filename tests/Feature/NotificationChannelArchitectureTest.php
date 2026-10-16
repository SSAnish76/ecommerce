<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SendEmailJob;
use App\Jobs\SendPushNotificationJob;
use App\Jobs\SendSmsJob;
use App\Mail\Auth\PasswordResetMail;
use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationDispatcher;
use App\Services\Channels\ChannelInterface;
use App\Services\Channels\EmailChannel;
use App\Services\Channels\PushChannel;
use App\Services\Channels\SmsChannel;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use InvalidArgumentException;
use Tests\TestCase;

class NotificationChannelArchitectureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(SettingSeeder::class);
        $this->seed(StoreSeeder::class);
    }

    /**
     * Test that NotificationDispatcher resolves standard channels.
     */
    public function test_notification_dispatcher_resolves_standard_channels(): void
    {
        $dispatcher = app(NotificationDispatcher::class);

        $this->assertTrue($dispatcher->has('email'));
        $this->assertTrue($dispatcher->has('sms'));
        $this->assertTrue($dispatcher->has('push'));

        $this->assertInstanceOf(EmailChannel::class, $dispatcher->email());
        $this->assertInstanceOf(SmsChannel::class, $dispatcher->sms());
        $this->assertInstanceOf(PushChannel::class, $dispatcher->push());

        $this->assertSame($dispatcher->email(), $dispatcher->channel('email'));
        $this->assertSame($dispatcher->sms(), $dispatcher->channel('sms'));
        $this->assertSame($dispatcher->push(), $dispatcher->channel('push'));
    }

    /**
     * Test that NotificationDispatcher throws InvalidArgumentException for unknown channels.
     */
    public function test_notification_dispatcher_throws_exception_for_unregistered_channel(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Notification channel [discord] is not registered.');

        $dispatcher = app(NotificationDispatcher::class);
        $dispatcher->channel('discord');
    }

    /**
     * Test that developers can easily register custom notification channels.
     */
    public function test_developers_can_register_custom_channels(): void
    {
        $dispatcher = app(NotificationDispatcher::class);

        $customChannel = new class implements ChannelInterface {
            public function name(): string
            {
                return 'slack';
            }

            public function isEnabled(?string $settingKey = null): bool
            {
                return true;
            }
        };

        $dispatcher->register($customChannel);

        $this->assertTrue($dispatcher->has('slack'));
        $this->assertSame($customChannel, $dispatcher->channel('slack'));
    }

    /**
     * Test EmailChannel input validation rejects invalid email addresses.
     */
    public function test_email_channel_skips_invalid_email_addresses(): void
    {
        Queue::fake();

        $dispatcher = app(NotificationDispatcher::class);
        $user = User::factory()->create();
        $mailable = new PasswordResetMail($user, 'token', 'https://example.com/reset');

        // Invalid email format should return false and not push job
        $result = $dispatcher->email()->send('not-a-valid-email', $mailable);

        $this->assertFalse($result);
        Queue::assertNotPushed(SendEmailJob::class);
    }

    /**
     * Test SmsChannel skips when recipient phone number is empty.
     */
    public function test_sms_channel_skips_empty_recipient(): void
    {
        Queue::fake();

        Setting::set('enable_order_sms_notifications', true);

        $dispatcher = app(NotificationDispatcher::class);
        $result = $dispatcher->sms()->send('   ', 'Hello World');

        $this->assertFalse($result);
        Queue::assertNotPushed(SendSmsJob::class);
    }

    /**
     * Test PushChannel respects individual setting toggle.
     */
    public function test_push_channel_respects_setting_toggle(): void
    {
        Queue::fake();

        Setting::set('enable_in_app_notifications', true);
        Setting::set('notify_order_placed_admin', false);

        $dispatcher = app(NotificationDispatcher::class);
        $result = $dispatcher->push()->send(
            'admin',
            'Order Notification',
            'Order received',
            [],
            'notify_order_placed_admin',
        );

        $this->assertFalse($result);
        Queue::assertNotPushed(SendPushNotificationJob::class);
    }

    /**
     * Test NotificationDispatcher memoizes getStoreInfo() and adminEmail() across calls.
     */
    public function test_notification_dispatcher_memoization_optimization(): void
    {
        $dispatcher = app(NotificationDispatcher::class);

        // First call populates cache
        $storeInfo1 = $dispatcher->getStoreInfo();
        $adminEmail1 = $dispatcher->adminEmail();

        $this->assertNotEmpty($storeInfo1['name']);
        $this->assertNotEmpty($adminEmail1);

        // Second call returns cached array
        $storeInfo2 = $dispatcher->getStoreInfo();
        $adminEmail2 = $dispatcher->adminEmail();

        $this->assertSame($storeInfo1, $storeInfo2);
        $this->assertSame($adminEmail1, $adminEmail2);

        // Flushed cache resets
        $dispatcher->flushCache();
        $storeInfo3 = $dispatcher->getStoreInfo();
        $this->assertSame($storeInfo1['name'], $storeInfo3['name']);
    }
}
