<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\Auth\PasswordResetRequested;
use App\Events\Inventory\LowStockDetected;
use App\Events\Order\OrderCancelled;
use App\Events\Order\OrderPlaced;
use App\Events\Order\OrderStatusUpdated;
use App\Events\Review\ProductReviewSubmitted;
use App\Events\System\AdminAlertTriggered;
use App\Events\User\UserCreated;
use App\Jobs\SendEmailJob;
use App\Mail\Auth\PasswordResetMail;
use App\Mail\Inventory\LowStockAlertMail;
use App\Mail\Order\OrderCancelledMail;
use App\Mail\Order\OrderPlacedAdminMail;
use App\Mail\Order\OrderPlacedCustomerMail;
use App\Mail\Order\OrderStatusUpdatedMail;
use App\Mail\Review\NewReviewAlertMail;
use App\Mail\System\AdminAlertMail;
use App\Mail\User\WelcomeUserMail;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use App\Services\Channels\EmailChannel;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EmailNotificationSystemTest extends TestCase
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
     * Test password reset event triggers listener and queues email job.
     */
    public function test_password_reset_event_queues_email_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $token = 'test-token-xyz';
        $resetUrl = 'https://store.test/admin/reset-password/' . $token;

        event(new PasswordResetRequested($user, $token, $resetUrl));

        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($user, $token, $resetUrl): bool {
            return $job->to === $user->email
                && $job->mailable instanceof PasswordResetMail
                && $job->mailable->token === $token
                && $job->mailable->resetUrl === $resetUrl;
        });
    }

    /**
     * Test user created event queues welcome email job.
     */
    public function test_user_created_event_queues_welcome_email_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        event(new UserCreated($user, 'SecretInitialPass123!'));

        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($user): bool {
            return $job->to === $user->email
                && $job->mailable instanceof WelcomeUserMail
                && $job->mailable->initialPassword === 'SecretInitialPass123!';
        });
    }

    /**
     * Test order placed event queues both customer confirmation and admin alert email jobs.
     */
    public function test_order_placed_event_queues_customer_and_admin_emails(): void
    {
        Queue::fake();

        $orderData = [
            'order_number' => 'ORD-9901',
            'customer_name' => 'Alice Walker',
            'customer_email' => 'alice@example.com',
            'total' => 199.99,
            'currency' => '$',
            'items' => [
                ['name' => 'Wireless Headphones', 'quantity' => 1, 'price' => 199.99],
            ],
            'payment_method' => 'stripe',
            'shipping_address' => '123 Market St, New York, NY',
        ];

        event(new OrderPlaced($orderData));

        // Customer mail pushed
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($orderData): bool {
            return $job->to === 'alice@example.com'
                && $job->mailable instanceof OrderPlacedCustomerMail
                && $job->mailable->orderData['order_number'] === $orderData['order_number'];
        });

        // Admin alert mail pushed
        $adminEmail = app(EmailChannel::class)->getAdminAlertEmail();
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($adminEmail): bool {
            return $job->to === $adminEmail
                && $job->mailable instanceof OrderPlacedAdminMail;
        });
    }

    /**
     * Test order status update event queues customer notification email job.
     */
    public function test_order_status_updated_event_queues_email_job(): void
    {
        Queue::fake();

        $orderData = [
            'order_number' => 'ORD-9902',
            'customer_name' => 'Bob Smith',
            'customer_email' => 'bob@example.com',
            'total' => 89.50,
            'tracking_number' => 'TRK-99887766',
        ];

        event(new OrderStatusUpdated($orderData, 'processing', 'shipped'));

        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($orderData): bool {
            return $job->to === 'bob@example.com'
                && $job->mailable instanceof OrderStatusUpdatedMail
                && $job->mailable->previousStatus === 'processing'
                && $job->mailable->newStatus === 'shipped';
        });
    }

    /**
     * Test order cancelled event queues customer and admin email jobs.
     */
    public function test_order_cancelled_event_queues_email_jobs(): void
    {
        Queue::fake();

        $orderData = [
            'order_number' => 'ORD-9903',
            'customer_name' => 'Charlie Rose',
            'customer_email' => 'charlie@example.com',
            'total' => 45.00,
            'refund_status' => 'completed',
        ];

        event(new OrderCancelled($orderData, 'Item unavailable'));

        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job): bool {
            return $job->to === 'charlie@example.com'
                && $job->mailable instanceof OrderCancelledMail
                && ! $job->mailable->isAdminNotification;
        });

        $adminEmail = app(EmailChannel::class)->getAdminAlertEmail();
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($adminEmail): bool {
            return $job->to === $adminEmail
                && $job->mailable instanceof OrderCancelledMail
                && $job->mailable->isAdminNotification;
        });
    }

    /**
     * Test low stock detected event queues admin alert email job.
     */
    public function test_low_stock_detected_event_queues_admin_email_job(): void
    {
        Queue::fake();

        $productData = [
            'id' => 'prod-123',
            'name' => 'Mechanical Keyboard',
            'sku' => 'KB-MECH-01',
            'stock_quantity' => 3,
        ];

        event(new LowStockDetected($productData, 3, 5));

        $adminEmail = app(EmailChannel::class)->getAdminAlertEmail();
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($adminEmail, $productData): bool {
            return $job->to === $adminEmail
                && $job->mailable instanceof LowStockAlertMail
                && $job->mailable->productData['sku'] === $productData['sku']
                && $job->mailable->currentStock === 3
                && $job->mailable->threshold === 5;
        });
    }

    /**
     * Test product review submitted event queues admin alert email job.
     */
    public function test_product_review_submitted_event_queues_admin_email_job(): void
    {
        Queue::fake();

        $reviewData = [
            'product_name' => 'Ergonomic Mouse',
            'customer_name' => 'Dana Scully',
            'rating' => 5,
            'comment' => 'Exceptional precision and battery life.',
        ];

        event(new ProductReviewSubmitted($reviewData));

        $adminEmail = app(EmailChannel::class)->getAdminAlertEmail();
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($adminEmail): bool {
            return $job->to === $adminEmail
                && $job->mailable instanceof NewReviewAlertMail
                && $job->mailable->reviewData['rating'] === 5;
        });
    }

    /**
     * Test system admin alert triggered event queues email job.
     */
    public function test_admin_alert_triggered_event_queues_email_job(): void
    {
        Queue::fake();

        event(new AdminAlertTriggered(
            subject: 'High Memory Consumption Warning',
            message: 'Server memory utilization exceeded 90%',
            context: ['memory_used_mb' => 3800, 'threshold_mb' => 3600],
            level: 'warning',
        ));

        $adminEmail = app(EmailChannel::class)->getAdminAlertEmail();
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job) use ($adminEmail): bool {
            return $job->to === $adminEmail
                && $job->mailable instanceof AdminAlertMail
                && $job->mailable->level === 'warning';
        });
    }

    /**
     * Test that when global email notifications setting is disabled, no jobs are queued.
     */
    public function test_disabled_global_email_notifications_suppresses_jobs(): void
    {
        Queue::fake();

        Setting::set('enable_email_notifications', false);
        Setting::set('enable_in_app_notifications', false);
        Setting::set('enable_order_sms_notifications', false);

        $user = User::factory()->create();
        event(new UserCreated($user));
        event(new PasswordResetRequested($user, 'token', 'https://store.test/reset'));

        Queue::assertNotPushed(SendEmailJob::class);
        Queue::assertNothingPushed();
    }

    /**
     * Test that individual notification toggle disabling suppresses specific notification.
     */
    public function test_individual_notification_toggle_suppresses_specific_job(): void
    {
        Queue::fake();

        Setting::set('notify_order_placed_admin', false);
        Setting::set('notify_order_placed_customer', true);

        $orderData = [
            'order_number' => 'ORD-1234',
            'customer_name' => 'Test User',
            'customer_email' => 'test@example.com',
            'total' => 50,
            'items' => [],
        ];

        event(new OrderPlaced($orderData));

        // Customer email is pushed
        Queue::assertPushed(SendEmailJob::class, function (SendEmailJob $job): bool {
            return $job->mailable instanceof OrderPlacedCustomerMail;
        });

        // Admin alert is NOT pushed because notify_order_placed_admin is disabled
        Queue::assertNotPushed(SendEmailJob::class, function (SendEmailJob $job): bool {
            return $job->mailable instanceof OrderPlacedAdminMail;
        });
    }

    /**
     * Test SendEmailJob execution delivers email using Mail facade.
     */
    public function test_send_email_job_executes_and_sends_mail(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $mailable = new PasswordResetMail($user, 'token-123', 'https://store.test/reset/123');

        $job = new SendEmailJob($user->email, $mailable);
        $job->handle(app(EmailChannel::class));

        Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail) use ($user): bool {
            return $mail->hasTo($user->email);
        });
    }

    /**
     * Test all Mailables render HTML views without template syntax exceptions.
     */
    public function test_all_mailables_render_html_views_correctly(): void
    {
        $user = User::factory()->create(['name' => 'Jane Doe', 'email' => 'jane@example.com']);

        // 1. PasswordResetMail
        $pwMail = new PasswordResetMail($user, 'token-1', 'https://store.test/reset');
        $pwMail->assertSeeInHtml('Password Reset Request');
        $pwMail->assertSeeInHtml('Jane Doe');

        // 2. WelcomeUserMail
        $welcomeMail = new WelcomeUserMail($user, 'InitialTempPassword123');
        $welcomeMail->assertSeeInHtml('Welcome, Jane Doe!');
        $welcomeMail->assertSeeInHtml('InitialTempPassword123');

        // 3. OrderPlacedCustomerMail
        $orderCustomerMail = new OrderPlacedCustomerMail([
            'order_number' => 'ORD-4455',
            'customer_name' => 'Jane Doe',
            'customer_email' => 'jane@example.com',
            'total' => 99.95,
            'currency' => '$',
            'items' => [
                ['name' => 'Blue Sneakers', 'quantity' => 1, 'price' => 99.95],
            ],
        ]);
        $orderCustomerMail->assertSeeInHtml('Thank You for Your Order!');
        $orderCustomerMail->assertSeeInHtml('ORD-4455');
        $orderCustomerMail->assertSeeInHtml('Blue Sneakers');

        // 4. OrderPlacedAdminMail
        $orderAdminMail = new OrderPlacedAdminMail([
            'order_number' => 'ORD-4455',
            'customer_name' => 'Jane Doe',
            'customer_email' => 'jane@example.com',
            'total' => 99.95,
            'currency' => '$',
            'items' => [
                ['name' => 'Blue Sneakers', 'quantity' => 1, 'price' => 99.95],
            ],
        ]);
        $orderAdminMail->assertSeeInHtml('New Order Received');
        $orderAdminMail->assertSeeInHtml('ORD-4455');

        // 5. OrderStatusUpdatedMail
        $statusMail = new OrderStatusUpdatedMail([
            'order_number' => 'ORD-4455',
            'customer_name' => 'Jane Doe',
            'customer_email' => 'jane@example.com',
            'total' => 99.95,
            'tracking_number' => 'USPS-998877',
            'notes' => 'Dispatched via Express Courier',
        ], 'processing', 'shipped');
        $statusMail->assertSeeInHtml('Order Status Update');
        $statusMail->assertSeeInHtml('USPS-998877');

        // 6. OrderCancelledMail
        $cancelMail = new OrderCancelledMail([
            'order_number' => 'ORD-4455',
            'customer_name' => 'Jane Doe',
            'customer_email' => 'jane@example.com',
            'total' => 99.95,
            'refund_status' => 'refunded',
        ], 'Out of stock');
        $cancelMail->assertSeeInHtml('Order Cancelled');
        $cancelMail->assertSeeInHtml('Out of stock');

        // 7. LowStockAlertMail
        $lowStockMail = new LowStockAlertMail([
            'id' => 1,
            'name' => 'Ceramic Mug',
            'sku' => 'MUG-CRM-01',
            'stock_quantity' => 2,
        ], 2, 5);
        $lowStockMail->assertSeeInHtml('Low Stock Warning');
        $lowStockMail->assertSeeInHtml('Ceramic Mug');
        $lowStockMail->assertSeeInHtml('MUG-CRM-01');

        // 8. NewReviewAlertMail
        $reviewMail = new NewReviewAlertMail([
            'product_name' => 'Ceramic Mug',
            'customer_name' => 'Jane Doe',
            'rating' => 5,
            'comment' => 'Keeps coffee piping hot!',
        ]);
        $reviewMail->assertSeeInHtml('New Product Review');
        $reviewMail->assertSeeInHtml('Keeps coffee piping hot!');

        // 9. AdminAlertMail
        $sysMail = new AdminAlertMail(
            alertSubject: 'Database Backup Completed',
            alertMessage: 'Nightly database snapshot finished successfully.',
            context: ['duration_seconds' => 12, 'size_mb' => 45],
            level: 'info',
        );
        $sysMail->assertSeeInHtml('Database Backup Completed');
        $sysMail->assertSeeInHtml('Nightly database snapshot finished successfully.');
    }

    /**
     * Test PasswordResetController dispatches PasswordResetRequested event on valid request.
     */
    public function test_password_reset_controller_dispatches_event(): void
    {
        Event::fake([PasswordResetRequested::class]);

        $superAdminRole = Role::where('name', 'Super Admin')->firstOrFail();
        $admin = User::factory()->create(['email' => 'admin.test@example.com']);
        $admin->roles()->attach($superAdminRole);

        $response = $this->post(route('admin.password.email'), [
            'email' => 'admin.test@example.com',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('status');

        Event::assertDispatched(PasswordResetRequested::class, function (PasswordResetRequested $event) use ($admin): bool {
            return $event->user->id === $admin->id && ! empty($event->token) && ! empty($event->resetUrl);
        });
    }

    /**
     * Test UserController store dispatches UserCreated event.
     */
    public function test_user_controller_store_dispatches_user_created_event(): void
    {
        Event::fake([UserCreated::class]);

        $superAdminRole = Role::where('name', 'Super Admin')->firstOrFail();
        $actingAdmin = User::factory()->create();
        $actingAdmin->roles()->attach($superAdminRole);

        $response = $this->actingAs($actingAdmin)
            ->post(route('admin.users.store'), [
                'name' => 'New Staff User',
                'email' => 'staff.new@example.com',
                'password' => 'Password123!',
                'role_id' => $superAdminRole->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Event::assertDispatched(UserCreated::class, function (UserCreated $event): bool {
            return $event->user->email === 'staff.new@example.com'
                && $event->initialPassword === 'Password123!';
        });
    }

    /**
     * Test multi-channel notification flow: SMS and Push notifications triggered by events.
     */
    public function test_order_placed_dispatches_multi_channel_sms_and_push_when_enabled(): void
    {
        Queue::fake();

        // Enable SMS and Push notifications in settings
        Setting::set('enable_order_sms_notifications', true);
        Setting::set('enable_in_app_notifications', true);

        $orderData = [
            'order_number' => 'ORD-MULTI-01',
            'customer_name' => 'John Connor',
            'customer_email' => 'john@example.com',
            'customer_phone' => '+15551234567',
            'total' => 250.00,
            'currency' => '$',
            'items' => [],
        ];

        event(new OrderPlaced($orderData));

        // 1. Email Job queued
        Queue::assertPushed(SendEmailJob::class);

        // 2. SMS Job queued
        Queue::assertPushed(\App\Jobs\SendSmsJob::class, function (\App\Jobs\SendSmsJob $job): bool {
            return $job->to === '+15551234567'
                && str_contains($job->message, 'ORD-MULTI-01');
        });

        // 3. Push Job queued
        Queue::assertPushed(\App\Jobs\SendPushNotificationJob::class, function (\App\Jobs\SendPushNotificationJob $job): bool {
            return $job->recipientId === 'admin'
                && str_contains($job->title, 'ORD-MULTI-01');
        });
    }

    /**
     * Test SendSmsJob execution executes successfully.
     */
    public function test_send_sms_job_executes_successfully(): void
    {
        Setting::set('enable_order_sms_notifications', true);

        $job = new \App\Jobs\SendSmsJob('+15559876543', 'Your verification code is 123456');
        $job->handle(app(\App\Services\Channels\SmsChannel::class));

        $this->assertSame(3, $job->tries);
        $this->assertSame([5, 30, 120], $job->backoff);
    }

    /**
     * Test SendPushNotificationJob execution executes successfully.
     */
    public function test_send_push_notification_job_executes_successfully(): void
    {
        Setting::set('enable_in_app_notifications', true);

        $job = new \App\Jobs\SendPushNotificationJob('admin', 'Alert Title', 'Alert message body', ['test' => true]);
        $job->handle(app(\App\Services\Channels\PushChannel::class));

        $this->assertSame(3, $job->tries);
        $this->assertSame(60, $job->timeout);
    }
}

