import { supabase } from './supabase';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  note?: string;
  eventDate: string;
  eventTime?: string;
  hasReminder: boolean;
  reminderAt?: string;
  reminderSentAt?: string;
  amount?: number;
  isPaid: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  note?: string | null;
  eventDate: string;
  eventTime?: string | null;
  hasReminder: boolean;
  reminderAt?: string | null;
  amount?: number | null;
}

const mapCalendarEvent = (row: any): CalendarEvent => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  note: row.note ?? undefined,
  eventDate: row.event_date,
  eventTime: row.event_time ?? undefined,
  hasReminder: Boolean(row.has_reminder),
  reminderAt: row.reminder_at ?? undefined,
  reminderSentAt: row.reminder_sent_at ?? undefined,
  amount: row.amount == null ? undefined : Number(row.amount),
  isPaid: Boolean(row.is_paid),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Oturum bulunamadı.');
  return data.user.id;
};

const inputToRow = (input: Partial<CalendarEventInput>) => {
  const values: Record<string, unknown> = {};
  const mapping: Record<keyof CalendarEventInput, string> = {
    title: 'title',
    note: 'note',
    eventDate: 'event_date',
    eventTime: 'event_time',
    hasReminder: 'has_reminder',
    reminderAt: 'reminder_at',
    amount: 'amount',
  };
  (Object.keys(mapping) as (keyof CalendarEventInput)[]).forEach(key => {
    if (input[key] !== undefined) values[mapping[key]] = input[key];
  });
  return values;
};

export const calendarService = {
  async getEvents(month?: number, year?: number) {
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', await getUserId())
      .order('event_date')
      .order('event_time');

    if (month && year) {
      const from = new Date(year, month - 1, 1).toISOString();
      const to = new Date(year, month, 1).toISOString();
      query = query.gte('event_date', from).lt('event_date', to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapCalendarEvent);
  },

  async createEvent(input: CalendarEventInput) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ user_id: await getUserId(), ...inputToRow(input) })
      .select()
      .single();
    if (error) throw error;
    return mapCalendarEvent(data);
  },

  async updateEvent(id: string, input: Partial<CalendarEventInput>) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(inputToRow(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapCalendarEvent(data);
  },

  async completeEvent(id: string, addToLedger = false) {
    const { data, error } = await supabase.rpc('complete_calendar_event', {
      event_id: id,
      add_to_ledger: addToLedger,
    });
    if (error) throw error;
    return mapCalendarEvent(data);
  },

  async deleteEvent(id: string) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
