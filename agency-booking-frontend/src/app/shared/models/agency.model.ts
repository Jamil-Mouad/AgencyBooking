export interface Agency {
  id: number;
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  email: string;
  description: string;
  services: ServiceOffering[];
  businessHours: BusinessHours[];
  agents: AgentSummary[];
}

export interface BusinessHours {
  day: string;
  openingTime: string;
  closingTime: string;
  closed: boolean;
}

export interface AgentSummary {
  id: number;
  username: string;
  email: string;
  available: boolean;
}

export interface ServiceOffering {
  id: number;
  name: string;
}

export interface AgencyRequest {
  name: string;
  address: string;
  phoneNumber: string;
  city: string;
  email: string;
  description: string;
  serviceIds: number[];
  businessHours: BusinessHours[];
}

export interface ServiceOfferingRequest {
  name: string;
}
