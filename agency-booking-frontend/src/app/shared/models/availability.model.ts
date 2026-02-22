export interface AvailabilityDTO {
  id: number;
  agencyId: number;
  agencyName: string;
  date: string;
  availableTimeSlots: string[];
  bookedTimeSlots: string[];
  bookedSlotInfo: { [key: string]: string };
  isPastDate: boolean;
}

export interface TimeSlotCheckDTO {
  agencyId: number;
  date: string;
  time: string;
}

export interface TimeSlotManagementDTO {
  agencyId: number;
  date: string;
  time: string;
  blocked: boolean;
  reason: string;
  agentName: string;
}

export interface BlockedTimeSlot {
  id: number;
  agency: { id: number; name: string };
  date: string;
  time: string;
  reason: string;
  blockedBy: { id: number; username: string };
  blockedAt: string;
}
