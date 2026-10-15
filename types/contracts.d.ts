export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: string | FormData | object | null;
  headers?: Record<string, string>;
}

export interface PaymentSubmission {
  reservationId: string | null;
  toolId: string;
  amount: number | string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
}

export interface PaymentRecord {
  paymentId: string;
  receiptId: string;
  userId: string;
  reservationId: string | null;
  toolId: string;
  amount: number;
  referenceNumber: string;
  paymentMethod: string;
  paymentDate: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  proofImage: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string;
}

export interface PaymentSubmissionResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Borrower' | 'Municipal Staff' | 'Administrator';
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user: User | null;
      file?: Express.Multer.File;
      session?: {
        sessionId: string;
        userId: string;
        token: string;
        expiresAt: string;
      } | null;
    }
  }
}
