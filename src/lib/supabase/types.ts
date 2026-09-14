export type ProfileRole = "admin" | "staff";
export type AreaStatus = "active" | "inactive";
export type OrganizerType = "internal" | "external";
export type ScheduleType = "internal_activity" | "external_booking" | "blocked";
export type ScheduleStatus = "draft" | "confirmed" | "cancelled" | "completed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Profile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  description: string | null;
  capacity: number;
  location: string | null;
  status: AreaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Organizer {
  id: string;
  name: string;
  type: OrganizerType;
  pic_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: AreaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Activity {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  default_duration_minutes: number;
  organizer_id: string | null;
  capacity_recommendation: number | null;
  status: AreaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface BusinessHour {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Schedule {
  id: string;
  area_id: string;
  activity_id: string | null;
  organizer_id: string | null;
  type: ScheduleType;
  date: string;
  start_at: string;
  end_at: string;
  capacity: number | null;
  notes: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Booking {
  id: string;
  booking_number: string;
  schedule_id: string;
  customer_organizer_name: string;
  contact_person: string | null;
  phone: string | null;
  participant_count: number | null;
  purpose: string | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      areas: { Row: Area; Insert: Partial<Area>; Update: Partial<Area> };
      organizers: { Row: Organizer; Insert: Partial<Organizer>; Update: Partial<Organizer> };
      activities: { Row: Activity; Insert: Partial<Activity>; Update: Partial<Activity> };
      business_hours: { Row: BusinessHour; Insert: Partial<BusinessHour>; Update: Partial<BusinessHour> };
      schedules: { Row: Schedule; Insert: Partial<Schedule>; Update: Partial<Schedule> };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> };
    };
  };
}
