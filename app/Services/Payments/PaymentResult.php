<?php

declare(strict_types=1);

namespace App\Services\Payments;

class PaymentResult
{
    /**
     * Create a new payment result instance.
     *
     * @param array<string, mixed> $data
     */
    public function __construct(
        public bool $success,
        public ?string $transactionId = null,
        public ?string $status = null,
        public ?string $message = null,
        public ?string $redirectUrl = null,
        public array $data = [],
    ) {}

    /**
     * Create a successful payment result.
     *
     * @param array<string, mixed> $data
     */
    public static function success(
        string $transactionId,
        ?string $message = 'Payment completed successfully.',
        array $data = [],
    ): self {
        return new self(
            success: true,
            transactionId: $transactionId,
            status: 'paid',
            message: $message,
            data: $data,
        );
    }

    /**
     * Create a pending payment result (e.g. for Cash on Delivery, Bank Transfer, or Async processing).
     *
     * @param array<string, mixed> $data
     */
    public static function pending(
        ?string $transactionId = null,
        ?string $message = 'Payment is pending verification or settlement.',
        array $data = [],
    ): self {
        return new self(
            success: true,
            transactionId: $transactionId,
            status: 'pending',
            message: $message,
            data: $data,
        );
    }

    /**
     * Create a redirect payment result (e.g. Stripe Checkout, PayPal approval URL).
     *
     * @param array<string, mixed> $data
     */
    public static function redirect(
        string $redirectUrl,
        ?string $transactionId = null,
        ?string $message = 'Redirecting to payment gateway.',
        array $data = [],
    ): self {
        return new self(
            success: true,
            transactionId: $transactionId,
            status: 'pending',
            message: $message,
            redirectUrl: $redirectUrl,
            data: $data,
        );
    }

    /**
     * Create a failed payment result.
     *
     * @param array<string, mixed> $data
     */
    public static function failed(
        string $message,
        ?string $transactionId = null,
        array $data = [],
    ): self {
        return new self(
            success: false,
            transactionId: $transactionId,
            status: 'failed',
            message: $message,
            data: $data,
        );
    }

    /**
     * Transform the result to an array.
     *
     * @return array{
     *     success: bool,
     *     transaction_id: string|null,
     *     status: string|null,
     *     message: string|null,
     *     redirect_url: string|null,
     *     data: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'transaction_id' => $this->transactionId,
            'status' => $this->status,
            'message' => $this->message,
            'redirect_url' => $this->redirectUrl,
            'data' => $this->data,
        ];
    }
}

