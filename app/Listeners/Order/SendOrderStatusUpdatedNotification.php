<?php

declare(strict_types=1);

namespace App\Listeners\Order;

use App\Events\Order\OrderStatusUpdated;
use App\Listeners\BaseNotificationListener;
use App\Mail\Order\OrderStatusUpdatedMail;

class SendOrderStatusUpdatedNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(OrderStatusUpdated $event): void
    {
        $order = $event->orderData;
        $statusLabel = ucfirst($event->newStatus);

        $isDelivered = strtolower((string) $event->newStatus) === 'delivered';
        $emailKey = $isDelivered ? 'notify_order_delivered_customer_email' : 'notify_order_status_updated_email';
        $smsKey = $isDelivered ? 'notify_order_delivered_customer_sms' : 'notify_order_status_updated_sms';

        // 1. Email Channel - Customer Update
        if (! empty($order['customer_email'])) {
            $this->email()->send(
                $order['customer_email'],
                new OrderStatusUpdatedMail($order, $event->previousStatus, $event->newStatus),
                $emailKey,
            );
        }

        // 2. SMS Channel - Customer SMS Update
        if (! empty($order['customer_phone'])) {
            $message = "Order #{$order['order_number']} update: Status is now {$statusLabel}.";
            if (! empty($order['tracking_number'])) {
                $message .= " Tracking: {$order['tracking_number']}";
            }
            $this->sms()->send((string) $order['customer_phone'], $message, $smsKey);
        }

        // 3. Push / In-App Notification Channel
        if (! empty($order['customer_id'])) {
            $this->push()->send(
                $order['customer_id'],
                "Order #{$order['order_number']} {$statusLabel}",
                "Your order status has changed to {$statusLabel}.",
                ['order_number' => $order['order_number'], 'new_status' => $event->newStatus],
            );
        }
    }
}
