export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';

export interface Reservation {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  service: string;
  description: string;
  preferredDate: string;
  startDateTime: string | null;
  endDateTime: string | null;
  agency: {
    id: number;
    name: string;
    city: string;
  };
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  handledByAgent: {
    id: number;
    username: string;
  } | null;
  reminderSent: boolean;
}

export interface ReservationRequest {
  service: string;
  description: string;
  preferredDate: string;
  preferredTime?: string;
  agencyId: number;
}

export interface ReservationConfirmationRequest {
  startDateTime: string;
  endDateTime: string;
  message?: string;
}

export interface ReservationCancellationRequest {
  reason?: string;
}

export interface ReservationCompletionRequest {
  notes?: string;
}

export interface ReservationFeedback {
  id: number;
  reservation: Reservation;
  comment: string;
  rating: number;
  createdAt: string;
}

export interface ReservationFeedbackDTO {
  reservationId: number;
  comment: string;
  rating: number;
}

export interface LockStatusDTO {
  reservationId: number;
  locked: boolean;
  agentId: number;
  agentName: string;
  agentEmail: string;
  lockMessage: string;
}

export interface PublicTestimonial {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  authorName: string;
  service: string;
}

export interface FeedbackStatistics {
  average: number;
  count: number;
  fullStars: number;
  hasHalfStar: boolean;
  distribution: Record<string, number>;
}
