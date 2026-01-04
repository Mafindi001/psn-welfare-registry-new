const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { prisma } = require('../config/database');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class TwoFactorService {
    constructor() {
        this.issuer = 'PSN Taraba Welfare';
    }

    // Generate secret for a user
    async generateSecret(userId) {
        try {
            const secret = speakeasy.generateSecret({
                length: 20,
                name: `${this.issuer} (${userId})`,
                issuer: this.issuer
            });

            // Save secret to database (encrypted in production)
            await prisma.twoFactorSecret.upsert({
                where: { userId },
                update: {
                    secret: secret.base32,
                    tempSecret: null,
                    tempSecretExpiry: null
                },
                create: {
                    userId,
                    secret: secret.base32,
                    enabled: false
                }
            });

            // Generate QR code URL
            const otpauthUrl = secret.otpauth_url;

            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

            return {
                success: true,
                secret: secret.base32,
                otpauthUrl,
                qrCodeDataUrl
            };

        } catch (error) {
            logger.error('2FA secret generation failed:', error);
            throw error;
        }
    }

    // Verify token
    async verifyToken(userId, token) {
        try {
            const twoFactorData = await prisma.twoFactorSecret.findUnique({
                where: { userId }
            });

            if (!twoFactorData || !twoFactorData.secret) {
                throw new Error('2FA not set up for this user');
            }

            const verified = speakeasy.totp.verify({
                secret: twoFactorData.secret,
                encoding: 'base32',
                token: token,
                window: 1 // Allow 30 seconds before and after
            });

            if (verified) {
                // Log successful verification
                await prisma.auditLog.create({
                    data: {
                        userId,
                        action: '2FA_VERIFIED',
                        details: { method: 'TOTP' },
                        ipAddress: '127.0.0.1' // Would be actual IP
                    }
                });

                return { success: true };
            }

            return {
                success: false,
                error: 'Invalid verification code'
            };

        } catch (error) {
            logger.error('2FA token verification failed:', error);
            throw error;
        }
    }

    // Enable 2FA for a user
    async enable2FA(userId, token) {
        try {
            // First verify the token
            const verification = await this.verifyToken(userId, token);

            if (!verification.success) {
                return verification;
            }

            // Enable 2FA
            await prisma.twoFactorSecret.update({
                where: { userId },
                data: {
                    enabled: true,
                    enabledAt: new Date()
                }
            });

            // Update user record
            await prisma.member.update({
                where: { id: userId },
                data: { requires2FA: true }
            });

            // Send confirmation email
            const user = await prisma.member.findUnique({
                where: { id: userId },
                select: { email: true, fullName: true }
            });

            if (user) {
                await emailService.sendEmail(
                    user.email,
                    'Two-Factor Authentication Enabled',
                    '2fa_enabled',
                    {
                        name: user.fullName,
                        timestamp: new Date().toLocaleString(),
                        supportEmail: 'security@psntaraba.org.ng'
                    }
                );
            }

            // Log enabling
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: '2FA_ENABLED',
                    details: { method: 'TOTP' },
                    ipAddress: '127.0.0.1'
                }
            });

            logger.info(`✅ 2FA enabled for user ${userId}`);

            return { success: true };

        } catch (error) {
            logger.error('2FA enabling failed:', error);
            throw error;
        }
    }

    // Disable 2FA for a user
    async disable2FA(userId, adminId = null) {
        try {
            await prisma.twoFactorSecret.update({
                where: { userId },
                data: {
                    enabled: false,
                    disabledAt: new Date(),
                    disabledBy: adminId
                }
            });

            await prisma.member.update({
                where: { id: userId },
                data: { requires2FA: false }
            });

            // Send notification email
            const user = await prisma.member.findUnique({
                where: { id: userId },
                select: { email: true, fullName: true }
            });

            if (user) {
                await emailService.sendEmail(
                    user.email,
                    'Two-Factor Authentication Disabled',
                    '2fa_disabled',
                    {
                        name: user.fullName,
                        timestamp: new Date().toLocaleString(),
                        disabledByAdmin: !!adminId,
                        supportEmail: 'security@psntaraba.org.ng'
                    }
                );
            }

            // Log disabling
            await prisma.auditLog.create({
                data: {
                    userId: adminId || userId,
                    action: '2FA_DISABLED',
                    details: { targetUserId: userId, byAdmin: !!adminId },
                    ipAddress: '127.0.0.1'
                }
            });

            logger.info(`✅ 2FA disabled for user ${userId}`);

            return { success: true };

        } catch (error) {
            logger.error('2FA disabling failed:', error);
            throw error;
        }
    }

    // Generate backup codes
    async generateBackupCodes(userId) {
        try {
            const codes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substring(2, 10).toUpperCase()
            );

            // Hash codes before storing (in production)
            const hashedCodes = codes.map(code => this.hashCode(code));

            await prisma.twoFactorBackupCode.createMany({
                data: hashedCodes.map(hash => ({
                    userId,
                    codeHash: hash,
                    used: false
                }))
            });

            // Return plain codes for user to save
            return {
                success: true,
                codes,
                generatedAt: new Date().toISOString(),
                note: 'Save these codes in a secure place. Each code can be used once.'
            };

        } catch (error) {
            logger.error('Backup code generation failed:', error);
            throw error;
        }
    }

    // Verify backup code
    async verifyBackupCode(userId, code) {
        try {
            const backupCodes = await prisma.twoFactorBackupCode.findMany({
                where: {
                    userId,
                    used: false
                }
            });

            // Find matching code
            for (const backupCode of backupCodes) {
                if (this.verifyHash(code, backupCode.codeHash)) {
                    // Mark as used
                    await prisma.twoFactorBackupCode.update({
                        where: { id: backupCode.id },
                        data: {
                            used: true,
                            usedAt: new Date()
                        }
                    });

                    // Log usage
                    await prisma.auditLog.create({
                        data: {
                            userId,
                            action: '2FA_BACKUP_USED',
                            details: { codeId: backupCode.id },
                            ipAddress: '127.0.0.1'
                        }
                    });

                    return { success: true, codeId: backupCode.id };
                }
            }

            return { success: false, error: 'Invalid backup code' };

        } catch (error) {
            logger.error('Backup code verification failed:', error);
            throw error;
        }
    }

    // Send SMS code (alternative method)
    async sendSmsCode(userId, phoneNumber) {
        try {
            // Generate 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // Store code (with expiry)
            await prisma.twoFactorSmsCode.create({
                data: {
                    userId,
                    code,
                    phoneNumber,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
                }
            });

            // In production, integrate with SMS service like Twilio
            console.log(`SMS code for ${phoneNumber}: ${code}`);

            // Log sending
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: '2FA_SMS_SENT',
                    details: { phoneNumber: this.maskPhone(phoneNumber) },
                    ipAddress: '127.0.0.1'
                }
            });

            return {
                success: true,
                message: 'SMS code sent (simulated in development)',
                code: process.env.NODE_ENV === 'development' ? code : undefined
            };

        } catch (error) {
            logger.error('SMS code sending failed:', error);
            throw error;
        }
    }

    // Verify SMS code
    async verifySmsCode(userId, code) {
        try {
            const smsCode = await prisma.twoFactorSmsCode.findFirst({
                where: {
                    userId,
                    code,
                    expiresAt: { gt: new Date() },
                    used: false
                }
            });

            if (!smsCode) {
                return { success: false, error: 'Invalid or expired SMS code' };
            }

            // Mark as used
            await prisma.twoFactorSmsCode.update({
                where: { id: smsCode.id },
                data: {
                    used: true,
                    usedAt: new Date()
                }
            });

            // Log verification
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: '2FA_SMS_VERIFIED',
                    details: { phoneNumber: this.maskPhone(smsCode.phoneNumber) },
                    ipAddress: '127.0.0.1'
                }
            });

            return { success: true };

        } catch (error) {
            logger.error('SMS code verification failed:', error);
            throw error;
        }
    }

    // Get 2FA status for user
    async getStatus(userId) {
        try {
            const twoFactorData = await prisma.twoFactorSecret.findUnique({
                where: { userId },
                include: {
                    backupCodes: {
                        where: { used: false },
                        select: { id: true, createdAt: true }
                    }
                }
            });

            if (!twoFactorData) {
                return { enabled: false, method: 'none' };
            }

            return {
                enabled: twoFactorData.enabled,
                method: 'TOTP',
                backupCodes: {
                    count: twoFactorData.backupCodes.length,
                    lastGenerated: twoFactorData.backupCodes[0]?.createdAt
                },
                enabledAt: twoFactorData.enabledAt,
                requires2FA: twoFactorData.enabled
            };

        } catch (error) {
            logger.error('Failed to get 2FA status:', error);
            throw error;
        }
    }

    // Helper: Hash code (simplified - use bcrypt in production)
    hashCode(code) {
        return require('crypto')
            .createHash('sha256')
            .update(code + process.env.JWT_SECRET)
            .digest('hex');
    }

    // Helper: Verify hash
    verifyHash(code, hash) {
        return this.hashCode(code) === hash;
    }

    // Helper: Mask phone number
    maskPhone(phone) {
        if (!phone || phone.length < 4) return '***';
        return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
    }
}

// Create singleton instance
const twoFactorService = new TwoFactorService();

module.exports = twoFactorService;