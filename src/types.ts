export interface SourceEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
  location: string;
  description: string;
  status?: string;
}

export interface CacheRecord {
  ics: string;
  fetchedAt: number;
}

export interface Env {
  PLANNING_USERNAME: string;
  PLANNING_PASSWORD: string;
  STUDENT_ID: string;
  CALENDAR_TOKEN: string;
  CACHE_TTL_SECONDS?: string;
  SCHOOL_BASE_URL?: string;
  CALENDAR_CACHE?: KVNamespace;
}
