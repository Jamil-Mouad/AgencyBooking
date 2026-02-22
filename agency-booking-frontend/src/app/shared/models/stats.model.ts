export interface UserStatsDTO {
  totalReservations: number;
  completedReservations: number;
  pendingReservations: number;
  canceledReservations: number;
  agenciesVisited: string[];
}

export interface SystemStats {
  totalUsers: number;
  totalAgents: number;
  totalAgencies: number;
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  canceledReservations: number;
}

export interface PublicStats {
  totalAgencies: number;
  totalReservations: number;
  totalServices: number;
  userCount: number;
  agencyCount: number;
  satisfactionRate: number;
  support: string;
}
