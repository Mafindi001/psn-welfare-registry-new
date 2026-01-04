const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { generateReport, exportData } = require('../services/reportService');
const { createBackup, restoreBackup } = require('../services/backupService');
const { sendBulkEmails } = require('../services/emailService');

// Apply auth and admin middleware to all routes
router.use(auth, adminOnly);

// Dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await prisma.$transaction([
            prisma.member.count(),
            prisma.member.count({ where: { isActive: true } }),
            prisma.specialDate.count({
                where: {
                    date: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma.reminderLog.count(),
            prisma.member.count({
                where: {
                    lastLogin: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        res.json({
            totalMembers: stats[0],
            activeMembers: stats[1],
            upcomingCelebrations: stats[2],
            remindersSent: stats[3],
            activeUsers24h: stats[4],
            systemHealth: 'healthy'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all members with pagination and filters
router.get('/members', async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, isAdmin } = req.query;
        const skip = (page - 1) * limit;

        const where = {};

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { psnNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status) where.status = status;
        if (isAdmin !== undefined) where.isAdmin = isAdmin === 'true';

        const [members, total] = await prisma.$transaction([
            prisma.member.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    psnNumber: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    status: true,
                    isAdmin: true,
                    createdAt: true,
                    lastLogin: true
                }
            }),
            prisma.member.count({ where })
        ]);

        res.json({
            data: members,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate reports
router.post('/reports/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const params = req.body;

        const report = await generateReport(type, params);

        // Log report generation
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'REPORT_GENERATED',
                entityType: 'Report',
                details: { type, params }
            }
        });

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk email sending
router.post('/bulk/emails', async (req, res) => {
    try {
        const { templateType, subject, body, members, sendCopyToAdmin } = req.body;

        const result = await sendBulkEmails({
            templateType,
            subject,
            body,
            members,
            sendCopyToAdmin,
            senderId: req.user.id
        });

        // Log bulk action
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'BULK_EMAIL_SENT',
                details: {
                    templateType,
                    sentCount: result.sentCount,
                    memberCount: members.length
                }
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create backup
router.post('/backup', async (req, res) => {
    try {
        const backup = await createBackup(req.user.id);
        res.json(backup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, search } = req.query;
        const skip = (page - 1) * limit;

        const where = {};

        if (action) where.action = action;
        if (search) {
            where.OR = [
                { userName: { contains: search, mode: 'insensitive' } },
                { details: { path: '$', string_contains: search } }
            ];
        }

        const [logs, total] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: {
                            fullName: true,
                            psnNumber: true
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        res.json({
            data: logs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Real-time monitoring endpoint
router.get('/monitoring/active-users', async (req, res) => {
    try {
        // Get users active in last 15 minutes
        const activeUsers = await prisma.member.findMany({
            where: {
                lastActivity: {
                    gte: new Date(Date.now() - 15 * 60 * 1000)
                },
                isActive: true
            },
            select: {
                id: true,
                fullName: true,
                psnNumber: true,
                lastActivity: true,
                isAdmin: true
            }
        });

        res.json(activeUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;