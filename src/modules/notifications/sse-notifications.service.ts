import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

export interface SSEMessage {
  data: any;
  id?: string;
  type?: string;
  retry?: number;
}

interface ConnectionInfo {
  stream: Subject<SSEMessage>;
  userId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

@Injectable()
export class SseNotificationsService {
  private readonly logger = new Logger(SseNotificationsService.name);
  
  // Map of connection ID to connection info
  private connections = new Map<string, ConnectionInfo>();
  
  // Map of user ID to set of connection IDs (for multi-tab support)
  private userConnections = new Map<string, Set<string>>();
  
  // Configuration
  private readonly MAX_CONNECTIONS_PER_USER = 5;
  private readonly MAX_TOTAL_CONNECTIONS = 500;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 300000; // 5 minutes
  
  // Statistics
  private totalNotificationsSent = 0;

  constructor() {
    // Start cleanup job every minute
    this.startCleanupJob();
    this.logger.log('SSE Notifications Service initialized');
  }

  /**
   * Create a new SSE stream for a user
   */
  createStream(userId: string): Observable<SSEMessage> {
    // Check total connections limit
    if (this.connections.size >= this.MAX_TOTAL_CONNECTIONS) {
      this.logger.warn(`Max total connections reached: ${this.MAX_TOTAL_CONNECTIONS}`);
      throw new Error('Server capacity reached. Please try again later.');
    }

    // Check user connection limit
    const userConnectionCount = this.getUserConnectionCount(userId);
    if (userConnectionCount >= this.MAX_CONNECTIONS_PER_USER) {
      this.logger.warn(`User ${userId} exceeded max connections: ${this.MAX_CONNECTIONS_PER_USER}`);
      // Close oldest connection for this user
      this.closeOldestUserConnection(userId);
    }

    // Generate unique connection ID
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Subject for this connection
    const stream = new Subject<SSEMessage>();
    
    // Store connection info
    const connectionInfo: ConnectionInfo = {
      stream,
      userId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };
    
    this.connections.set(connectionId, connectionInfo);
    
    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    this.logger.log(`SSE connection established: ${connectionId} for user ${userId} (${this.connections.size} total connections)`);

    // Send initial connection message
    stream.next({
      data: JSON.stringify({
        type: 'connected',
        message: 'Real-time notifications active',
        connectionId,
        timestamp: new Date().toISOString(),
      }),
    });

    // Set up heartbeat for this connection
    const heartbeatInterval = interval(this.HEARTBEAT_INTERVAL).subscribe(() => {
      try {
        stream.next({
          data: JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          }),
        });
        connectionInfo.lastHeartbeat = new Date();
      } catch (error) {
        this.logger.error(`Heartbeat failed for ${connectionId}: ${error.message}`);
        heartbeatInterval.unsubscribe();
        this.closeConnection(connectionId);
      }
    });

    // Convert Subject to Observable with MessageEvent format
    return stream.pipe(
      map((message: SSEMessage) => ({
        data: message.data,
        id: message.id,
        type: message.type || 'message',
        retry: message.retry,
      })),
      finalize(() => {
        this.logger.log(`SSE connection closed: ${connectionId}`);
        heartbeatInterval.unsubscribe();
        this.closeConnection(connectionId);
      })
    );
  }

  /**
   * Push notification to a specific user (all their connections)
   */
  pushToUser(userId: string, notification: any): boolean {
    const connectionIds = this.userConnections.get(userId);
    
    if (!connectionIds || connectionIds.size === 0) {
      this.logger.debug(`No active connections for user ${userId}`);
      return false;
    }

    let successCount = 0;
    
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          connection.stream.next({
            data: JSON.stringify({
              type: 'notification',
              notification,
              timestamp: new Date().toISOString(),
            }),
          });
          successCount++;
        } catch (error) {
          this.logger.error(`Failed to push to connection ${connectionId}: ${error.message}`);
          this.closeConnection(connectionId);
        }
      }
    }

    if (successCount > 0) {
      this.totalNotificationsSent++;
      this.logger.log(`Pushed notification to ${successCount} connection(s) for user ${userId}`);
    }

    return successCount > 0;
  }

  /**
   * Push notification to multiple users
   */
  pushToUsers(userIds: string[], notification: any): number {
    let successCount = 0;
    for (const userId of userIds) {
      if (this.pushToUser(userId, notification)) {
        successCount++;
      }
    }
    return successCount;
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastToAll(notification: any): number {
    let successCount = 0;
    
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.stream.next({
          data: JSON.stringify({
            type: 'broadcast',
            notification,
            timestamp: new Date().toISOString(),
          }),
        });
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to broadcast to ${connectionId}: ${error.message}`);
        this.closeConnection(connectionId);
      }
    }

    this.totalNotificationsSent += successCount;
    this.logger.log(`Broadcast notification to ${successCount} connection(s)`);
    return successCount;
  }

  /**
   * Close a specific connection
   */
  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.stream.complete();
      } catch (error) {
        // Ignore errors on close
      }
      
      // Remove from user connections map
      const userConnectionSet = this.userConnections.get(connection.userId);
      if (userConnectionSet) {
        userConnectionSet.delete(connectionId);
        if (userConnectionSet.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
      
      this.connections.delete(connectionId);
    }
  }

  /**
   * Close oldest connection for a user
   */
  private closeOldestUserConnection(userId: string): void {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds || connectionIds.size === 0) return;

    let oldestConnectionId: string | null = null;
    let oldestDate = new Date();

    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.connectedAt < oldestDate) {
        oldestDate = connection.connectedAt;
        oldestConnectionId = connectionId;
      }
    }

    if (oldestConnectionId) {
      this.logger.log(`Closing oldest connection for user ${userId}: ${oldestConnectionId}`);
      this.closeConnection(oldestConnectionId);
    }
  }

  /**
   * Get number of active connections for a user
   */
  private getUserConnectionCount(userId: string): number {
    const connectionIds = this.userConnections.get(userId);
    return connectionIds ? connectionIds.size : 0;
  }

  /**
   * Start periodic cleanup of stale connections
   */
  private startCleanupJob(): void {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Run every minute
  }

  /**
   * Clean up connections that haven't sent heartbeat recently
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.CONNECTION_TIMEOUT) {
        staleConnections.push(connectionId);
      }
    }

    if (staleConnections.length > 0) {
      this.logger.log(`Cleaning up ${staleConnections.length} stale connection(s)`);
      staleConnections.forEach(connectionId => this.closeConnection(connectionId));
    }
  }

  /**
   * Get statistics about active connections
   */
  getStats() {
    const uniqueUsers = this.userConnections.size;
    const totalConnections = this.connections.size;
    const averageConnectionsPerUser = uniqueUsers > 0 ? totalConnections / uniqueUsers : 0;

    // Count connections per user
    const connectionsPerUser: Record<string, number> = {};
    for (const [userId, connectionIds] of this.userConnections) {
      connectionsPerUser[userId] = connectionIds.size;
    }

    return {
      activeConnections: totalConnections,
      uniqueUsers,
      averageConnectionsPerUser: Number(averageConnectionsPerUser.toFixed(2)),
      maxConnectionsPerUser: this.MAX_CONNECTIONS_PER_USER,
      maxTotalConnections: this.MAX_TOTAL_CONNECTIONS,
      totalNotificationsSent: this.totalNotificationsSent,
      connectionsPerUser,
    };
  }

  /**
   * Check if user is currently connected
   */
  isUserConnected(userId: string): boolean {
    const connectionIds = this.userConnections.get(userId);
    return connectionIds ? connectionIds.size > 0 : false;
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.userConnections.keys());
  }
}
