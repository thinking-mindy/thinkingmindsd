import client from '@/lib/mongodb';
import { currentUser } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';
import type { UsageLog } from '@/types/database';

const DB_NAME = 'thinkingminds';
const USAGE_LOGS_COLLECTION = 'usage_logs';
const ORGS_COLLECTION = 'orgs';

export interface ApiCallLog {
  orgId: string | ObjectId;
  route: string;
  method?: string;
  action?: string;
  userId?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Log an API call and deduct from organization's API usage
 * @param route - The API route or action name (e.g., '/api/tasks', 'createTask')
 * @param success - Whether the API call was successful
 * @param error - Error message if failed
 * @param duration - Duration in milliseconds
 */
export async function logApiCall(
  route: string,
  options?: {
    success?: boolean;
    error?: string;
    duration?: number;
    method?: string;
    action?: string;
  }
): Promise<{ success: boolean; error?: string; usageExceeded?: boolean }> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const orgId = user.publicMetadata?.companyId as string;
    if (!orgId) {
      return { success: false, error: 'Organization ID not found' };
    }

    const orgObjectId = typeof orgId === 'string' ? new ObjectId(orgId) : orgId;
    const con = await client.connect();
    const db = con.db(DB_NAME);

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get organization to check plan limits
    const org = await db.collection(ORGS_COLLECTION).findOne({ _id: orgObjectId });
    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Get plan to check API limit
    let apiLimit = 1000; // Default limit
    if (org.planId) {
      const plan = await db.collection('plans').findOne({ _id: org.planId });
      if (plan) {
        apiLimit = plan.apiLimitMonthly || 1000;
      }
    }

    // Get current usage for this month
    const currentUsage = org.usage?.month?.calls || 0;

    // Check if usage limit exceeded
    if (currentUsage >= apiLimit) {
      // Still log the call but mark as exceeded
      const logEntry: ApiCallLog = {
        orgId: orgObjectId,
        route,
        method: options?.method,
        action: options?.action,
        userId: user.id,
        timestamp: now,
        success: false,
        error: 'API usage limit exceeded',
        duration: options?.duration,
      };

      await db.collection(USAGE_LOGS_COLLECTION).insertOne(logEntry);

      return {
        success: false,
        error: 'API usage limit exceeded',
        usageExceeded: true,
      };
    }

    // Log the API call
    const logEntry: ApiCallLog = {
      orgId: orgObjectId,
      route,
      method: options?.method,
      action: options?.action,
      userId: user.id,
      timestamp: now,
      success: options?.success !== false,
      error: options?.error,
      duration: options?.duration,
    };

    await db.collection(USAGE_LOGS_COLLECTION).insertOne(logEntry);

    // Increment usage counter atomically
    await db.collection(ORGS_COLLECTION).updateOne(
      { _id: orgObjectId },
      {
        $inc: {
          'usage.month.calls': 1,
        },
        $set: {
          'usage.month.lastUpdated': now,
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error logging API call:', error);
    // Don't fail the request if logging fails
    return { success: false, error: 'Failed to log API call' };
  }
}

/**
 * Get API usage statistics for an organization
 */
export async function getApiUsage(orgId: string | ObjectId) {
  try {
    const con = await client.connect();
    const db = con.db(DB_NAME);
    const orgObjectId = typeof orgId === 'string' ? new ObjectId(orgId) : orgId;

    const org = await db.collection(ORGS_COLLECTION).findOne({ _id: orgObjectId });
    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Get plan to get API limit
    let apiLimit = 1000;
    if (org.planId) {
      const plan = await db.collection('plans').findOne({ _id: org.planId });
      if (plan) {
        apiLimit = plan.apiLimitMonthly || 1000;
      }
    }

    const currentUsage = org.usage?.month?.calls || 0;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Get detailed logs for this month
    const logs = await db
      .collection(USAGE_LOGS_COLLECTION)
      .find({
        orgId: orgObjectId,
        timestamp: { $gte: monthStart },
      })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    return {
      success: true,
      data: {
        used: currentUsage,
        limit: apiLimit,
        remaining: Math.max(0, apiLimit - currentUsage),
        percentage: apiLimit > 0 ? (currentUsage / apiLimit) * 100 : 0,
        logs,
      },
    };
  } catch (error) {
    console.error('Error getting API usage:', error);
    return { success: false, error: 'Failed to get API usage' };
  }
}

/**
 * Reset monthly usage (typically called at the start of each month)
 */
export async function resetMonthlyUsage(orgId: string | ObjectId) {
  try {
    const con = await client.connect();
    const db = con.db(DB_NAME);
    const orgObjectId = typeof orgId === 'string' ? new ObjectId(orgId) : orgId;

    await db.collection(ORGS_COLLECTION).updateOne(
      { _id: orgObjectId },
      {
        $set: {
          'usage.month.calls': 0,
          'usage.month.lastUpdated': new Date(),
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
    return { success: false, error: 'Failed to reset monthly usage' };
  }
}

