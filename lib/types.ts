export type SessionRecord = {
  id: string;
  session_date: string;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  is_open: boolean;
};

export type RegistrationRecord = {
  id: string;
  student_id: string;
  email: string;
  assigned_session_id: string;
  assigned_priority: 1 | 2 | 3;
  pref_session_1: string;
  pref_session_2: string;
  pref_session_3: string;
  created_at: string;
};
