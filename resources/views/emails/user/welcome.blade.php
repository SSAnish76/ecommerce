@extends('emails.layouts.master')

@section('content')
    <h2>Welcome, {{ $user->name }}!</h2>
    <p>
        An account has been created for you on <strong>{{ $store['name'] }}</strong>. Below are your account access details:
    </p>

    <div class="panel">
        <div class="panel-row">
            <span class="panel-label">Full Name:</span>
            <span class="panel-value">{{ $user->name }}</span>
        </div>
        <div class="panel-row">
            <span class="panel-label">Email Address:</span>
            <span class="panel-value">{{ $user->email }}</span>
        </div>
        @if(!empty($initialPassword))
        <div class="panel-row">
            <span class="panel-label">Temporary Password:</span>
            <span class="panel-value" style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{{ $initialPassword }}</span>
        </div>
        @endif
        <div class="panel-row">
            <span class="panel-label">Account Status:</span>
            <span class="panel-value">
                <span class="badge badge-success">{{ ucfirst($user->status->value ?? 'active') }}</span>
            </span>
        </div>
    </div>

    @if(!empty($initialPassword))
        <p style="font-size: 13px; color: #b45309; background-color: #fef3c7; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 6px;">
            <strong>Important:</strong> For security purposes, please log in and change your password upon your initial access.
        </p>
    @endif

    <div class="btn-container">
        <a href="{{ $loginUrl }}" class="btn" target="_blank" rel="noopener noreferrer">Access Your Account</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b;">
        If you have any questions or need technical support, don't hesitate to reach out to our team at
        <a href="mailto:{{ $store['email'] }}" style="color: #2563eb;">{{ $store['email'] }}</a>.
    </p>
@endsection
