import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles, colors } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import dayjs from 'dayjs';
import { API_BASE, getAccessToken } from '../../constants/API';

interface VacationPeriod {
  id: string;
  start: string;
  end: string;
  status: 'Pending' | 'Approved';
}

const initialVacations: VacationPeriod[] = [
  {
    id: '1',
    start: '2025-05-11',
    end: '2025-05-14',
    status: 'Approved'
  }
];

export default function ShiftsScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [modalVisible, setModalVisible] = useState(false);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [requestStart, setRequestStart] = useState('08:00');
  const [requestEnd, setRequestEnd] = useState<string | null>(null);
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [shiftDuration, setShiftDuration] = useState<string | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [vacationModalVisible, setVacationModalVisible] = useState(false);
  const [vacationStart, setVacationStart] = useState(dayjs().format('YYYY-MM-DD'));
  const [vacationEnd, setVacationEnd] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [vacationDuration, setVacationDuration] = useState<number>(1);
  const [vacationStep, setVacationStep] = useState<'start' | 'end'>('start');
  const [vacationConflict, setVacationConflict] = useState<string | null>(null);
  const [vacations, setVacations] = useState<VacationPeriod[]>(initialVacations);

  // Track which month is currently loaded
  const [loadedMonth, setLoadedMonth] = useState(dayjs().format('YYYY-MM'));

  const hourOptions = Array.from({ length: 15 }, (_, h) => {
    const hour = h + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  function calculateDuration(start: string, end: string) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? `${(diff / 60).toFixed(2)}h` : null;
  }

  function calculateVacationDays(start: string, end: string) {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const diff = endDate.diff(startDate, 'day');
    return diff > 0 ? diff : 1;
  }

  // Calculate the start and end of the currently viewed week and month
  const selectedWeekStart = dayjs().startOf('week').add(1, 'day').add(weekOffset, 'week');
  const selectedMonth = selectedWeekStart.format('YYYY-MM');
  const fetchStart = selectedWeekStart.startOf('month').startOf('day');
  const fetchEnd = selectedWeekStart.endOf('month').endOf('day');

  // Calculate the start of the previous week and end of the next week
  const baseWeek = dayjs().startOf('week').add(1, 'day'); // Monday
  const startOfCurrentWeek = baseWeek.add(weekOffset, 'week');
  const startOfPrevWeek = startOfCurrentWeek.subtract(7, 'day');
  const endOfNextWeek = startOfCurrentWeek.add(13, 'day'); // 7 days current + 7 days next - 1

  const selectedDay = dayjs(selectedDate);
  const weekDaysVertical = [];

  for (let i = 0; i < 7; i++) {
    const date = startOfCurrentWeek.add(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    const shift = upcomingShifts.find(s => s.date === dateStr);
    const hasShift = !!shift;
    const isToday = dateStr === dayjs().format('YYYY-MM-DD');
    
    const isVacationDay = vacations.some(v => {
      const start = dayjs(v.start);
      const end = dayjs(v.end);
      const current = dayjs(dateStr);
      return (current.isAfter(start) || current.isSame(start, 'day')) && 
             (current.isBefore(end) || current.isSame(end, 'day'));
    });

    const vacation = vacations.find(v => {
      const start = dayjs(v.start);
      const end = dayjs(v.end);
      const current = dayjs(dateStr);
      return (current.isAfter(start) || current.isSame(start, 'day')) && 
             (current.isBefore(end) || current.isSame(end, 'day'));
    });

    // Check if this is a pending vacation day
    const isPendingVacation = isVacationDay && vacation?.status === 'Pending';

    let shiftDuration = '';
    if (shift) {
      const start = dayjs(`${shift.date}T${shift.start}`);
      const end = dayjs(`${shift.date}T${shift.end}`);
      const hours = end.diff(start, 'hour', true);
      shiftDuration = `${hours % 1 === 0 ? hours : hours.toFixed(2)}h`;
    }

    weekDaysVertical.push(
      <TouchableOpacity
        key={i}
        activeOpacity={(hasShift || isToday || isVacationDay) ? 1 : 0.7}
        onPress={() => {
          if (!hasShift && !isToday && !isVacationDay) {
            setRequestDate(dateStr);
            setRequestStart('08:00');
            setRequestEnd(null);
            setStep('start');
            setShiftDuration(null);
            setModalVisible(true);
          }
        }}
        style={[
          styles.calendarDayRow,
          styles.transparentBackground
        ]}
      >
        <Text style={styles.calendarDayText}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.day() === 0 ? 6 : date.day() - 1]}
        </Text>
        <View
          style={[
            styles.calendarDayCircle,
            {
              backgroundColor: isToday
                ? colors.primary
                : isPendingVacation
                  ? colors.warning // Yellow for pending vacation
                  : isVacationDay
                    ? '#4dabf7' // Blue for approved vacation
                    : hasShift
                      ? colors.accent
                      : colors.backgroundLight,
              borderWidth: isToday ? 2 : 0,
              borderColor: isToday ? colors.accent : 'transparent',
              elevation: isToday ? 2 : 0,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isToday ? 0.15 : 0,
              shadowRadius: 2,
            }
          ]}
        >
          <Text
            style={[
              styles.calendarDayNumber,
              isToday || isVacationDay ? styles.whiteText : styles.normalText,
              (hasShift || isVacationDay) && { fontWeight: 'bold' },
            ]}
          >
            {date.date()}
          </Text>
        </View>
        {hasShift && (
          <View style={styles.calendarShiftInfo}>
            {shift.status === 'Pending' ? (
              <>
                <Ionicons
                  name="briefcase"
                  size={20}
                  color={colors.warning || '#FFA500'}
                  style={styles.iconRightMargin}
                />
                <Text
                  style={[
                    styles.calendarShiftTime,
                    styles.warningText
                  ]}
                >
                  {shift.start} - {shift.end}
                </Text>
                <Text
                  style={[
                    styles.calendarShiftDuration,
                    styles.warningText
                  ]}
                >
                  ({shiftDuration})
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="briefcase"
                  size={20}
                  color={isToday ? colors.white : colors.primary}
                  style={styles.iconRightMargin}
                />
                <Text
                  style={[
                    styles.calendarShiftTime,
                    styles.normalText
                  ]}
                >
                  {shift.start} - {shift.end}
                </Text>
                <Text
                  style={[
                    styles.calendarShiftDuration,
                    styles.greyText
                  ]}
                >
                  ({shiftDuration})
                </Text>
              </>
            )}
          </View>
        )}
        {isVacationDay && !hasShift && (
          <View style={styles.calendarShiftInfo}>
            <Ionicons
              name="airplane"
              size={20}
              color={isPendingVacation ? colors.warning : colors.vacationApproved}
              style={styles.iconRightMargin}
            />
            <Text
              style={[
                styles.calendarShiftTime,
                { color: isPendingVacation ? colors.warning : colors.vacationApproved }
              ]}
            >
              {isPendingVacation ? "Vacation (Pending)" : "Vacation"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Filter shifts for selected date
  const shiftsForSelectedDate = selectedDate
    ? upcomingShifts.filter(s => s.date === selectedDate)
    : [];

  async function fetchShifts() {
    const accessToken = await getAccessToken();
    // Fetch from start of previous week to end of next week
    const from_date = startOfPrevWeek.startOf('day').toISOString();
    const to_date = endOfNextWeek.endOf('day').toISOString();
    const url = `${API_BASE}/v1/couriers/my-schedules/?from_date=${encodeURIComponent(from_date)}&to_date=${encodeURIComponent(to_date)}&status=scheduled&offset=0&limit=100`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    console.log('[Shifts] GET', url, data);

    // Map API shifts to UI format
    const mappedShifts = (data.schedules || []).map((s: any) => {
      const start = dayjs(s.start_datetime);
      const end = dayjs(s.end_datetime);
      return {
        ...s,
        date: start.format('YYYY-MM-DD'),
        start: start.format('HH:mm'),
        end: end.format('HH:mm'),
        status: s.status === 'scheduled' ? 'Scheduled' : s.status
      };
    });

    setUpcomingShifts(mappedShifts);
  }

  // Fetch shifts when the component mounts or when the viewed month changes
  useEffect(() => {
    if (loadedMonth !== selectedMonth) {
      fetchShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  // In your useEffect, trigger fetchShifts when weekOffset changes:
  useEffect(() => {
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Prevent scheduling a shift on a day that already has a shift
  async function postShift({ date, start, end }: { date: string, start: string, end: string }) {
    // Check if a shift already exists for this date
    const alreadyScheduled = upcomingShifts.some(s => s.date === date);
    if (alreadyScheduled) {
      alert('You already have a shift scheduled for this day.');
      return;
    }

    const accessToken = await getAccessToken();
    const payload = {
      start_datetime: `${date}T${start}:00.000Z`,
      end_datetime: `${date}T${end}:00.000Z`,
      status: 'scheduled',
      notes: 'Created from app'
    };
    console.log('[Shift] POST Sending:', payload);

    const res = await fetch(`${API_BASE}/v1/couriers/my-schedules/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[Shift] POST Response:', data);

    // Refresh shifts after scheduling
    await fetchShifts();
    return data;
  }

  // When creating a shift request, POST to the backend and refresh shifts
  async function postShiftRequest({ date, start, end }: { date: string, start: string, end: string }) {
    const accessToken = await getAccessToken();
    const payload = {
      start_datetime: `${date}T${start}:00.000Z`,
      end_datetime: `${date}T${end}:00.000Z`,
      status: 'scheduled',
    };
    console.log('[ShiftRequest] Sending:', payload);
    const res = await fetch(`${API_BASE}/v1/couriers/schedules/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[ShiftRequest] Response:', data);
    fetchShifts();
    return data;
  }

  const basePay = 133;
  const midnightBonus = 25;
  let totalHours = 0;
  let totalEarnings = 0;


  const startOfWeek = startOfCurrentWeek.startOf('day');
  const endOfWeek = startOfCurrentWeek.add(6, 'day').endOf('day');

  upcomingShifts.forEach(shift => {
    const shiftDate = dayjs(shift.date);
    if (shiftDate.isBefore(startOfWeek, 'day') || shiftDate.isAfter(endOfWeek, 'day')) return;

    const start = dayjs(`${shift.date}T${shift.start}`);
    const end = dayjs(`${shift.date}T${shift.end}`);
    let hours = end.diff(start, 'minute') / 60;
    totalHours += hours;

    let bonusHours = 0;
    let bonusStart = dayjs(`${shift.date}T18:00`);
    let bonusEnd = dayjs(`${shift.date}T22:00`);
    if (end.isAfter(bonusStart)) {
      const bonusPeriodStart = start.isAfter(bonusStart) ? start : bonusStart;
      const bonusPeriodEnd = end.isBefore(bonusEnd) ? end : bonusEnd;
      if (bonusPeriodEnd.isAfter(bonusPeriodStart)) {
        bonusHours = bonusPeriodEnd.diff(bonusPeriodStart, 'minute') / 60;
      }
    }

    // Earnings: base pay for all hours, bonus for bonus hours
    totalEarnings += hours * basePay + bonusHours * midnightBonus;
  });

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleSidebar}
        >
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.vacationButton || styles.chatButton}
          onPress={() => setVacationModalVisible(true)}
        >
          <Ionicons name="airplane" size={26} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Shifts</Text>

        <View style={styles.calendarContainer}>
          <View style={styles.weekNavContainer}>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.calendarDateText}>
              {startOfWeek.format('MMMM YYYY')}
            </Text>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)}>
              <Ionicons name="chevron-forward" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.calendar, styles.calendarPadding]}>
            {weekDaysVertical}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Shift</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: '#4dabf7' }]} />
              <Text style={styles.legendText}>Vacation</Text>
            </View>
          </View>
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                Workhours: {Math.floor(totalHours)}h
              </Text>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                Est. earnings: {totalEarnings.toFixed(2)} DKK
              </Text>
            </View>
        </View>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPressOut={() => setModalVisible(false)}
        >
          <View
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              Create shift request
            </Text>
            <Text style={styles.modalSubtitle}>
              {requestDate ? dayjs(requestDate).format('DD/MM/YYYY') : ''}
            </Text>
            {step === 'start' && (
              <>
                <Text style={styles.formLabel}>Select start hour:</Text>
                <Picker
                  selectedValue={requestStart}
                  style={styles.pickerContainer}
                  onValueChange={(value) => setRequestStart(value)}
                >
                  {hourOptions.map(h =>
                    <Picker.Item key={h} label={h} value={h} />
                  )}
                </Picker>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setStep('end')}
                  >
                    <Text style={styles.buttonText}>Next</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {step === 'end' && (
              <>
                <Text style={styles.formLabel}>Select end hour:</Text>
                <Picker
                  selectedValue={requestEnd || hourOptions[0]}
                  style={styles.pickerContainer}
                  onValueChange={(value) => {
                    setRequestEnd(value);
                    const duration = calculateDuration(requestStart, value);
                    setShiftDuration(duration);
                  }}
                >
                  {hourOptions
                    .filter(h => h > requestStart)
                    .map(h =>
                      <Picker.Item key={h} label={h} value={h} />
                    )}
                </Picker>
                {shiftDuration && (
                  <Text style={styles.shiftDurationText}>
                    Shift duration: {shiftDuration}
                  </Text>
                )}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton, 
                      shiftDuration ? styles.activeButton : styles.inactiveButton
                    ]}
                    disabled={!shiftDuration}
                    onPress={async () => {
                      await postShift({
                        date: requestDate!,
                        start: requestStart,
                        end: requestEnd!
                      });
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Create shift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep('start')}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Vacation request modal */}
      <Modal
        visible={vacationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVacationModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPressOut={() => setVacationModalVisible(false)}
        >
          <View
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              Request Vacation
            </Text>
            
            {vacationStep === 'start' && (
              <>
                <Text style={styles.formLabel}>Start day:</Text>
                <Picker
                  selectedValue={vacationStart}
                  style={styles.pickerContainer}
                  onValueChange={(value) => {
                    setVacationStart(value);
                    setVacationConflict(null);
                  }}
                >
                  {Array.from({ length: 30 }, (_, i) => {
                    const date = dayjs().add(i, 'day').format('YYYY-MM-DD');
                    return <Picker.Item key={date} label={dayjs(date).format('DD/MM/YYYY')} value={date} />;
                  })}
                </Picker>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      setVacationStep('end');
                      const minEndDate = dayjs(vacationStart).add(1, 'day');
                      if (dayjs(vacationEnd).isBefore(minEndDate)) {
                        setVacationEnd(minEndDate.format('YYYY-MM-DD'));
                      }
                      setVacationConflict(null);
                      const days = calculateVacationDays(vacationStart, vacationEnd);
                      setVacationDuration(days);
                    }}
                  >
                    <Text style={styles.buttonText}>Next</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setVacationModalVisible(false);
                      setVacationStep('start');
                      setVacationConflict(null);
                    }}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            {vacationStep === 'end' && (
              <>
                <Text style={styles.boldFormLabel}>
                  Start day: {dayjs(vacationStart).format('DD/MM/YYYY')}
                </Text>
                <Text style={styles.spacedFormLabel}>End day:</Text>
                <Picker
                  selectedValue={vacationEnd}
                  style={styles.pickerContainer}
                  onValueChange={(value) => {
                    setVacationEnd(value);
                    const days = calculateVacationDays(vacationStart, value);
                    setVacationDuration(days);
                    const start = dayjs(vacationStart);
                    const end = dayjs(value);
                    setVacationConflict(null);
                    for (const shift of upcomingShifts) {
                      if (shift.status !== 'Scheduled') continue;
                      const shiftDate = dayjs(shift.date);
                      if ((shiftDate.isAfter(start) || shiftDate.isSame(start, 'day')) && 
                          (shiftDate.isBefore(end) || shiftDate.isSame(end, 'day'))) {
                        setVacationConflict(dayjs(shift.date).format('DD/MM/YYYY'));
                        break;
                      }
                    }
                  }}
                >
                  {Array.from({ length: 30 }, (_, i) => {
                    const minDay = dayjs(vacationStart).add(1, 'day').diff(dayjs(), 'day');
                    const date = dayjs().add(i + minDay, 'day').format('YYYY-MM-DD');
                    return <Picker.Item key={date} label={dayjs(date).format('DD/MM/YYYY')} value={date} />;
                  })}
                </Picker>
                
                <Text style={styles.durationText}>
                  Vacation duration: {vacationDuration} {vacationDuration === 1 ? 'day' : 'days'}
                </Text>
                
                {vacationConflict && (
                  <Text style={styles.errorText}>
                    You have a scheduled shift on {vacationConflict}.
                  </Text>
                )}
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      vacationConflict ? styles.inactiveButton : styles.activeButton
                    ]}
                    disabled={!!vacationConflict}
                    onPress={() => {
                      setVacations([
                        ...vacations,
                        {
                          id: (vacations.length + 1).toString(),
                          start: vacationStart,
                          end: vacationEnd,
                          status: 'Pending' // init status pending
                        }
                      ]);
                      setVacationModalVisible(false);
                      setVacationStep('start');
                    }}
                  >
                    <Text style={styles.buttonText}>Request vacation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setVacationStep('start')}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}