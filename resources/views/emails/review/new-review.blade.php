@extends('emails.layouts.master')

@section('content')
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h2 style="margin: 0;">New Product Review</h2>
        <span class="badge badge-info">Feedback</span>
    </div>

    <p>A customer has submitted a new review for <strong>{{ $review['product_name'] }}</strong>:</p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Product:</span>
            <span class="panel-value">{{ $review['product_name'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Reviewer:</span>
            <span class="panel-value">{{ $review['customer_name'] }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Star Rating:</span>
            <span class="panel-value" style="color: #eab308; font-size: 16px;">
                {{ str_repeat('★', $review['rating']) }}{{ str_repeat('☆', max(0, 5 - $review['rating'])) }} ({{ $review['rating'] }}/5)
            </span>
        </div>
    </div>

    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Customer Feedback:</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b; font-style: italic;">
            "{{ $review['comment'] }}"
        </p>
    </div>

    <div class="btn-container">
        <a href="{{ route('admin.dashboard') }}" class="btn" target="_blank" rel="noopener noreferrer">Review in Admin Panel</a>
    </div>
@endsection
