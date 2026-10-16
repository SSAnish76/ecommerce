<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Activity\ActivityStatus;
use App\Enums\Order\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard with overview statistics and recent activities.
     */
    public function index(): Response
    {
        $userCount = User::query()->count();
        $recentUsers = User::query()
            ->with(['roles:id,name,is_system,status'])
            ->latest('id')
            ->limit(5)
            ->get(['id', 'name', 'email', 'is_2fa', 'created_at']);

        $metrics = [
            [
                'title' => 'Total Revenue',
                'value' => '$48,250.00',
                'change' => '+14.2%',
                'isPositive' => true,
                'icon' => 'DollarSign',
                'description' => 'vs last month ($42,120)',
            ],
            [
                'title' => 'Total Orders',
                'value' => '1,428',
                'change' => '+8.1%',
                'isPositive' => true,
                'icon' => 'ShoppingBag',
                'description' => 'vs last month (1,320)',
            ],
            [
                'title' => 'Active Customers',
                'value' => (string) max($userCount, 120),
                'change' => '+12.5%',
                'isPositive' => true,
                'icon' => 'Users',
                'description' => 'vs last month (106)',
            ],
            [
                'title' => 'Conversion Rate',
                'value' => '3.64%',
                'change' => '-0.4%',
                'isPositive' => false,
                'icon' => 'TrendingUp',
                'description' => 'vs last month (4.04%)',
            ],
        ];

        $recentOrders = [
            [
                'id' => 'ORD-7821',
                'customer' => 'Sophia Martinez',
                'email' => 'sophia.m@example.com',
                'amount' => '$249.99',
                'status' => OrderStatus::Delivered->value,
                'date' => 'Today at 02:40 PM',
            ],
            [
                'id' => 'ORD-7820',
                'customer' => 'Liam Johnson',
                'email' => 'liam.j@example.com',
                'amount' => '$89.00',
                'status' => OrderStatus::Processing->value,
                'date' => 'Today at 01:15 PM',
            ],
            [
                'id' => 'ORD-7819',
                'customer' => 'Emma Watson',
                'email' => 'emma.w@example.com',
                'amount' => '$520.40',
                'status' => OrderStatus::Shipped->value,
                'date' => 'Yesterday at 09:30 PM',
            ],
            [
                'id' => 'ORD-7818',
                'customer' => 'Noah Davis',
                'email' => 'noah.d@example.com',
                'amount' => '$145.20',
                'status' => OrderStatus::Delivered->value,
                'date' => 'Yesterday at 04:12 PM',
            ],
            [
                'id' => 'ORD-7817',
                'customer' => 'Ava Wilson',
                'email' => 'ava.w@example.com',
                'amount' => '$32.50',
                'status' => OrderStatus::Cancelled->value,
                'date' => '2 days ago',
            ],
        ];

        $activityFeed = [
            [
                'id' => '1',
                'user' => 'Sophia Martinez',
                'action' => 'placed a new order',
                'target' => '#ORD-7821',
                'time' => '12m ago',
                'status' => ActivityStatus::Completed->value,
            ],
            [
                'id' => '2',
                'user' => 'Admin User',
                'action' => 'updated product price for',
                'target' => 'Wireless Noise-Canceling Headphones',
                'time' => '45m ago',
                'status' => ActivityStatus::Completed->value,
            ],
            [
                'id' => '3',
                'user' => 'Liam Johnson',
                'action' => 'requested refund for',
                'target' => '#ORD-7812',
                'time' => '2h ago',
                'status' => ActivityStatus::Pending->value,
            ],
            [
                'id' => '4',
                'user' => 'System Backup',
                'action' => 'completed automated backup to',
                'target' => 'S3 Storage Bucket',
                'time' => '5h ago',
                'status' => ActivityStatus::Completed->value,
            ],
        ];

        return Inertia::render('Admin/Dashboard', [
            'metrics' => $metrics,
            'recentOrders' => $recentOrders,
            'recentUsers' => $recentUsers,
            'activityFeed' => $activityFeed,
        ]);
    }
}
