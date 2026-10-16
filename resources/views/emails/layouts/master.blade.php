<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? config('app.name', 'Notification') }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 40px 16px;
            box-sizing: border-box;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: #0f172a;
            padding: 28px 36px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
        }
        .header p {
            margin: 4px 0 0 0;
            color: #94a3b8;
            font-size: 13px;
        }
        .content {
            padding: 36px;
        }
        .content h2 {
            margin: 0 0 16px 0;
            color: #0f172a;
            font-size: 20px;
            font-weight: 600;
        }
        .content p {
            margin: 0 0 16px 0;
            font-size: 15px;
            color: #475569;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .badge-info {
            background-color: #e0f2fe;
            color: #0369a1;
        }
        .badge-warning {
            background-color: #fef3c7;
            color: #b45309;
        }
        .badge-success {
            background-color: #dcfce7;
            color: #15803d;
        }
        .badge-danger {
            background-color: #fee2e2;
            color: #b91c1c;
        }
        .panel {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 22px;
            margin: 20px 0;
        }
        .panel-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #edf2f7;
            font-size: 14px;
        }
        .panel-row:last-child {
            border-bottom: none;
        }
        .panel-label {
            color: #64748b;
            font-weight: 500;
        }
        .panel-value {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }
        .btn-container {
            text-align: center;
            margin: 28px 0;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 28px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
        .divider {
            height: 1px;
            background-color: #e2e8f0;
            margin: 24px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 36px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }
        .footer p {
            margin: 4px 0;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>{{ $store['name'] ?? config('app.name', 'E-Commerce Store') }}</h1>
                @if(!empty($headerSubtitle))
                    <p>{{ $headerSubtitle }}</p>
                @endif
            </div>

            <!-- Main Content -->
            <div class="content">
                @yield('content')
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>{{ $store['legal_name'] ?? $store['name'] ?? config('app.name') }}</strong></p>
                @if(!empty($store['address']))
                    <p>{{ $store['address'] }}</p>
                @endif
                <p>
                    Questions? Contact us at 
                    <a href="mailto:{{ $store['email'] ?? 'support@store.com' }}">{{ $store['email'] ?? 'support@store.com' }}</a>
                    @if(!empty($store['phone']))
                        | Tel: {{ $store['phone'] }}
                    @endif
                </p>
                <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
                    This is an automated notification. Please do not reply directly to this email unless directed otherwise.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
