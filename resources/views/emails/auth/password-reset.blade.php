@extends('emails.layouts.master')

@section('content')
    <h2>Password Reset Request</h2>
    <p>Hello <strong>{{ $user->name }}</strong>,</p>
    <p>
        We received a request to reset the password for your administrator account (<code>{{ $user->email }}</code>).
    </p>

    <div class="panel">
        <p style="margin: 0; font-size: 14px; color: #64748b;">
            To set a new password, click the button below. This password reset link is valid for <strong>60 minutes</strong>.
        </p>
    </div>

    <div class="btn-container">
        <a href="{{ $resetUrl }}" class="btn" target="_blank" rel="noopener noreferrer">Reset Your Password</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
        If you did not request a password reset, no further action is required. Your account remains secure.
    </p>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        If you're having trouble clicking the button, copy and paste this URL into your web browser:<br>
        <a href="{{ $resetUrl }}" style="color: #2563eb;">{{ $resetUrl }}</a>
    </p>
@endsection
