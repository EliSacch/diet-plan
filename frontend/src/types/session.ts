export type SessionInfo = {
  id: string;
  is_current: boolean;
  device: string;
  location: string | null;
  created_at: string;
  last_seen_at: string;
};

export type SessionList = {
  sessions: SessionInfo[];
};
