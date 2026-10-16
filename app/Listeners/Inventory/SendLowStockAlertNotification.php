<?php

declare(strict_types=1);

namespace App\Listeners\Inventory;

use App\Events\Inventory\LowStockDetected;
use App\Listeners\BaseNotificationListener;
use App\Mail\Inventory\LowStockAlertMail;

class SendLowStockAlertNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(LowStockDetected $event): void
    {
        // 1. Email Channel - Administrator Alert
        $this->email()->send(
            $this->adminEmail(),
            new LowStockAlertMail($event->productData, $event->currentStock, $event->threshold),
            'notify_low_stock_admin',
        );

        // 2. In-App / Push Alert Channel
        $this->push()->send(
            'admin',
            'Low Stock Warning: ' . $event->productData['name'],
            "Only {$event->currentStock} units remaining (Threshold: {$event->threshold}).",
            ['sku' => $event->productData['sku'], 'type' => 'low_stock'],
        );
    }
}
