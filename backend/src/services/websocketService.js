const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // userId -> WebSocket connection
        this.rooms = new Map(); // roomId -> Set of clientIds
    }

    setup(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/ws',
            clientTracking: true
        });

        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });

        logger.info('✅ WebSocket server started');
        return this.wss;
    }

    async handleConnection(ws, request) {
        try {
            // Extract token from query parameters
            const url = new URL(request.url, `http://${request.headers.host}`);
            const token = url.searchParams.get('token');

            if (!token) {
                ws.close(1008, 'Authentication required');
                return;
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId;

            // Store connection
            this.clients.set(userId, ws);
            logger.info(`🔗 WebSocket connected: User ${userId}`);

            // Send welcome message
            this.sendToUser(userId, {
                type: 'CONNECTED',
                message: 'WebSocket connection established',
                timestamp: new Date().toISOString()
            });

            // Handle messages
            ws.on('message', (data) => {
                this.handleMessage(userId, data);
            });

            // Handle disconnection
            ws.on('close', () => {
                this.handleDisconnection(userId);
            });

            // Handle errors
            ws.on('error', (error) => {
                logger.error(`WebSocket error for user ${userId}:`, error);
                this.handleDisconnection(userId);
            });

            // Subscribe to user's rooms
            await this.subscribeToRooms(userId);

        } catch (error) {
            logger.error('WebSocket connection error:', error);
            ws.close(1008, 'Authentication failed');
        }
    }

    async subscribeToRooms(userId) {
        try {
            // Get user details
            const user = await prisma.member.findUnique({
                where: { id: userId },
                select: { isAdmin: true }
            });

            // Always subscribe to user's personal room
            this.joinRoom(userId, `user:${userId}`);

            // If admin, subscribe to admin rooms
            if (user?.isAdmin) {
                this.joinRoom(userId, 'admin:dashboard');
                this.joinRoom(userId, 'admin:notifications');
                this.joinRoom(userId, 'admin:audit');
            }

            // Subscribe to system broadcasts
            this.joinRoom(userId, 'system:broadcast');

        } catch (error) {
            logger.error(`Failed to subscribe rooms for user ${userId}:`, error);
        }
    }

    handleMessage(userId, data) {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'PING':
                    this.sendToUser(userId, { type: 'PONG', timestamp: new Date().toISOString() });
                    break;

                case 'SUBSCRIBE':
                    if (message.room) {
                        this.joinRoom(userId, message.room);
                    }
                    break;

                case 'UNSUBSCRIBE':
                    if (message.room) {
                        this.leaveRoom(userId, message.room);
                    }
                    break;

                case 'BROADCAST':
                    if (message.room && message.data) {
                        this.broadcastToRoom(message.room, message.data);
                    }
                    break;

                default:
                    logger.warn(`Unknown message type from user ${userId}:`, message.type);
            }
        } catch (error) {
            logger.error(`Error handling message from user ${userId}:`, error);
        }
    }

    handleDisconnection(userId) {
        // Remove from all rooms
        this.rooms.forEach((clients, roomId) => {
            clients.delete(userId);
            if (clients.size === 0) {
                this.rooms.delete(roomId);
            }
        });

        // Remove client
        this.clients.delete(userId);

        logger.info(`🔌 WebSocket disconnected: User ${userId}`);
    }

    joinRoom(userId, roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(userId);

        this.sendToUser(userId, {
            type: 'ROOM_JOINED',
            room: roomId,
            timestamp: new Date().toISOString()
        });
    }

    leaveRoom(userId, roomId) {
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(userId);
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }

        this.sendToUser(userId, {
            type: 'ROOM_LEFT',
            room: roomId,
            timestamp: new Date().toISOString()
        });
    }

    sendToUser(userId, data) {
        const ws = this.clients.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    broadcastToRoom(roomId, data) {
        const clients = this.rooms.get(roomId);
        if (clients) {
            clients.forEach(userId => {
                this.sendToUser(userId, {
                    ...data,
                    room: roomId,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }

    // Public methods for broadcasting events
    broadcastUserLogin(user) {
        this.broadcastToRoom('admin:dashboard', {
            type: 'USER_LOGIN',
            user: {
                id: user.id,
                fullName: user.fullName,
                psnNumber: user.psnNumber,
                timestamp: new Date().toISOString()
            }
        });
    }

    broadcastUserLogout(userId) {
        this.broadcastToRoom('admin:dashboard', {
            type: 'USER_LOGOUT',
            userId,
            timestamp: new Date().toISOString()
        });
    }

    broadcastAuditLog(log) {
        this.broadcastToRoom('admin:audit', {
            type: 'AUDIT_LOG',
            log: {
                id: log.id,
                action: log.action,
                userName: log.userName,
                timestamp: log.timestamp,
                details: log.details
            }
        });
    }

    broadcastReminderSent(reminder) {
        this.broadcastToRoom('admin:notifications', {
            type: 'REMINDER_SENT',
            reminder: {
                id: reminder.id,
                recipient: reminder.recipientEmail,
                eventType: reminder.eventType,
                status: reminder.status,
                timestamp: new Date().toISOString()
            }
        });

        // Also notify the member if they're online
        if (reminder.memberId) {
            this.sendToUser(reminder.memberId, {
                type: 'REMINDER_SENT',
                reminder: {
                    eventType: reminder.eventType,
                    status: reminder.status,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    broadcastSystemAlert(alert) {
        this.broadcastToRoom('system:broadcast', {
            type: 'SYSTEM_ALERT',
            alert: {
                level: alert.level,
                message: alert.message,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Health check
    getStats() {
        return {
            totalClients: this.clients.size,
            totalRooms: this.rooms.size,
            rooms: Array.from(this.rooms.entries()).map(([roomId, clients]) => ({
                roomId,
                clientCount: clients.size
            }))
        };
    }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = {
    setupWebSocket: (server) => webSocketService.setup(server),
    webSocketService
};