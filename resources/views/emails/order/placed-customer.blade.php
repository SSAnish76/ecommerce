@extends('emails.layouts.master')

@section('content')
    <h2>Thank You for Your Order!</h2>
    <p>Hello <strong>{{ $order['customer_name'] }}</strong>,</p>
    <p>
        We're thrilled to confirm that your order <strong>#{{ $order['order_number'] }}</strong> has been received and is currently being processed by our team.
    </p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Order Number:</span>
            <span class="panel-value">#{{ $order['order_number'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Total Amount:</span>
            <span class="panel-value">{{ $order['currency'] ?? '$' }}{{ number_format((float)$order['total'], 2) }}</span>
        </div>
        @if(!empty($order['payment_method']))
        <div class="panel-row">
            <span class="panel-label">Payment Method:</span>
            <span class="panel-value">{{ ucfirst($order['payment_method']) }}</span>
        </div>
        @endif
        @if(!empty($order['shipping_address']))
        <div class="panel-row">
            <span class="panel-label">Shipping Destination:</span>
            <span class="panel-value">{{ $order['shipping_address'] }}</span>
        </div>
        @endif
    </div>

    @if(!empty($order['items']) && is_array($order['items']))
    <h3 style="font-size: 16px; margin: 20px 0 10px 0; color: #0f172a;">Ordered Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 8px 0;">Item</th>
                <th style="padding: 8px 0; text-align: center;">Qty</th>
                <th style="padding: 8px 0; text-align: right;">Price</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order['items'] as $item)
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #1e293b; font-weight: 500;">{{ $item['name'] }}</td>
                <td style="padding: 10px 0; text-align: center; color: #64748b;">{{ $item['quantity'] }}</td>
                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{{ $order['currency'] ?? '$' }}{{ number_format((float)$item['price'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b;">
        You will receive another notification when your package has shipped with your parcel tracking information.
    </p>
@endsection
