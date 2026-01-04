const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

class BackupService {
    constructor() {
        this.s3 = null;
        this.bucketName = process.env.AWS_S3_BUCKET;
        this.backupDir = path.join(__dirname, '../../backups');
        this.initialize();
    }

    initialize() {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            AWS.config.update({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            });

            this.s3 = new AWS.S3();
            logger.info('✅ AWS S3 backup service configured');
        } else {
            logger.warn('⚠️ AWS credentials not found, S3 backups disabled');
        }

        // Ensure backup directory exists
        fs.mkdir(this.backupDir, { recursive: true }).catch(console.error);
    }

    async createBackup(userId, type = 'full') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup-${timestamp}`;

        try {
            logger.info(`Creating ${type} backup: ${backupId}`);

            // Create backup directory
            const backupPath = path.join(this.backupDir, backupId);
            await fs.mkdir(backupPath, { recursive: true });

            // 1. Backup database
            const dbBackupFile = await this.backupDatabase(backupPath);

            // 2. Backup uploads and reports
            const uploadsBackupFile = await this.backupUploads(backupPath);

            // 3. Create metadata
            const metadata = {
                id: backupId,
                type,
                createdAt: new Date().toISOString(),
                createdBy: userId,
                files: {
                    database: dbBackupFile,
                    uploads: uploadsBackupFile
                },
                size: await this.getFolderSize(backupPath)
            };

            // Save metadata
            await fs.writeFile(
                path.join(backupPath, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            // 4. Upload to S3 if configured
            let s3Location = null;
            if (this.s3 && this.bucketName) {
                s3Location = await this.uploadToS3(backupId, backupPath);
            }

            // 5. Record backup in database
            const backupRecord = await prisma.backup.create({
                data: {
                    backupId,
                    type,
                    size: metadata.size,
                    location: s3Location || `local:${backupPath}`,
                    status: 'completed',
                    createdById: userId,
                    metadata: metadata
                }
            });

            // 6. Cleanup old backups (keep last 30)
            await this.cleanupOldBackups();

            logger.info(`✅ Backup created successfully: ${backupId}`);

            return {
                success: true,
                backupId,
                backupRecord,
                localPath: backupPath,
                s3Location,
                size: metadata.size
            };

        } catch (error) {
            logger.error('❌ Backup creation failed:', error);

            // Record failed backup
            await prisma.backup.create({
                data: {
                    backupId,
                    type,
                    status: 'failed',
                    createdById: userId,
                    error: error.message
                }
            });

            throw error;
        }
    }

    async backupDatabase(backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `database-${timestamp}.sql`;
        const filepath = path.join(backupPath, filename);

        try {
            // Extract database connection info
            const dbUrl = new URL(process.env.DATABASE_URL);
            const dbName = dbUrl.pathname.substring(1);
            const dbHost = dbUrl.hostname;
            const dbPort = dbUrl.port || 5432;
            const dbUser = dbUrl.username;
            const dbPass = dbUrl.password;

            // Create backup using pg_dump
            const command = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f ${filepath}`;

            await execPromise(command);

            logger.info(`✅ Database backup created: ${filename}`);
            return filename;

        } catch (error) {
            logger.error('❌ Database backup failed:', error);
            throw new Error(`Database backup failed: ${error.message}`);
        }
    }

    async backupUploads(backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `uploads-${timestamp}.tar.gz`;
        const filepath = path.join(backupPath, filename);

        try {
            const uploadsDir = path.join(__dirname, '../../reports');
            const logsDir = path.join(__dirname, '../../logs');

            // Create tar archive
            const command = `tar -czf ${filepath} ${uploadsDir} ${logsDir} 2>/dev/null || echo "No uploads to backup"`;

            await execPromise(command);

            // Check if file was created
            try {
                await fs.access(filepath);
                logger.info(`✅ Uploads backup created: ${filename}`);
                return filename;
            } catch {
                logger.info('⚠️ No uploads to backup');
                return null;
            }

        } catch (error) {
            logger.error('❌ Uploads backup failed:', error);
            return null;
        }
    }

    async uploadToS3(backupId, backupPath) {
        if (!this.s3 || !this.bucketName) {
            return null;
        }

        try {
            // Upload entire backup folder
            const files = await fs.readdir(backupPath);

            for (const file of files) {
                const filePath = path.join(backupPath, file);
                const fileContent = await fs.readFile(filePath);

                const params = {
                    Bucket: this.bucketName,
                    Key: `backups/${backupId}/${file}`,
                    Body: fileContent,
                    StorageClass: 'STANDARD_IA' // Lower cost for backups
                };

                await this.s3.upload(params).promise();
                logger.info(`✅ Uploaded to S3: ${file}`);
            }

            const s3Location = `s3://${this.bucketName}/backups/${backupId}`;
            logger.info(`✅ Backup uploaded to S3: ${s3Location}`);

            return s3Location;

        } catch (error) {
            logger.error('❌ S3 upload failed:', error);
            throw error;
        }
    }

    async restoreBackup(backupId, userId) {
        try {
            logger.info(`Restoring backup: ${backupId}`);

            // Get backup record
            const backup = await prisma.backup.findUnique({
                where: { backupId }
            });

            if (!backup) {
                throw new Error(`Backup ${backupId} not found`);
            }

            // Download from S3 if needed
            let backupPath;
            if (backup.location.startsWith('s3://')) {
                backupPath = await this.downloadFromS3(backupId);
            } else {
                backupPath = backup.location.replace('local:', '');
            }

            // Check if backup files exist
            const metadataPath = path.join(backupPath, 'metadata.json');
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

            // Restore database
            if (metadata.files.database) {
                await this.restoreDatabase(backupPath, metadata.files.database);
            }

            // Restore uploads
            if (metadata.files.uploads) {
                await this.restoreUploads(backupPath, metadata.files.uploads);
            }

            // Record restoration
            await prisma.backup.update({
                where: { id: backup.id },
                data: {
                    restoredAt: new Date(),
                    restoredById: userId
                }
            });

            // Log restoration in audit trail
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'BACKUP_RESTORED',
                    details: { backupId, metadata },
                    ipAddress: '127.0.0.1' // Would be actual IP in production
                }
            });

            logger.info(`✅ Backup restored successfully: ${backupId}`);

            return {
                success: true,
                backupId,
                restoredAt: new Date().toISOString(),
                restoredBy: userId
            };

        } catch (error) {
            logger.error('❌ Backup restoration failed:', error);

            // Record failure
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'BACKUP_RESTORE_FAILED',
                    details: { backupId, error: error.message },
                    ipAddress: '127.0.0.1'
                }
            });

            throw error;
        }
    }

    async downloadFromS3(backupId) {
        if (!this.s3 || !this.bucketName) {
            throw new Error('S3 not configured');
        }

        const downloadPath = path.join(this.backupDir, `download-${backupId}`);
        await fs.mkdir(downloadPath, { recursive: true });

        try {
            // List files in S3 backup folder
            const listParams = {
                Bucket: this.bucketName,
                Prefix: `backups/${backupId}/`
            };

            const objects = await this.s3.listObjectsV2(listParams).promise();

            // Download each file
            for (const object of objects.Contents) {
                const key = object.Key;
                const filename = path.basename(key);
                const filepath = path.join(downloadPath, filename);

                const getParams = {
                    Bucket: this.bucketName,
                    Key: key
                };

                const data = await this.s3.getObject(getParams).promise();
                await fs.writeFile(filepath, data.Body);

                logger.info(`✅ Downloaded from S3: ${filename}`);
            }

            return downloadPath;

        } catch (error) {
            logger.error('❌ S3 download failed:', error);
            throw error;
        }
    }

    async restoreDatabase(backupPath, dbFile) {
        const filepath = path.join(backupPath, dbFile);

        try {
            // Extract database connection info
            const dbUrl = new URL(process.env.DATABASE_URL);
            const dbName = dbUrl.pathname.substring(1);
            const dbHost = dbUrl.hostname;
            const dbPort = dbUrl.port || 5432;
            const dbUser = dbUrl.username;
            const dbPass = dbUrl.password;

            // Drop and recreate database
            const dropCommand = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`;
            const createCommand = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`;

            await execPromise(dropCommand);
            await execPromise(createCommand);

            // Restore from backup
            const restoreCommand = `PGPASSWORD="${dbPass}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c ${filepath}`;

            await execPromise(restoreCommand);

            logger.info('✅ Database restored successfully');

        } catch (error) {
            logger.error('❌ Database restoration failed:', error);
            throw new Error(`Database restoration failed: ${error.message}`);
        }
    }

    async restoreUploads(backupPath, uploadsFile) {
        const filepath = path.join(backupPath, uploadsFile);

        try {
            await fs.access(filepath);

            // Extract tar archive
            const uploadsDir = path.join(__dirname, '../../');
            const command = `tar -xzf ${filepath} -C ${uploadsDir}`;

            await execPromise(command);

            logger.info('✅ Uploads restored successfully');

        } catch (error) {
            logger.warn('⚠️ Uploads restoration skipped (no uploads file)');
        }
    }

    async cleanupOldBackups() {
        try {
            // Keep only last 30 backups in database
            const backups = await prisma.backup.findMany({
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });

            if (backups.length > 30) {
                const toDelete = backups.slice(30);
                const deleteIds = toDelete.map(b => b.id);

                await prisma.backup.deleteMany({
                    where: { id: { in: deleteIds } }
                });

                logger.info(`🧹 Cleaned up ${toDelete.length} old backup records`);
            }

            // Cleanup local backup files older than 7 days
            const files = await fs.readdir(this.backupDir);
            const now = Date.now();
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory() && stats.birthtimeMs < sevenDaysAgo) {
                    await fs.rm(filePath, { recursive: true });
                    logger.info(`🧹 Deleted old local backup: ${file}`);
                }
            }

        } catch (error) {
            logger.error('❌ Backup cleanup failed:', error);
        }
    }

    async getFolderSize(folderPath) {
        try {
            const command = `du -sb ${folderPath} | cut -f1`;
            const { stdout } = await execPromise(command);
            return parseInt(stdout.trim());
        } catch (error) {
            return 0;
        }
    }

    async listBackups() {
        try {
            const backups = await prisma.backup.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: {
                        select: {
                            fullName: true,
                            psnNumber: true
                        }
                    },
                    restoredBy: {
                        select: {
                            fullName: true
                        }
                    }
                }
            });

            // Add size in human readable format
            return backups.map(backup => ({
                ...backup,
                sizeFormatted: this.formatSize(backup.size)
            }));

        } catch (error) {
            logger.error('❌ Failed to list backups:', error);
            return [];
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async getBackupStats() {
        try {
            const totalBackups = await prisma.backup.count();
            const totalSize = await prisma.backup.aggregate({
                _sum: { size: true }
            });
            const lastBackup = await prisma.backup.findFirst({
                orderBy: { createdAt: 'desc' }
            });

            return {
                totalBackups,
                totalSize: totalSize._sum.size || 0,
                totalSizeFormatted: this.formatSize(totalSize._sum.size || 0),
                lastBackup: lastBackup?.createdAt,
                s3Configured: !!(this.s3 && this.bucketName)
            };

        } catch (error) {
            logger.error('❌ Failed to get backup stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const backupService = new BackupService();

module.exports = backupService;