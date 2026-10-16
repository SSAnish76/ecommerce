<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\ProductReviewSubmitted;
use App\Listeners\BaseNotificationListener;
use App\Mail\Review\NewReviewAlertMail;

class SendNewReviewAlertNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(ProductReviewSubmitted $event): void
    {
        // 1. Email Channel - Administrator Alert
        $this->email()->send(
            $this->adminEmail(),
            new NewReviewAlertMail($event->reviewData),
            'notify_new_review_admin',
        );

        // 2. Push / In-App Notification Channel
        $this->push()->send(
            'admin',
            'New Product Review: ' . $event->reviewData['product_name'],
            "Customer {$event->reviewData['customer_name']} left a {$event->reviewData['rating']}-star review.",
            ['product' => $event->reviewData['product_name'], 'rating' => $event->reviewData['rating']],
        );
    }
}
