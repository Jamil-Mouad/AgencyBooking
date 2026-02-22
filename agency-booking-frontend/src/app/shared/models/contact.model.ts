export interface ContactMessage {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ContactMessageDTO {
  subject: string;
  message: string;
}
