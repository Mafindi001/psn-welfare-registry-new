const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty'
});

// Connection test
async function testConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Create admin user if doesn't exist
        await ensureAdminUser();

        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Ensure admin user exists
async function ensureAdminUser() {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPSN = process.env.DEFAULT_ADMIN_PSN;

    if (!adminEmail || !adminPSN) return;

    const existingAdmin = await prisma.member.findUnique({
        where: { email: adminEmail }
    });

    if (!existingAdmin) {
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(
            process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeThis123!',
            12
        );

        await prisma.member.create({
            data: {
                psnNumber: adminPSN,
                email: adminEmail,
                passwordHash,
                fullName: 'System Administrator',
                phone: '+2348000000000',
                isAdmin: true,
                consentGiven: true,
                consentDate: new Date(),
                isActive: true
            }
        });

        console.log('✅ Default admin user created');
    }
}

// Database backup function
async function backupDatabase() {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sql`;

    try {
        // Extract database connection info
        const dbUrl = new URL(process.env.DATABASE_URL);
        const dbName = dbUrl.pathname.substring(1);
        const dbHost = dbUrl.hostname;
        const dbPort = dbUrl.port || 5432;
        const dbUser = dbUrl.username;
        const dbPass = dbUrl.password;

        // Create backup using pg_dump
        const command = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f ${backupFile}`;

        await execPromise(command);
        console.log(`✅ Database backup created: ${backupFile}`);

        return backupFile;
    } catch (error) {
        console.error('❌ Database backup failed:', error);
        throw error;
    }
}

module.exports = { prisma, testConnection, backupDatabase, ensureAdminUser };