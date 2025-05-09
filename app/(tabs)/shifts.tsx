import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles, colors } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import dayjs from 'dayjs';

interface VacationPeriod {
  id: string;
  start: string;
  end: string;
  status: 'Pending' | 'Approved';
}

const initialShifts = [
  {
    id: '1',
    date: '2025-05-10',
    start: '09:00',
    end: '17:00',
    status: 'Scheduled',
  },
  {
    id: '2',
    date: '2025-06-12',
    start: '12:00',
    end: '20:00',
    status: 'Scheduled',
  },
  {
    id: '3',
    date: '2024-06-15',
    start: '10:00',
    end: '18:00',
    status: 'Pending',
  },
];

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
  const today = dayjs();
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'));
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [modalVisible, setModalVisible] = useState(false);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [requestStart, setRequestStart] = useState('08:00');
  const [requestEnd, setRequestEnd] = useState<string | null>(null);
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [shiftDuration, setShiftDuration] = useState<string | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState(initialShifts);
  const [vacationModalVisible, setVacationModalVisible] = useState(false);
  const [vacationStart, setVacationStart] = useState(dayjs().format('YYYY-MM-DD'));
  const [vacationEnd, setVacationEnd] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [vacationDuration, setVacationDuration] = useState<number>(1);
  const [vacationStep, setVacationStep] = useState<'start' | 'end'>('start');
  const [vacationConflict, setVacationConflict] = useState<string | null>(null);
  const [vacations, setVacations] = useState<VacationPeriod[]>(initialVacations);

  // Helper: generate hour options between 08:00 and 22:00
  const hourOptions = Array.from({ length: 15 }, (_, h) => {
    const hour = h + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Helper: calculate duration in hours
  function calculateDuration(start: string, end: string) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? `${(diff / 60).toFixed(2)}h` : null;
  }

  // Helper: calculate vacation days
  function calculateVacationDays(start: string, end: string) {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const diff = endDate.diff(startDate, 'day');
    return diff > 0 ? diff : 1;
  }

  // Calculate the start of the week based on offset
  const selectedDay = dayjs(selectedDate);
  const baseWeek = today.startOf('week').add(1, 'day'); // Monday
  const startOfWeek = baseWeek.add(weekOffset, 'week');
  const weekDaysVertical = [];

  for (let i = 0; i < 7; i++) {
    const date = startOfWeek.add(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    const shift = upcomingShifts.find(s => s.date === dateStr);
    const hasShift = !!shift;
    const isToday = dateStr === today.format('YYYY-MM-DD');
    
    // Check if this is a vacation day
    const isVacationDay = vacations.some(v => {
      const start = dayjs(v.start);
      const end = dayjs(v.end);
      const current = dayjs(dateStr);
      return (current.isAfter(start) || current.isSame(start, 'day')) && 
             (current.isBefore(end) || current.isSame(end, 'day'));
    });

    // Find vacation information for this day if any
    const vacation = vacations.find(v => {
      const start = dayjs(v.start);
      const end = dayjs(v.end);
      const current = dayjs(dateStr);
      return (current.isAfter(start) || current.isSame(start, 'day')) && 
             (current.isBefore(end) || current.isSame(end, 'day'));
    });

    // Check if this is a pending vacation day
    const isPendingVacation = isVacationDay && vacation?.status === 'Pending';

    // Calculate shift duration if shift exists
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
              <View style={[styles.legendColorBox, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: '#4dabf7' }]} />
              <Text style={styles.legendText}>Vacation</Text>
            </View>
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
                    onPress={() => {
                      setUpcomingShifts([
                        ...upcomingShifts,
                        {
                          id: (upcomingShifts.length + 1).toString(),
                          date: requestDate!,
                          start: requestStart,
                          end: requestEnd!,
                          status: 'Pending',
                        }
                      ]);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Create shift request</Text>
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
                      // Set end date to at least one day after start
                      const minEndDate = dayjs(vacationStart).add(1, 'day');
                      if (dayjs(vacationEnd).isBefore(minEndDate)) {
                        setVacationEnd(minEndDate.format('YYYY-MM-DD'));
                      }
                      // Reset conflict
                      setVacationConflict(null);
                      // Calculate duration
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
                      
                      // Reset and close modal
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