<?php

declare(strict_types=1);

namespace App\Listeners\Order;

use App\Events\Order\OrderCancelled;
use App\Listeners\BaseNotificationListener;
use App\Mail\Order\OrderCancelledMail;

class SendOrderCancelledNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(OrderCancelled $event): void
    {
        $order = $event->orderData;

        // 1. Email Channel - Customer Cancellation Notice
        if (! empty($order['customer_email'])) {
            $this->email()->send(
                $order['customer_email'],
                new OrderCancelledMail($order, $event->reason, false),
                'notify_order_cancelled_customer_email',
            );
        }

        // 2. Email Channel - Administrator Alert
        $this->email()->send(
            $this->adminEmail(),
            new OrderCancelledMail($order, $event->reason, true),
            'notify_order_cancelled_admin_email',
        );

        // 3. SMS Channel - Customer SMS Cancellation Notice
        if (! empty($order['customer_phone'])) {
            $this->sms()->send(
                (string) $order['customer_phone'],
                "Order #{$order['order_number']} has been cancelled. Reason: {$event->reason}.",
                'notify_order_cancelled_customer_sms',
            );
        }

        // 4. Push / In-App Channel - Real-time Administrator Alert
        $this->push()->send(
            'admin',
            "Order Cancelled: #{$order['order_number']}",
            "Order #{$order['order_number']} was cancelled. Reason: {$event->reason}.",
            ['order_number' => $order['order_number'], 'type' => 'order_cancelled'],
        );
    }
}
