<?php

declare(strict_types=1);

namespace App\Listeners\Order;

use App\Events\Order\OrderPlaced;
use App\Listeners\BaseNotificationListener;
use App\Mail\Order\OrderPlacedAdminMail;
use App\Mail\Order\OrderPlacedCustomerMail;

class SendOrderPlacedNotifications extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(OrderPlaced $event): void
    {
        $order = $event->orderData;
        $currency = $order['currency'] ?? '$';
        $total = number_format((float) ($order['total'] ?? 0), 2);

        // 1. Email Channel - Customer Confirmation
        if (! empty($order['customer_email'])) {
            $this->email()->send(
                $order['customer_email'],
                new OrderPlacedCustomerMail($order),
                'notify_order_placed_customer',
            );
        }

        // 2. Email Channel - Administrator Alert
        $this->email()->send(
            $this->adminEmail(),
            new OrderPlacedAdminMail($order),
            'notify_order_placed_admin',
        );

        // 3. SMS Channel - Customer SMS Confirmation
        if (! empty($order['customer_phone'])) {
            $this->sms()->send(
                (string) $order['customer_phone'],
                "Order #{$order['order_number']} confirmed! Total: {$currency}{$total}. Thank you for your purchase.",
            );
        }

        // 4. Push / In-App Channel - Real-time Administrator Alert
        $this->push()->send(
            'admin',
            "New Order: #{$order['order_number']}",
            "Customer {$order['customer_name']} placed an order for {$currency}{$total}.",
            ['order_number' => $order['order_number'], 'type' => 'order_placed'],
        );
    }
}
