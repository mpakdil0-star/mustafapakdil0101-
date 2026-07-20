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
    if (event.type === 'dismissed') return;
    
    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const newTimeStr = `${hours}:${minutes}`;
      
      if (newTimeStr !== eventTime) {
        setEventTime(newTimeStr);
        
        if (!hasReminder) {
          Alert.alert(
            'Hatırlatıcı',
            `Saat ${newTimeStr} için etkinlik hatırlatıcısı kurmak ister misiniz?`,
            [
              { text: 'Hayır', style: 'cancel' },
              { text: 'Evet, Kur', onPress: () => setHasReminder(true) }
            ]
          );
        }
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Uyarı', 'Başlık giriniz.'); return; }
    if (!selectedDate) return;
    if (hasReminder && !eventTime) { Alert.alert('Uyarı', 'Hatırlatıcı için saat seçiniz.'); return; }

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
          eventDate: selectedDate.toISOString(), eventTime: eventTime || undefined,
          hasReminder, reminderAt: reminderAt ?? null,
        } as any);
      } else {
        await calendarService.createEvent({
          title: title.trim(), note: note.trim() || undefined,
          eventDate: selectedDate.toISOString(), eventTime: eventTime || undefined,
          hasReminder, reminderAt, amount: amount ? Number(amount) : undefined,
          addToLedger,
        });
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PremiumHeader title="İş Takvimim" showBackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <Card style={styles.calendarCard} variant="default" elevated>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            {DAYS.map(d => <Text key={d} style={[styles.dayHeaderText, { color: colors.textSecondary }]}>{d}</Text>)}
          </View>

          {/* Calendar Grid */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, i) => {
                const isSel = day === selectedDay;
                const isTod = day ? isToday(day) : false;
                const hasEv = day ? hasEventOnDay(day) : false;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayCell,
                      isSel && { backgroundColor: colors.primary },
                      isTod && !isSel && { backgroundColor: colors.primary + '12' },
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
                          isSel && { color: staticColors.white, fontFamily: fonts.bold },
                          isTod && !isSel && { color: colors.primary, fontFamily: fonts.bold },
                          !isSel && !isTod && { color: colors.text },
                        ]}>{day}</Text>
                        {hasEv && (
                          <View 
                            style={[
                              styles.eventDot, 
                              isSel ? { backgroundColor: staticColors.white } : { backgroundColor: colors.accentGold || '#F59E0B' }
                            ]} 
                          />
                        )}
                      </>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={[styles.eventsSectionTitle, { color: colors.text, flex: 1 }]}>
              {showAllEvents ? `${MONTHS[currentMonth]} Ayı Tüm İşler` : (selectedDay ? `${selectedDay} ${MONTHS[currentMonth]} Etkinlikleri` : 'Etkinlikler')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => setShowAllEvents(!showAllEvents)} 
                activeOpacity={0.8}
                style={[
                  styles.toggleBtn, 
                  showAllEvents 
                    ? { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' } 
                    : { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
              >
                <Ionicons name={showAllEvents ? "calendar" : "list-outline"} size={16} color={showAllEvents ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleBtnText, { color: showAllEvents ? colors.primary : colors.textSecondary }]}>
                  {showAllEvents ? 'Takvim' : 'Tümü'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openAddModal} activeOpacity={0.85} style={styles.addBtnContainer}>
                <LinearGradient colors={colors.gradientPrimary} style={styles.addBtnGrad}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {displayedEvents.length === 0 ? (
              <Card style={styles.emptyCard} variant="outlined">
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '08' }]}>
                  <Ionicons name="calendar-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>Bu tarih için kayıt yok</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Sağ üstteki + butonuna dokunarak yeni bir iş planlayabilirsiniz</Text>
              </Card>
            ) : (
              displayedEvents.map(event => {
                const isCompleted = event.status === 'completed';
                return (
                  <Card 
                    key={event.id} 
                    style={styles.eventCard} 
                    variant="accent" 
                    accentColor={isCompleted ? colors.success : colors.primary}
                    elevated
                  >
                    <View style={styles.eventCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                        {event.eventTime && (
                          <View style={styles.timeRow}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{event.eventTime}</Text>
                            {event.hasReminder && (
                              <View style={[styles.reminderBadge, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="notifications" size={12} color="#D97706" />
                                <Text style={styles.reminderBadgeText}>Hatırlatıcı</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      {event.amount ? (
                        <View style={[styles.amountBadge, isCompleted && styles.amountBadgePaid]}>
                          <Text style={[styles.amountText, isCompleted && { color: '#10B981' }]}>
                            ₺{Number(event.amount).toLocaleString('tr-TR')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {event.note && (
                      <View style={[styles.noteContainer, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}>
                        <Text style={[styles.eventNote, { color: colors.textSecondary }]}>{event.note}</Text>
                      </View>
                    )}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.eventActions}>
                      {!isCompleted && (
                        <TouchableOpacity onPress={() => handleComplete(event)} style={styles.actionBtn} activeOpacity={0.7}>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                          <Text style={[styles.actionText, { color: '#10B981' }]}>Tamamla</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => openEditModal(event)} style={styles.actionBtn} activeOpacity={0.7}>
                        <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        <Text style={[styles.actionText, { color: '#3B82F6' }]}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(event)} style={styles.actionBtn} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingEvent ? 'Etkinliği Düzenle' : 'Yeni Kayıt'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Başlık *</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}>
                <Ionicons name="bookmark-outline" size={18} color={colors.primary} style={styles.modalInputIcon} />
                <TextInput 
                  style={[styles.modalInput, { color: colors.text }]} 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder="Örn: Ahmet Bey - Pano Değişimi" 
                  placeholderTextColor={staticColors.textLight} 
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Not (İsteğe Bağlı)</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', height: 80, alignItems: 'flex-start', paddingTop: 12, backgroundColor: colors.backgroundLight }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} style={[styles.modalInputIcon, { marginTop: 2 }]} />
                <TextInput 
                  style={[styles.modalInput, { color: colors.text, height: '100%', textAlignVertical: 'top' }]} 
                  value={note} 
                  onChangeText={setNote} 
                  placeholder="İş detaylarını girin..." 
                  placeholderTextColor={staticColors.textLight} 
                  multiline 
                />
              </View>

              {/* Native Time Picker */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Saat (İsteğe Bağlı)</Text>
              <TouchableOpacity
                style={[styles.modalInputWrapper, styles.timePickerButton, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={eventTime ? colors.primary : staticColors.textLight} style={styles.modalInputIcon} />
                <Text style={[styles.timePickerText, eventTime ? { color: colors.text } : { color: staticColors.textLight }]}>
                  {eventTime || 'Saat seçmek için dokun'}
                </Text>
                {eventTime ? (
                  <TouchableOpacity onPress={() => { setEventTime(''); setHasReminder(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color={staticColors.textLight} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={16} color={staticColors.textLight} />
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
                <View style={[styles.switchRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Hatırlatıcı Kur</Text>
                    <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Belirlenen saatte bildirim gönder</Text>
                  </View>
                  <Switch 
                    value={hasReminder} 
                    onValueChange={setHasReminder} 
                    trackColor={{ true: colors.primary }} 
                    thumbColor={hasReminder ? '#FFF' : '#F1F5F9'} 
                  />
                </View>
              )}

              {!editingEvent && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Ücret (İsteğe Bağlı)</Text>
                  <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}>
                    <Ionicons name="cash-outline" size={18} color={colors.primary} style={styles.modalInputIcon} />
                    <TextInput 
                      style={[styles.modalInput, { color: colors.text }]} 
                      value={amount} 
                      onChangeText={setAmount} 
                      placeholder="Teklif ücretini girin ₺" 
                      placeholderTextColor={staticColors.textLight} 
                      keyboardType="decimal-pad" 
                    />
                  </View>

                  {amount.length > 0 && (
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>Hesap Defterine Ekle</Text>
                        <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Alacak olarak deftere kaydet</Text>
                      </View>
                      <Switch 
                        value={addToLedger} 
                        onValueChange={setAddToLedger} 
                        trackColor={{ true: colors.primary }} 
                        thumbColor={addToLedger ? '#FFF' : '#F1F5F9'} 
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.saveBtn}>
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
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 120 },
  calendarCard: { padding: spacing.md, marginBottom: spacing.md },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.5 },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  dayText: { fontFamily: fonts.medium, fontSize: 13 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2, position: 'absolute', bottom: 4 },
  eventsSection: { marginTop: 8 },
  eventsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eventsSectionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  toggleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  addBtnContainer: { borderRadius: 18, overflow: 'hidden' },
  addBtnGrad: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { fontFamily: fonts.bold, fontSize: 14, marginTop: 4 },
  emptySubtext: { fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', opacity: 0.8, marginTop: 6, lineHeight: 16 },
  eventCard: { padding: spacing.md, marginBottom: 10 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'center' },
  eventTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  timeText: { fontFamily: fonts.medium, fontSize: 12 },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  reminderBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#D97706',
  },
  amountBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amountBadgePaid: { backgroundColor: '#D1FAE5' },
  amountText: { fontFamily: fonts.bold, fontSize: 13, color: '#D97706' },
  noteContainer: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  eventNote: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  divider: {
    height: 1.5,
    marginTop: spacing.md,
    opacity: 0.1,
  },
  eventActions: { flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  actionText: { fontFamily: fonts.bold, fontSize: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 60 : 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.5 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, marginBottom: 6, marginTop: 12 },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingLeft: 12,
    height: 48,
  },
  modalInputIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  timePickerButton: { flexDirection: 'row', alignItems: 'center' },
  timePickerText: { flex: 1, fontFamily: fonts.medium, fontSize: 14 },
  timePickerContainer: { backgroundColor: '#F1F5F9', borderRadius: 14, marginTop: 8, padding: 8, alignItems: 'center', width: '100%' },
  timePickerDoneBtn: { paddingVertical: 8, paddingHorizontal: 24, backgroundColor: '#8B5CF6', borderRadius: 10, marginTop: 4 },
  timePickerDoneText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  switchLabel: { fontFamily: fonts.semiBold, fontSize: 13 },
  switchDesc: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2, opacity: 0.8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, marginTop: 20 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFF' },
});
