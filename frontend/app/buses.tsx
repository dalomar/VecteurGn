import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Bus } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function BusesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [currency, setCurrency] = useState<'GNF' | 'EUR'>('GNF');
  const [dailyTarget, setDailyTarget] = useState('');
  const [staff, setStaff] = useState(['', '', '', '', '']);

  const { buses, fetchBuses, createBus, updateBus, deleteBus } = useStore();

  useEffect(() => {
    fetchBuses();
  }, []);

  const openCreateModal = () => {
    setEditingBus(null);
    setName('');
    setRegistration('');
    setCurrency('GNF');
    setDailyTarget('');
    setStaff(['', '', '', '', '']);
    setModalVisible(true);
  };

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setName(bus.name);
    setRegistration(bus.registration);
    setCurrency(bus.currency);
    setDailyTarget(bus.dailyTarget.toString());
    setStaff(bus.staff);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!name || !registration || !dailyTarget) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs obligatoires',
        position: 'top',
      });
      return;
    }

    try {
      const busData = {
        name,
        registration,
        currency,
        dailyTarget: parseFloat(dailyTarget),
        staff,
      };

      if (editingBus) {
        await updateBus(editingBus.id, busData);
        Toast.show({
          type: 'success',
          text1: 'Succès',
          text2: 'Bus modifié avec succès!',
          position: 'top',
        });
      } else {
        await createBus(busData);
        Toast.show({
          type: 'success',
          text1: 'Succès',
          text2: 'Bus ajouté avec succès!',
          position: 'top',
        });
      }

      setModalVisible(false);
      fetchBuses();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Une erreur est survenue',
        position: 'top',
      });
    }
  };

  const handleDelete = (bus: Bus) => {
    Alert.alert(
      'Supprimer le bus',
      `Êtes-vous sûr de vouloir supprimer "${bus.name}" ? Toutes les transactions associées seront également supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBus(bus.id);
              Toast.show({
                type: 'success',
                text1: 'Succès',
                text2: 'Bus supprimé avec succès!',
                position: 'top',
              });
              fetchBuses();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Impossible de supprimer le bus',
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des Bus</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {buses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bus-outline" size={80} color="#6B7280" />
            <Text style={styles.emptyText}>Aucun bus enregistré</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter votre premier bus</Text>
          </View>
        ) : (
          buses.map((bus) => (
            <View key={bus.id} style={styles.busCard}>
              <View style={styles.busHeader}>
                <View style={styles.busIcon}>
                  <Ionicons name="bus" size={24} color="#3B82F6" />
                </View>
                <View style={styles.busInfo}>
                  <Text style={styles.busName}>{bus.name}</Text>
                  <Text style={styles.busRegistration}>{bus.registration}</Text>
                </View>
                <View style={styles.busActions}>
                  <TouchableOpacity onPress={() => openEditModal(bus)} style={styles.iconButton}>
                    <Ionicons name="create-outline" size={24} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(bus)} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.busDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.detailLabel}>Devise:</Text>
                  <Text style={styles.detailValue}>{bus.currency}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="trending-up-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.detailLabel}>Objectif journalier:</Text>
                  <Text style={styles.detailValue}>
                    {bus.dailyTarget.toLocaleString('fr-FR')} {bus.currency}
                  </Text>
                </View>
              </View>

              <View style={styles.staffSection}>
                <Text style={styles.staffTitle}>Personnel:</Text>
                {bus.staff.filter(s => s.trim() !== '').length === 0 ? (
                  <Text style={styles.staffEmpty}>Aucun personnel enregistré</Text>
                ) : (
                  <View style={styles.staffList}>
                    {bus.staff.filter(s => s.trim() !== '').map((person, index) => (
                      <View key={index} style={styles.staffChip}>
                        <Ionicons name="person" size={12} color="#3B82F6" />
                        <Text style={styles.staffName}>{person}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBus ? 'Modifier le bus' : 'Nouveau bus'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nom du bus *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Bus Express 1"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Immatriculation *</Text>
              <TextInput
                style={styles.input}
                value={registration}
                onChangeText={setRegistration}
                placeholder="Ex: AB-1234-CD"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Devise *</Text>
              <View style={styles.currencyButtons}>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    currency === 'GNF' && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency('GNF')}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      currency === 'GNF' && styles.currencyButtonTextActive,
                    ]}
                  >
                    GNF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    currency === 'EUR' && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency('EUR')}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      currency === 'EUR' && styles.currencyButtonTextActive,
                    ]}
                  >
                    EUR
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Objectif journalier *</Text>
              <TextInput
                style={styles.input}
                value={dailyTarget}
                onChangeText={setDailyTarget}
                keyboardType="numeric"
                placeholder="Ex: 1000000"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Personnel (5 personnes max)</Text>
              {staff.map((person, index) => (
                <TextInput
                  key={index}
                  style={[styles.input, styles.staffInput]}
                  value={person}
                  onChangeText={(text) => {
                    const newStaff = [...staff];
                    newStaff[index] = text;
                    setStaff(newStaff);
                  }}
                  placeholder={`Personne ${index + 1}`}
                  placeholderTextColor="#6B7280"
                />
              ))}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {editingBus ? 'Modifier' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  busCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  busIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#374151',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  busRegistration: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  busActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  busDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  staffSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  staffTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  staffEmpty: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  staffList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  staffName: {
    fontSize: 12,
    color: '#D1D5DB',
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
    maxHeight: '90%',
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
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  staffInput: {
    marginTop: 8,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
