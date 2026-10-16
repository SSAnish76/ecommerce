@extends('emails.layouts.master')

@section('content')
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h2 style="margin: 0;">Order Cancelled</h2>
        <span class="badge badge-danger">Cancelled</span>
    </div>

    @if($isAdminNotification)
        <p>This is an administrative alert that an order has been cancelled:</p>
    @else
        <p>Hello <strong>{{ $order['customer_name'] }}</strong>,</p>
        <p>Your order <strong>#{{ $order['order_number'] }}</strong> has been cancelled.</p>
    @endif

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Order Number:</span>
            <span class="panel-value">#{{ $order['order_number'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Customer:</span>
            <span class="panel-value">{{ $order['customer_name'] }} ({{ $order['customer_email'] }})</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Total Amount:</span>
            <span class="panel-value">${{ number_format((float)$order['total'], 2) }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Reason:</span>
            <span class="panel-value" style="color: #b91c1c;">{{ $reason }}</span>
        </div>
        @if(!empty($order['refund_status']))
        <div class="panel-row">
            <span class="panel-label">Refund Status:</span>
            <span class="panel-value">{{ ucfirst($order['refund_status']) }}</span>
        </div>
        @endif
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b;">
        If you have questions regarding payment refund timelines or this cancellation, please contact our support department at
        <a href="mailto:{{ $store['email'] }}" style="color: #2563eb;">{{ $store['email'] }}</a>.
    </p>
@endsection
