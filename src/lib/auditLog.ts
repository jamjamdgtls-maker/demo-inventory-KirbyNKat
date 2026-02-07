import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const AUDIT_COLLECTION = 'auditLogs';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'STOCK_IN' | 'STOCK_OUT';

interface AuditLogEntry {
  action: AuditAction;
  collection: string;
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  details?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging should not break main functionality
  }
}

// Helper for CRUD operations
export function createAuditLogger(userId: string, userName: string, userEmail: string) {
  return {
    logCreate: (collectionName: string, documentId: string, newData: Record<string, unknown>, details?: string) =>
      logAudit({
        action: 'CREATE',
        collection: collectionName,
        documentId,
        userId,
        userName,
        userEmail,
        newData,
        details,
      }),

    logUpdate: (collectionName: string, documentId: string, oldData: Record<string, unknown>, newData: Record<string, unknown>, details?: string) =>
      logAudit({
        action: 'UPDATE',
        collection: collectionName,
        documentId,
        userId,
        userName,
        userEmail,
        oldData,
        newData,
        details,
      }),

    logDelete: (collectionName: string, documentId: string, oldData: Record<string, unknown>, details?: string) =>
      logAudit({
        action: 'DELETE',
        collection: collectionName,
        documentId,
        userId,
        userName,
        userEmail,
        oldData,
        details,
      }),

    logStockIn: (transactionId: string, details: string) =>
      logAudit({
        action: 'STOCK_IN',
        collection: 'inventoryTransactions',
        documentId: transactionId,
        userId,
        userName,
        userEmail,
        details,
      }),

    logStockOut: (transactionId: string, details: string) =>
      logAudit({
        action: 'STOCK_OUT',
        collection: 'inventoryTransactions',
        documentId: transactionId,
        userId,
        userName,
        userEmail,
        details,
      }),
  };
}
