@extends('emails.layouts.master')

@section('content')
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h2 style="margin: 0;">{{ $alertSubject }}</h2>
        <span class="badge {{ $level === 'error' || $level === 'critical' ? 'badge-danger' : ($level === 'warning' ? 'badge-warning' : 'badge-info') }}">
            {{ strtoupper($level) }}
        </span>
    </div>

    <p style="font-size: 15px; color: #1e293b; margin: 16px 0;">
        {{ $alertMessage }}
    </p>

    @if(!empty($context))
    <h3 style="font-size: 14px; margin: 20px 0 10px 0; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Alert Diagnostics & Context</h3>
    <div class="panel">
        @foreach($context as $key => $val)
        <div class="panel-row">
            <span class="panel-label">{{ ucwords(str_replace('_', ' ', (string)$key)) }}:</span>
            <span class="panel-value" style="font-family: monospace; font-size: 13px;">
                @if(is_array($val) || is_object($val))
                    {{ json_encode($val) }}
                @elseif(is_bool($val))
                    {{ $val ? 'true' : 'false' }}
                @else
                    {{ (string)$val }}
                @endif
            </span>
        </div>
        @endforeach
    </div>
    @endif

    <div class="btn-container">
        <a href="{{ route('admin.dashboard') }}" class="btn" target="_blank" rel="noopener noreferrer">View Store Dashboard</a>
    </div>
@endsection
