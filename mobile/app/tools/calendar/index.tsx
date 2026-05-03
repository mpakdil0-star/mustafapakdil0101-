import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Platform, Switch, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { calendarService, CalendarEvent } from '../../../services/calendarService';
import { scheduleReminder, cancelReminder } from '../../../services/reminderService';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function CalendarScreen() {
  const colors = useAppColors();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  // FIX #3: Auto-select today so events show immediately on mount
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [amount, setAmount] = useState('');
  const [addToLedger, setAddToLedger] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // FIX #2: Native time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  
  // FIX #4: Show all events toggle
  const [showAllEvents, setShowAllEvents] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await calendarService.getEvents(currentMonth + 1, currentYear);
    setEvents(data);
    setLoading(false);
  }, [currentMonth, currentYear]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday-first
  };

  const hasEventOnDay = (day: number) => {
    return events.some(e => {
      const d = new Date(e.eventDate);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const d = new Date(e.eventDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // FIX #1 & #3: Tap on day only SELECTS, doesn't open modal
  const selectDay = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const openAddModal = () => {
    if (!selectedDate) return;
    setEditingEvent(null);
    setTitle(''); setNote(''); setEventTime(''); setHasReminder(false); setAmount(''); setAddToLedger(false);
    setShowModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(new Date(event.eventDate));
    setTitle(event.title);
    setNote(event.note || '');
    setEventTime(event.eventTime || '');
    setHasReminder(event.hasReminder);
    setAmount(event.amount ? String(event.amount) : '');
    setAddToLedger(false);
    setShowModal(true);
  };

  // FIX #2: Handle native time picker change
  const onTimePickerChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios'); // iOS keeps picker open
    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setEventTime(`${hours}:${minutes}`);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Uyarı', 'Başlık giriniz.'); return; }
    if (!selectedDate) return;

    setSaving(true);
    try {
      let reminderAt: string | undefined;
      if (hasReminder && eventTime) {
        const [h, m] = eventTime.split(':').map(Number);
        const rd = new Date(selectedDate);
        rd.setHours(h, m, 0, 0);
        reminderAt = rd.toISOString();
      }

      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, {
          title: title.trim(), note: note.trim() || undefined,
          eventTime: eventTime || undefined, hasReminder, reminderAt,
        } as any);
      } else {
        await calendarService.createEvent({
          title: title.trim(), note: note.trim() || undefined,
          eventDate: selectedDate.toISOString(), eventTime: eventTime || undefined,
          hasReminder, reminderAt, amount: amount ? Number(amount) : undefined,
          addToLedger,
        });
      }

      // Schedule local notification if reminder is set
      if (hasReminder && reminderAt) {
        await scheduleReminder(title.trim(), note.trim() || 'Hatırlatma', new Date(reminderAt));
      }

      setShowModal(false);
      // FIX #3: Reload events immediately after save
      await loadEvents();
    } catch (error) {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    Alert.alert('Sil', `"${event.title}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await calendarService.deleteEvent(event.id);
            // FIX #3: Reload events immediately after delete
            await loadEvents();
          } catch { Alert.alert('Hata', 'Silinemedi.'); }
        }
      },
    ]);
  };

  const handleComplete = async (event: CalendarEvent) => {
    try {
      await calendarService.completeEvent(event.id, !!event.amount);
      // FIX #3: Reload events immediately after complete
      await loadEvents();
    } catch { Alert.alert('Hata', 'Güncellenemedi.'); }
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const selectedDay = selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear
    ? selectedDate.getDate() : null;
  const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  
  const displayedEvents = showAllEvents 
    ? [...events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    : dayEvents;

  return (
    <View style={styles.container}>
      <PremiumHeader title="İş Takvimim" showBackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Month Navigation */}
        <Card style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            {DAYS.map(d => <Text key={d} style={styles.dayHeaderText}>{d}</Text>)}
          </View>

          {/* Calendar Grid */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCell,
                    day === selectedDay && styles.dayCellSelected,
                    isToday(day || 0) && day !== selectedDay && styles.dayCellToday,
                  ]}
                  onPress={() => day && selectDay(day)}
                  disabled={!day}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <>
                      <Text style={[
                        styles.dayText,
                        { color: colors.text },
                        day === selectedDay && styles.dayTextSelected,
                        isToday(day) && day !== selectedDay && styles.dayTextToday,
                      ]}>{day}</Text>
                      {hasEventOnDay(day) && <View style={[styles.eventDot, day === selectedDay && { backgroundColor: '#FFF' }]} />}
                    </>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={[styles.eventsSectionTitle, { color: colors.text, flex: 1 }]}>
              {showAllEvents ? `${MONTHS[currentMonth]} Ayı Tüm İşler` : (selectedDay ? `${selectedDay} ${MONTHS[currentMonth]} Etkinlikleri` : 'Etkinlikler')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => setShowAllEvents(!showAllEvents)} 
                style={{ backgroundColor: showAllEvents ? '#EDE9FE' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name={showAllEvents ? "calendar" : "list"} size={16} color={showAllEvents ? "#8B5CF6" : staticColors.textSecondary} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: showAllEvents ? "#8B5CF6" : staticColors.textSecondary }}>
                  {showAllEvents ? 'Takvim' : 'Tümü'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.addBtnGrad}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {displayedEvents.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={32} color={staticColors.textLight} />
                <Text style={styles.emptyText}>Bu gün için kayıt yok</Text>
                <Text style={styles.emptySubtext}>Yukarıdaki + butonuna dokunarak ekle</Text>
              </Card>
            ) : (
              displayedEvents.map(event => (
                <Card key={event.id} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={[styles.statusDot, { backgroundColor: event.status === 'completed' ? '#10B981' : '#8B5CF6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      {event.eventTime && (
                        <View style={styles.timeRow}>
                          <Ionicons name="time-outline" size={14} color={staticColors.textSecondary} />
                          <Text style={styles.timeText}>{event.eventTime}</Text>
                          {event.hasReminder && <Ionicons name="notifications" size={14} color="#F59E0B" style={{ marginLeft: 6 }} />}
                        </View>
                      )}
                    </View>
                    {event.amount && (
                      <View style={[styles.amountBadge, event.isPaid && styles.amountBadgePaid]}>
                        <Text style={[styles.amountText, event.isPaid && { color: '#10B981' }]}>₺{Number(event.amount).toLocaleString('tr-TR')}</Text>
                      </View>
                    )}
                  </View>
                  {event.note && <Text style={styles.eventNote}>{event.note}</Text>}
                  <View style={styles.eventActions}>
                    {event.status !== 'completed' && (
                      <TouchableOpacity onPress={() => handleComplete(event)} style={styles.actionBtn}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                        <Text style={[styles.actionText, { color: '#10B981' }]}>Tamamla</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => openEditModal(event)} style={styles.actionBtn}>
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      <Text style={[styles.actionText, { color: '#3B82F6' }]}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(event)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={[styles.actionText, { color: '#EF4444' }]}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEvent ? 'Etkinliği Düzenle' : 'Yeni Kayıt'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={staticColors.textSecondary} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Başlık *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Ahmet Bey - Pano Değişimi" placeholderTextColor={staticColors.textLight} />

              <Text style={styles.label}>Not (İsteğe Bağlı)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} placeholder="Detay ekle..." placeholderTextColor={staticColors.textLight} multiline />

              {/* FIX #2: Native Time Picker */}
              <Text style={styles.label}>Saat (İsteğe Bağlı)</Text>
              <TouchableOpacity
                style={[styles.input, styles.timePickerButton]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={eventTime ? '#8B5CF6' : staticColors.textLight} />
                <Text style={[styles.timePickerText, eventTime ? { color: '#1E293B' } : { color: staticColors.textLight }]}>
                  {eventTime || 'Saat seçmek için dokun'}
                </Text>
                {eventTime ? (
                  <TouchableOpacity onPress={() => { setEventTime(''); setHasReminder(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={20} color={staticColors.textLight} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={18} color={staticColors.textLight} />
                )}
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={onTimePickerChange}
                    locale="tr-TR"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.timePickerDoneBtn}>
                      <Text style={styles.timePickerDoneText}>Tamam</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {eventTime.length > 0 && (
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Hatırlatıcı Kur</Text>
                    <Text style={styles.switchDesc}>Belirlenen saatte bildirim gönder</Text>
                  </View>
                  <Switch value={hasReminder} onValueChange={setHasReminder} trackColor={{ true: '#8B5CF6' }} thumbColor={hasReminder ? '#FFF' : '#F1F5F9'} />
                </View>
              )}

              {!editingEvent && (
                <>
                  <Text style={styles.label}>Ücret (İsteğe Bağlı)</Text>
                  <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="₺" placeholderTextColor={staticColors.textLight} keyboardType="decimal-pad" />

                  {amount.length > 0 && (
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>Hesap Defterine Ekle</Text>
                        <Text style={styles.switchDesc}>Alacak olarak kaydet</Text>
                      </View>
                      <Switch value={addToLedger} onValueChange={setAddToLedger} trackColor={{ true: '#F59E0B' }} thumbColor={addToLedger ? '#FFF' : '#F1F5F9'} />
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveBtnText}>{editingEvent ? 'Güncelle' : 'Kaydet'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: spacing.md, paddingBottom: 100 },
  calendarCard: { padding: spacing.md, marginBottom: spacing.md },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { fontFamily: fonts.bold, fontSize: 18 },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 12, color: staticColors.textSecondary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  dayCellSelected: { backgroundColor: '#8B5CF6' },
  dayCellToday: { backgroundColor: '#EDE9FE' },
  dayText: { fontFamily: fonts.medium, fontSize: 14 },
  dayTextSelected: { color: '#FFF', fontFamily: fonts.bold },
  dayTextToday: { color: '#8B5CF6', fontFamily: fonts.bold },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6', marginTop: 2 },
  eventsSection: { marginTop: 8 },
  eventsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eventsSectionTitle: { fontFamily: fonts.bold, fontSize: 16 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGrad: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { padding: 32, alignItems: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: staticColors.textSecondary, marginTop: 8 },
  emptySubtext: { fontFamily: fonts.regular, fontSize: 12, color: staticColors.textLight, marginTop: 4 },
  eventCard: { padding: spacing.md, marginBottom: 10 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  eventTitle: { fontFamily: fonts.bold, fontSize: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  timeText: { fontFamily: fonts.medium, fontSize: 13, color: staticColors.textSecondary },
  amountBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amountBadgePaid: { backgroundColor: '#D1FAE5' },
  amountText: { fontFamily: fonts.bold, fontSize: 13, color: '#D97706' },
  eventNote: { fontFamily: fonts.regular, fontSize: 13, color: staticColors.textSecondary, marginTop: 8, marginLeft: 20 },
  eventActions: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: fonts.medium, fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 60 : 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: fonts.bold, fontSize: 20, color: staticColors.text },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: staticColors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { height: 50, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 15, backgroundColor: '#F8FAFC' },
  // FIX #2: Time picker button styles
  timePickerButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timePickerText: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  timePickerContainer: { backgroundColor: '#F1F5F9', borderRadius: 12, marginTop: 8, padding: 8, alignItems: 'center' },
  timePickerDoneBtn: { paddingVertical: 8, paddingHorizontal: 24, backgroundColor: '#8B5CF6', borderRadius: 10, marginTop: 4 },
  timePickerDoneText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  switchLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: staticColors.text },
  switchDesc: { fontFamily: fonts.regular, fontSize: 12, color: staticColors.textSecondary, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, marginTop: 20 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFF' },
});
