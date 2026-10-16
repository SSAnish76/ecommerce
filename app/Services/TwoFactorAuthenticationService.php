<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorAuthenticationService
{
    public function __construct(
        protected Google2FA $google2fa = new Google2FA
    ) {}

    /**
     * Generate a cryptographically secure Base32 secret key.
     */
    public function generateSecretKey(int $length = 32): string
    {
        return $this->google2fa->generateSecretKey($length);
    }

    /**
     * Format secret key into readable 4-character chunks for manual entry.
     */
    public function formatSecretKey(string $secret): string
    {
        return trim(chunk_split(strtoupper($secret), 4, ' '));
    }

    /**
     * Generate standard otpauth:// URI compatible with authenticator apps.
     */
    public function getQrCodeUri(string $issuer, string $accountName, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl($issuer, $accountName, $this->cleanBase32($secret));
    }

    /**
     * Generate complete setup data for a user including secrets and QR codes.
     *
     * @return array{
     *     secret: string,
     *     formatted_secret: string,
     *     qr_code_svg: string,
     *     qr_code_url: string,
     *     otp_auth_uri: string
     * }
     */
    public function generateSetupData(User $user, ?string $secret = null): array
    {
        $secret ??= $this->generateSecretKey();
        $issuer = Store::query()->value('name') ?: (string) config('app.name', 'E-Commerce');
        $otpAuthUri = $this->getQrCodeUri($issuer, (string) $user->email, $secret);

        return [
            'secret' => $secret,
            'formatted_secret' => $this->formatSecretKey($secret),
            'qr_code_svg' => QrCodeService::generateSvg($otpAuthUri, 220),
            'qr_code_url' => QrCodeService::generateSvgDataUri($otpAuthUri, 220),
            'otp_auth_uri' => $otpAuthUri,
        ];
    }

    /**
     * Calculate 6-digit TOTP code for a secret at a given timestamp.
     */
    public function calculateTotp(string $secret, ?int $timestamp = null): string
    {
        $timestamp ??= time();
        $counter = intdiv($timestamp, 30);

        return $this->google2fa->oathTotp($this->cleanBase32($secret), $counter);
    }

    /**
     * Verify a 6-digit TOTP code against a secret key within a time window.
     */
    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $cleanCode = trim($code);
        if (strlen($cleanCode) !== 6 || ! ctype_digit($cleanCode)) {
            return false;
        }

        $cleanSecret = $this->cleanBase32($secret);
        if ($cleanSecret === '') {
            return false;
        }

        try {
            return (bool) $this->google2fa->verifyKey($cleanSecret, $cleanCode, $window);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Verify a 2FA challenge using either TOTP code or recovery code.
     *
     * @return array{valid: bool, used_recovery_code: bool}
     */
    public function verifyChallenge(User $user, ?string $code, ?string $recoveryCode): array
    {
        if (filled($code)) {
            $valid = $this->verify((string) ($user->two_factor_secret ?? ''), (string) $code);

            return [
                'valid' => $valid,
                'used_recovery_code' => false,
            ];
        }

        if (filled($recoveryCode)) {
            $valid = $this->verifyAndConsumeRecoveryCode($user, (string) $recoveryCode);

            return [
                'valid' => $valid,
                'used_recovery_code' => $valid,
            ];
        }

        return [
            'valid' => false,
            'used_recovery_code' => false,
        ];
    }

    /**
     * Enable 2FA on a user account with confirmed secret and fresh recovery codes.
     *
     * @param  array<int, string>|null  $recoveryCodes
     * @return array<int, string>
     */
    public function enable(User $user, string $secret, ?array $recoveryCodes = null): array
    {
        $codes = $recoveryCodes ?? $this->generateRecoveryCodes();

        $user->{'2fa_secret'} = $secret;
        $user->{'2fa_confirmed_at'} = now();
        $user->is_2fa = true;
        $this->storeRecoveryCodes($user, $codes);

        return $codes;
    }

    /**
     * Disable 2FA on a user account and clear associated secrets and codes.
     */
    public function disable(User $user): void
    {
        $user->{'2fa_secret'} = null;
        $user->{'2fa_recovery_codes'} = null;
        $user->{'2fa_confirmed_at'} = null;
        $user->is_2fa = false;
        $user->save();
    }

    /**
     * Generate an array of secure 10-character backup recovery codes.
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        return Collection::times($count, static fn (): string => Str::upper(Str::random(5)).'-'.Str::upper(Str::random(5)))->all();
    }

    /**
     * Regenerate new recovery codes for the user and save them immediately.
     *
     * @return array<int, string>
     */
    public function regenerateRecoveryCodesForUser(User $user, int $count = 8): array
    {
        $newCodes = $this->generateRecoveryCodes($count);
        $this->storeRecoveryCodes($user, $newCodes);

        return $newCodes;
    }

    /**
     * Verify and consume a recovery code for a user.
     */
    public function verifyAndConsumeRecoveryCode(User $user, string $code): bool
    {
        $cleanCode = strtoupper(trim($code));
        $storedCodes = $this->getRecoveryCodesForUser($user);

        if ($storedCodes === []) {
            return false;
        }

        foreach ($storedCodes as $index => $existingCode) {
            if (hash_equals(strtoupper(trim($existingCode)), $cleanCode)) {
                unset($storedCodes[$index]);
                $this->storeRecoveryCodes($user, array_values($storedCodes));

                return true;
            }
        }

        return false;
    }

    /**
     * Store recovery codes for the user.
     *
     * @param  array<int, string>  $codes
     */
    public function storeRecoveryCodes(User $user, array $codes): void
    {
        $user->two_factor_recovery_codes = json_encode(array_values($codes), JSON_THROW_ON_ERROR);
        $user->save();
    }

    /**
     * Get array of recovery codes for a user.
     *
     * @return array<int, string>
     */
    public function getRecoveryCodesForUser(User $user): array
    {
        $raw = $user->two_factor_recovery_codes;

        if (empty($raw)) {
            return [];
        }

        if (is_array($raw)) {
            return $raw;
        }

        if (is_string($raw) && json_validate($raw)) {
            /** @var array<int, string> $decoded */
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * Sanitize Base32 string by stripping invalid characters and converting to uppercase.
     */
    private function cleanBase32(string $secret): string
    {
        return strtoupper((string) preg_replace('/[^A-Z2-7]/', '', $secret));
    }
}
