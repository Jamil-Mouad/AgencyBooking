export interface AgentDTO {
  id: number;
  username: string;
  email: string;
  agencyId: number;
  agencyName: string;
  available: boolean;
}

export interface AgentInfoDTO {
  id: number;
  username: string;
  email: string;
  agencyId: number;
  agencyName: string;
  available: boolean;
}

export interface AgentRegistrationRequest {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  agencyId: number;
}

export interface AgentStatsDTO {
  last24Hours: number;
  totalConfirmed: number;
  totalCompleted: number;
  totalCanceled: number;
}
