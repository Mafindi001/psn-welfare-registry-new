const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = {};
        this.initialize();
    }

    async initialize() {
        try {
            // Create transporter
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service configured successfully');

            // Load email templates
            await this.loadTemplates();

        } catch (error) {
            console.error('❌ Email service configuration failed:', error.message);
            // Fallback to console logging in development
            if (process.env.NODE_ENV === 'development') {
                this.setupDevelopmentFallback();
            }
        }
    }

    async loadTemplates() {
        const templatesDir = path.join(__dirname, '../templates/email');

        try {
            await fs.access(templatesDir);
            const files = await fs.readdir(templatesDir);

            for (const file of files) {
                if (file.endsWith('.hbs')) {
                    const templateName = path.basename(file, '.hbs');
                    const templateContent = await fs.readFile(
                        path.join(templatesDir, file),
                        'utf-8'
                    );
                    this.templates[templateName] = handlebars.compile(templateContent);
                }
            }

            console.log(`✅ Loaded ${Object.keys(this.templates).length} email templates`);
        } catch (error) {
            console.warn('⚠️ No email templates directory found, using default templates');
            this.createDefaultTemplates();
        }
    }

    createDefaultTemplates() {
        // Welcome email template
        this.templates.welcome = handlebars.compile(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PSN Taraba Welfare Registry</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .button { display: inline-block; background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .credentials { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Pharmaceutical Society of Nigeria</h1>
        <h2>Taraba State Chapter - Welfare Registry</h2>
    </div>
    
    <div class="content">
        <h2>Welcome, {{name}}!</h2>
        
        <p>Your account has been successfully created in the PSN Taraba Welfare Digital Registry.</p>
        
        <div class="credentials">
            <p><strong>Your Login Details:</strong></p>
            <p>Email: {{email}}</p>
            <p>PSN Number: {{psnNumber}}</p>
            {{#if temporaryPassword}}
            <p>Temporary Password: {{temporaryPassword}}</p>
            <p><em>Please change your password after first login.</em></p>
            {{/if}}
        </div>
        
        <p>To access your account, click the button below:</p>
        
        <a href="{{loginUrl}}" class="button">Login to Your Account</a>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Complete your profile information</li>
            <li>Add your special dates (birthdays, anniversaries)</li>
            <li>Set up next-of-kin contacts</li>
            <li>Configure reminder preferences</li>
        </ol>
        
        <p>This platform will help us celebrate your special occasions and ensure we can reach you for welfare matters.</p>
        
        <p><strong>Important:</strong> Your data is protected in accordance with the Nigeria Data Protection Act (NDPA).</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message from the PSN Taraba Welfare Registry System.</p>
        <p>Pharmaceutical Society of Nigeria, Taraba State Chapter<br>
           Welfare Secretary's Office<br>
           Email: welfare@psntaraba.org.ng</p>
        <p>If you did not create this account, please contact us immediately.</p>
    </div>
</body>
</html>
        `);

        // Reminder email template
        this.templates.reminder = handlebars.compile(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reminder: {{eventTitle}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #34a853; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-card { background: white; border: 2px solid #34a853; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PSN Taraba - Special Date Reminder</h1>
    </div>
    
    <div class="content">
        <h2>Reminder: {{eventTitle}}</h2>
        
        <div class="event-card">
            <h3>{{memberName}}'s {{eventType}}</h3>
            <p><strong>Date:</strong> {{eventDate}}</p>
            <p><strong>Days until event:</strong> {{daysUntil}} days</p>
            
            {{#if message}}
            <p><strong>Message:</strong> {{message}}</p>
            {{/if}}
        </div>
        
        <p>This is an automated reminder from the PSN Taraba Welfare Registry.</p>
        <p>We celebrate our members and their special moments together as a professional family.</p>
        
        <p><em>Note: This reminder was sent 24 hours before the event as per your preferences.</em></p>
    </div>
    
    <div class="footer">
        <p>Pharmaceutical Society of Nigeria, Taraba State Chapter - Welfare Registry</p>
        <p>To update your reminder preferences, login to your account.</p>
    </div>
</body>
</html>
        `);
    }

    setupDevelopmentFallback() {
        console.log('📧 Using development email fallback (emails will be logged to console)');

        this.transporter = {
            sendMail: async (mailOptions) => {
                console.log('📧 Email would be sent:');
                console.log('To:', mailOptions.to);
                console.log('Subject:', mailOptions.subject);
                console.log('HTML Preview:', mailOptions.html?.substring(0, 200) + '...');

                // Save to file for review
                const fs = require('fs');
                const path = require('path');
                const emailDir = path.join(__dirname, '../../emails');

                if (!fs.existsSync(emailDir)) {
                    fs.mkdirSync(emailDir, { recursive: true });
                }

                const filename = `email_${Date.now()}.html`;
                fs.writeFileSync(
                    path.join(emailDir, filename),
                    mailOptions.html || mailOptions.text
                );

                console.log(`📁 Email saved to: emails/${filename}`);

                return { messageId: 'dev-' + Date.now() };
            }
        };
    }

    async sendEmail(to, subject, templateName, data = {}) {
        try {
            const template = this.templates[templateName];

            if (!template) {
                throw new Error(`Template "${templateName}" not found`);
            }

            const html = template({
                ...data,
                year: new Date().getFullYear(),
                baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                supportEmail: 'welfare@psntaraba.org.ng'
            });

            const mailOptions = {
                from: `"PSN Taraba Welfare" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to,
                subject,
                html,
                text: this.htmlToText(html)
            };

            const info = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Email sent to ${to}: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                to,
                subject
            };

        } catch (error) {
            console.error('❌ Email sending failed:', error.message);

            // Log error but don't crash the application
            return {
                success: false,
                error: error.message,
                to,
                subject
            };
        }
    }

    async sendBulkEmails(recipients, subject, templateName, data = {}) {
        const results = [];

        for (const recipient of recipients) {
            try {
                const result = await this.sendEmail(
                    recipient.email,
                    subject,
                    templateName,
                    { ...data, ...recipient.variables }
                );
                results.push(result);

                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    to: recipient.email
                });
            }
        }

        return {
            total: recipients.length,
            sent: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    async sendWelcomeEmail(member, temporaryPassword = null) {
        return this.sendEmail(
            member.email,
            'Welcome to PSN Taraba Welfare Registry',
            'welcome',
            {
                name: member.fullName,
                email: member.email,
                psnNumber: member.psnNumber,
                temporaryPassword,
                loginUrl: `${process.env.FRONTEND_URL}/pages/login.html`
            }
        );
    }

    async sendReminderEmail(reminderData) {
        return this.sendEmail(
            reminderData.recipientEmail,
            `Reminder: ${reminderData.eventTitle}`,
            'reminder',
            {
                memberName: reminderData.memberName,
                eventType: reminderData.eventType,
                eventTitle: reminderData.eventTitle,
                eventDate: new Date(reminderData.eventDate).toLocaleDateString(),
                daysUntil: reminderData.daysUntil,
                message: reminderData.message
            }
        );
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;