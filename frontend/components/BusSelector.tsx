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

interface Bus {
  id: string;
  name: string;
  registration?: string;
}

interface BusSelectorProps {
  buses: Bus[];
  selectedBusId: string;
  onSelect: (busId: string) => void;
  placeholder?: string;
  allowAll?: boolean;
}

export default function BusSelector({ 
  buses, 
  selectedBusId, 
  onSelect, 
  placeholder = "Sélectionner un bus",
  allowAll = false 
}: BusSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedBus = buses.find(b => b.id === selectedBusId);
  const displayText = selectedBusId === '' && allowAll 
    ? 'Tous les bus' 
    : selectedBus 
      ? selectedBus.name 
      : placeholder;

  const handleSelect = (busId: string) => {
    onSelect(busId);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="bus" size={20} color="#3B82F6" />
          <Text style={[
            styles.selectorText,
            !selectedBusId && !allowAll && styles.placeholderText
          ]}>
            {displayText}
          </Text>
        </View>
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
              <Text style={styles.modalTitle}>Sélectionner un bus</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {allowAll && (
                <TouchableOpacity
                  style={[
                    styles.busItem,
                    selectedBusId === '' && styles.busItemActive,
                  ]}
                  onPress={() => handleSelect('')}
                >
                  <View style={styles.busItemContent}>
                    <Ionicons 
                      name="apps" 
                      size={24} 
                      color={selectedBusId === '' ? '#3B82F6' : '#9CA3AF'} 
                    />
                    <View style={styles.busItemText}>
                      <Text style={[
                        styles.busName,
                        selectedBusId === '' && styles.busNameActive
                      ]}>
                        Tous les bus
                      </Text>
                    </View>
                  </View>
                  {selectedBusId === '' && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}

              {buses.map((bus) => (
                <TouchableOpacity
                  key={bus.id}
                  style={[
                    styles.busItem,
                    selectedBusId === bus.id && styles.busItemActive,
                  ]}
                  onPress={() => handleSelect(bus.id)}
                >
                  <View style={styles.busItemContent}>
                    <Ionicons 
                      name="bus" 
                      size={24} 
                      color={selectedBusId === bus.id ? '#3B82F6' : '#9CA3AF'} 
                    />
                    <View style={styles.busItemText}>
                      <Text style={[
                        styles.busName,
                        selectedBusId === bus.id && styles.busNameActive
                      ]}>
                        {bus.name}
                      </Text>
                      {bus.registration && (
                        <Text style={styles.busRegistration}>{bus.registration}</Text>
                      )}
                    </View>
                  </View>
                  {selectedBusId === bus.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#374151',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#6B7280',
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
    maxHeight: '70%',
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
    padding: 16,
  },
  busItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#374151',
  },
  busItemActive: {
    backgroundColor: '#1E3A5F',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  busItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  busItemText: {
    flex: 1,
  },
  busName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  busNameActive: {
    color: '#fff',
  },
  busRegistration: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
