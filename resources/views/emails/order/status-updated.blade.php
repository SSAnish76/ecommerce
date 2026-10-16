@extends('emails.layouts.master')

@section('content')
    <h2>Order Status Update</h2>
    <p>Hello <strong>{{ $order['customer_name'] }}</strong>,</p>
    <p>
        The status of your order <strong>#{{ $order['order_number'] }}</strong> has been updated.
    </p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Order Number:</span>
            <span class="panel-value">#{{ $order['order_number'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Previous Status:</span>
            <span class="panel-value">{{ ucfirst($previousStatus) }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Current Status:</span>
            <span class="panel-value">
                <span class="badge badge-info">{{ ucfirst($newStatus) }}</span>
            </span>
        </div>
        @if(!empty($order['tracking_number']))
        <div class="panel-row">
            <span class="panel-label">Tracking Number:</span>
            <span class="panel-value" style="font-family: monospace;">{{ $order['tracking_number'] }}</span>
        </div>
        @endif
    </div>

    @if(!empty($order['notes']))
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; color: #334155;">
            <strong>Fulfillment Note:</strong> {{ $order['notes'] }}
        </p>
    </div>
    @endif

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b;">
        Thank you for shopping with us! If you have any inquiries regarding your package, please contact our support desk.
    </p>
@endsection
