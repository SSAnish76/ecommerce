@extends('emails.layouts.master')

@section('content')
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h2 style="margin: 0;">Low Stock Warning</h2>
        <span class="badge badge-warning">Low Inventory</span>
    </div>

    <p>
        The following inventory item has dropped to or below the configured low stock alert threshold:
    </p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Product Name:</span>
            <span class="panel-value">{{ $product['name'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">SKU / Item Code:</span>
            <span class="panel-value" style="font-family: monospace;">{{ $product['sku'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Current Quantity:</span>
            <span class="panel-value" style="color: #b45309; font-weight: 700;">{{ $currentStock }} units</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Alert Threshold:</span>
            <span class="panel-value">{{ $threshold }} units</span>
        </div>
    </div>

    <div class="btn-container">
        <a href="{{ route('admin.dashboard') }}" class="btn" target="_blank" rel="noopener noreferrer">Manage Inventory</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b;">
        Please arrange for replenishment from suppliers to avoid customer order fulfillment delays.
    </p>
@endsection
