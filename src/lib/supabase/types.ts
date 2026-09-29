export type ProfileRole = "super_admin" | "admin" | "staff";
export type AreaStatus = "active" | "inactive";
export type OrganizerType = "internal" | "external";
export type ScheduleType = "internal_activity" | "external_booking" | "blocked";
export type ScheduleStatus = "draft" | "confirmed" | "cancelled" | "completed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Profile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  email: string | null;
  is_active: boolean;
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
  product_id: string | null;
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

export interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number;
  unit: string;
  status: AreaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  default_price: number | null;
  status: AreaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SalesTransaction {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  transaction_date: string;
  notes: string | null;
  inputter_name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  products?: { name: string; category: string | null } | null;
}

export interface ExpenseTransaction {
  id: string;
  expense_item_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  transaction_date: string;
  notes: string | null;
  inputter_name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  expense_items?: { name: string; category: string | null; unit: string } | null;
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
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      expense_items: { Row: ExpenseItem; Insert: Partial<ExpenseItem>; Update: Partial<ExpenseItem> };
      sales_transactions: {
        Row: SalesTransaction;
        Insert: Partial<SalesTransaction>;
        Update: Partial<SalesTransaction>;
      };
      expense_transactions: {
        Row: ExpenseTransaction;
        Insert: Partial<ExpenseTransaction>;
        Update: Partial<ExpenseTransaction>;
      };
    };
  };
}
