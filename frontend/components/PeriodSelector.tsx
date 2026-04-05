import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Period = 'day' | 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  onPeriodChange: (period: Period, year: number, month?: number, week?: number) => void;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function PeriodSelector({ onPeriodChange }: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Generate years (current year and 5 years back)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleApply = () => {
    if (selectedPeriod === 'week') {
      onPeriodChange(selectedPeriod, selectedYear, selectedMonth, selectedWeek);
    } else if (selectedPeriod === 'month') {
      onPeriodChange(selectedPeriod, selectedYear, selectedMonth);
    } else if (selectedPeriod === 'year') {
      onPeriodChange(selectedPeriod, selectedYear);
    } else {
      onPeriodChange(selectedPeriod, selectedYear, selectedMonth);
    }
    setModalVisible(false);
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'day') {
      return `Aujourd'hui`;
    } else if (selectedPeriod === 'week') {
      return `S${selectedWeek} - ${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    } else if (selectedPeriod === 'month') {
      return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    } else {
      return `Année ${selectedYear}`;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="calendar" size={20} color="#3B82F6" />
        <Text style={styles.selectorText}>{getPeriodLabel()}</Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner la période</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Period Type */}
              <Text style={styles.sectionLabel}>Type de période</Text>
              <View style={styles.periodTypes}>
                {(['day', 'week', 'month', 'year'] as Period[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodType,
                      selectedPeriod === period && styles.periodTypeActive,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodTypeText,
                        selectedPeriod === period && styles.periodTypeTextActive,
                      ]}
                    >
                      {period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Year Selection */}
              <Text style={styles.sectionLabel}>Année</Text>
              <View style={styles.yearGrid}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearButton,
                      selectedYear === year && styles.yearButtonActive,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearButtonText,
                        selectedYear === year && styles.yearButtonTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Month Selection (for day, week, month) */}
              {selectedPeriod !== 'year' && (
                <>
                  <Text style={styles.sectionLabel}>Mois</Text>
                  <View style={styles.monthGrid}>
                    {MONTHS.map((month, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.monthButton,
                          selectedMonth === index + 1 && styles.monthButtonActive,
                        ]}
                        onPress={() => setSelectedMonth(index + 1)}
                      >
                        <Text
                          style={[
                            styles.monthButtonText,
                            selectedMonth === index + 1 && styles.monthButtonTextActive,
                          ]}
                        >
                          {month.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Week Selection (for week only) */}
              {selectedPeriod === 'week' && (
                <>
                  <Text style={styles.sectionLabel}>Semaine du mois</Text>
                  <View style={styles.weekGrid}>
                    {[1, 2, 3, 4, 5].map((week) => (
                      <TouchableOpacity
                        key={week}
                        style={[
                          styles.weekButton,
                          selectedWeek === week && styles.weekButtonActive,
                        ]}
                        onPress={() => setSelectedWeek(week)}
                      >
                        <Text
                          style={[
                            styles.weekButtonText,
                            selectedWeek === week && styles.weekButtonTextActive,
                          ]}
                        >
                          S{week}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginTop: 12,
    marginBottom: 12,
  },
  periodTypes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodType: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  periodTypeActive: {
    backgroundColor: '#3B82F6',
  },
  periodTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  periodTypeTextActive: {
    color: '#fff',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  yearButton: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: '#3B82F6',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  yearButtonTextActive: {
    color: '#fff',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  monthButton: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#3B82F6',
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  monthButtonTextActive: {
    color: '#fff',
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  weekButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  weekButtonActive: {
    backgroundColor: '#3B82F6',
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  weekButtonTextActive: {
    color: '#fff',
  },
  applyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
