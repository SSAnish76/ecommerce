@extends('emails.layouts.master')

@section('content')
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h2 style="margin: 0;">New Order Received</h2>
        <span class="badge badge-success">New Order</span>
    </div>
    
    <p>A new purchase has just been completed on the storefront:</p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Order Number:</span>
            <span class="panel-value">#{{ $order['order_number'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Customer Name:</span>
            <span class="panel-value">{{ $order['customer_name'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Customer Email:</span>
            <span class="panel-value">{{ $order['customer_email'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Order Total:</span>
            <span class="panel-value">{{ $order['currency'] ?? '$' }}{{ number_format((float)$order['total'], 2) }}</span>
        </div>
        @if(!empty($order['payment_method']))
        <div class="panel-row">
            <span class="panel-label">Payment Method:</span>
            <span class="panel-value">{{ ucfirst($order['payment_method']) }}</span>
        </div>
        @endif
    </div>

    @if(!empty($order['items']) && is_array($order['items']))
    <h3 style="font-size: 16px; margin: 20px 0 10px 0; color: #0f172a;">Order Line Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 8px 0;">Product</th>
                <th style="padding: 8px 0; text-align: center;">Qty</th>
                <th style="padding: 8px 0; text-align: right;">Unit Price</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order['items'] as $item)
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #1e293b;">{{ $item['name'] }}</td>
                <td style="padding: 10px 0; text-align: center; color: #64748b;">{{ $item['quantity'] }}</td>
                <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{{ $order['currency'] ?? '$' }}{{ number_format((float)$item['price'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="btn-container">
        <a href="{{ route('admin.dashboard') }}" class="btn" target="_blank" rel="noopener noreferrer">Open Admin Dashboard</a>
    </div>
@endsection
