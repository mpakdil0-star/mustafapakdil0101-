import { supabase } from './supabase';

export interface LedgerEntry {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  type: 'receivable' | 'payable';
  status: 'pending' | 'paid';
  note?: string;
  dueDate?: string;
  paidAt?: string;
  calendarEventId?: string;
  eventTime?: string;
  hasReminder?: boolean;
  reminderAt?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntryInput {
  personName: string;
  amount: number;
  type: 'receivable' | 'payable';
  note?: string | null;
  dueDate?: string | null;
  eventTime?: string | null;
  hasReminder?: boolean;
  reminderAt?: string | null;
}

export interface LedgerSummary {
  pendingReceivables: number;
  pendingPayables: number;
  totalReceived: number;
  totalPaid: number;
  netBalance: number;
}

const mapLedgerEntry = (row: any): LedgerEntry => ({
  id: row.id,
  userId: row.user_id,
  personName: row.person_name,
  amount: Number(row.amount),
  type: row.type,
  status: row.status,
  note: row.note ?? undefined,
  dueDate: row.due_date ?? undefined,
  paidAt: row.paid_at ?? undefined,
  calendarEventId: row.calendar_event_id ?? undefined,
  eventTime: row.event_time ?? undefined,
  hasReminder: Boolean(row.has_reminder),
  reminderAt: row.reminder_at ?? undefined,
  reminderSentAt: row.reminder_sent_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Oturum bulunamadı.');
  return data.user.id;
};

const inputToRow = (input: Partial<LedgerEntryInput>) => {
  const values: Record<string, unknown> = {};
  const mapping: Record<keyof LedgerEntryInput, string> = {
    personName: 'person_name',
    amount: 'amount',
    type: 'type',
    note: 'note',
    dueDate: 'due_date',
    eventTime: 'event_time',
    hasReminder: 'has_reminder',
    reminderAt: 'reminder_at',
  };
  (Object.keys(mapping) as (keyof LedgerEntryInput)[]).forEach(key => {
    if (input[key] !== undefined) values[mapping[key]] = input[key];
  });
  return values;
};

export const ledgerService = {
  async getEntries(type?: string, status?: string) {
    let query = supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', await getUserId())
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapLedgerEntry);
  },

  async getSummary() {
    const rows = await this.getEntries();
    const summary: LedgerSummary = {
      pendingReceivables: 0,
      pendingPayables: 0,
      totalReceived: 0,
      totalPaid: 0,
      netBalance: 0,
    };
    for (const row of rows) {
      if (row.type === 'receivable' && row.status === 'pending') summary.pendingReceivables += row.amount;
      if (row.type === 'payable' && row.status === 'pending') summary.pendingPayables += row.amount;
      if (row.type === 'receivable' && row.status === 'paid') summary.totalReceived += row.amount;
      if (row.type === 'payable' && row.status === 'paid') summary.totalPaid += row.amount;
    }
    summary.netBalance = summary.pendingReceivables - summary.pendingPayables;
    return summary;
  },

  async createEntry(input: LedgerEntryInput) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({ user_id: await getUserId(), ...inputToRow(input) })
      .select()
      .single();
    if (error) throw error;
    return mapLedgerEntry(data);
  },

  async updateEntry(id: string, input: Partial<LedgerEntryInput>) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .update(inputToRow(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapLedgerEntry(data);
  },

  async togglePaid(id: string) {
    const { data: current, error: currentError } = await supabase
      .from('ledger_entries')
      .select('status')
      .eq('id', id)
      .single();
    if (currentError) throw currentError;
    const paid = current.status !== 'paid';
    const { data, error } = await supabase
      .from('ledger_entries')
      .update({ status: paid ? 'paid' : 'pending', paid_at: paid ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapLedgerEntry(data);
  },

  async deleteEntry(id: string) {
    const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
