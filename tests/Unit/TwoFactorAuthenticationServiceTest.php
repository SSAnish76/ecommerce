<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\TwoFactorAuthenticationService;
use PHPUnit\Framework\TestCase;

class TwoFactorAuthenticationServiceTest extends TestCase
{
    private TwoFactorAuthenticationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TwoFactorAuthenticationService;
    }

    public function test_generate_secret_key_creates_valid_base32_string(): void
    {
        $secret = $this->service->generateSecretKey(32);

        $this->assertSame(32, strlen($secret));
        $this->assertMatchesRegularExpression('/^[A-Z2-7]{32}$/', $secret);
    }

    public function test_generate_secret_key_respects_custom_length(): void
    {
        $secret = $this->service->generateSecretKey(16);

        $this->assertSame(16, strlen($secret));
        $this->assertMatchesRegularExpression('/^[A-Z2-7]{16}$/', $secret);
    }

    public function test_format_secret_key_chunks_by_four_characters(): void
    {
        $secret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $formatted = $this->service->formatSecretKey($secret);

        $this->assertSame('ABCD EFGH IJKL MNOP QRST UVWX YZ23 4567', $formatted);
    }

    public function test_get_qr_code_uri_builds_valid_totp_uri(): void
    {
        $uri = $this->service->getQrCodeUri('StoreAdmin', 'admin@example.com', 'JBSWY3DPEHPK3PXP');

        $this->assertSame(
            'otpauth://totp/StoreAdmin:admin%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=StoreAdmin&algorithm=SHA1&digits=6&period=30',
            $uri
        );
    }

    public function test_calculate_totp_matches_rfc_6238_test_vectors(): void
    {
        // RFC 6238 Table 1 test vector for SHA1 (secret: "12345678901234567890" in ASCII = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" in Base32)
        $rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

        // T = 59 seconds (Time step 1) -> 287082
        $this->assertSame('287082', $this->service->calculateTotp($rfcSecret, 59));

        // T = 1111111109 seconds -> 081804
        $this->assertSame('081804', $this->service->calculateTotp($rfcSecret, 1111111109));

        // T = 1234567890 seconds -> 005924
        $this->assertSame('005924', $this->service->calculateTotp($rfcSecret, 1234567890));

        // T = 2000000000 seconds -> 279037
        $this->assertSame('279037', $this->service->calculateTotp($rfcSecret, 2000000000));
    }

    public function test_verify_validates_totp_within_drift_window(): void
    {
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $now = time();

        // Exact time code
        $code = $this->service->calculateTotp($secret, $now);
        $this->assertTrue($this->service->verify($secret, $code));

        // -30 seconds drift (window = 1)
        $driftMinus30 = $this->service->calculateTotp($secret, $now - 30);
        $this->assertTrue($this->service->verify($secret, $driftMinus30));

        // +30 seconds drift (window = 1)
        $driftPlus30 = $this->service->calculateTotp($secret, $now + 30);
        $this->assertTrue($this->service->verify($secret, $driftPlus30));

        // Beyond window (+90 seconds)
        $driftPlus90 = $this->service->calculateTotp($secret, $now + 90);
        $this->assertFalse($this->service->verify($secret, $driftPlus90));
    }

    public function test_verify_rejects_invalid_inputs(): void
    {
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

        $this->assertFalse($this->service->verify($secret, ''));
        $this->assertFalse($this->service->verify($secret, '12345'));
        $this->assertFalse($this->service->verify($secret, '1234567'));
        $this->assertFalse($this->service->verify($secret, 'abcdef'));
        $this->assertFalse($this->service->verify('', '123456'));
    }

    public function test_generate_recovery_codes_produces_expected_format_and_count(): void
    {
        $codes = $this->service->generateRecoveryCodes(8);

        $this->assertCount(8, $codes);
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression('/^[A-Z0-9]{5}-[A-Z0-9]{5}$/', $code);
        }
    }
}
