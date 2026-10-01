export interface UserRegisteredEvent {
  event: string;
  email: string;
  name: string;
  registeredAt: string;
}

export interface UserLoginEvent {
  event: string;
  email: string;
  loginAt?: string;
}

export interface PaymentCreatedEvent {
  event: string;
  userId: string;
  amount: number;
  currency?: string;
  paymentId?: string;
  createdAt?: string;
  source?: string;
  simulateFailure?: boolean;
}

export interface ReservationEvent {
  event: string;
  reservationId: string;
  guestName?: string;
  roomNumber?: number;
  checkIn?: string;
  batchId?: string;
  indexInBatch?: number;
  totalInBatch?: number;
  userId?: string;
  amount?: number;
  source?: string;
  note?: string;
}
