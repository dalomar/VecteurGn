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
import { useStore, Transaction } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';

export default function TransactionsScreen() {
  const [filterBusId, setFilterBusId] = useState('');
  const [filterType, setFilterType] = useState<'' | 'recette' | 'depense'>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [selectedBusId, setSelectedBusId] = useState('');
  const [type, setType] = useState<'recette' | 'depense'>('recette');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { transactions, buses, fetchTransactions, fetchBuses, createTransaction, updateTransaction, deleteTransaction } = useStore();

  useEffect(() => {
    fetchBuses();
    fetchTransactions();
  }, []);

  const applyFilters = () => {
    fetchTransactions(filterBusId || undefined, filterType || undefined);
  };

  const clearFilters = () => {
    setFilterBusId('');
    setFilterType('');
    fetchTransactions();
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    setSelectedBusId('');
    setType('recette');
    setCategory('');
    setAmount('');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setSelectedBusId(transaction.busId);
    setType(transaction.type);
    setCategory(transaction.category);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedBusId || !category || !amount) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const transactionData = {
        busId: selectedBusId,
        type,
        category,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString(),
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionData);
        Alert.alert('Succès', 'Transaction modifiée avec succès!');
      } else {
        await createTransaction(transactionData);
        Alert.alert('Succès', 'Transaction ajoutée avec succès!');
      }

      setModalVisible(false);
      applyFilters();
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      'Supprimer la transaction',
      'Êtes-vous sûr de vouloir supprimer cette transaction ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              Alert.alert('Succès', 'Transaction supprimée avec succès!');
              applyFilters();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la transaction');
            }
          },
        },
      ]
    );
  };

  const getBusName = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.name : 'Bus inconnu';
  };

  const getBusCurrency = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.currency : 'GNF';
  };

  const recetteCategories = ['recette', 'billets', 'location', 'autres'];
  const depenseCategories = ['carburant', 'entretien', 'assurance', 'salaires', 'autres'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Bus:</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, filterBusId === '' && styles.filterChipActive]}
                  onPress={() => setFilterBusId('')}
                >
                  <Text style={[styles.filterChipText, filterBusId === '' && styles.filterChipTextActive]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {buses.map(bus => (
                  <TouchableOpacity
                    key={bus.id}
                    style={[styles.filterChip, filterBusId === bus.id && styles.filterChipActive]}
                    onPress={() => setFilterBusId(bus.id)}
                  >
                    <Text style={[styles.filterChipText, filterBusId === bus.id && styles.filterChipTextActive]}>
                      {bus.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, filterType === '' && styles.typeButtonActive]}
                onPress={() => setFilterType('')}
              >
                <Text style={[styles.typeButtonText, filterType === '' && styles.typeButtonTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, filterType === 'recette' && styles.typeButtonActiveRecette]}
                onPress={() => setFilterType('recette')}
              >
                <Text style={[styles.typeButtonText, filterType === 'recette' && styles.typeButtonTextActive]}>
                  Recettes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, filterType === 'depense' && styles.typeButtonActiveDepense]}
                onPress={() => setFilterType('depense')}
              >
                <Text style={[styles.typeButtonText, filterType === 'depense' && styles.typeButtonTextActive]}>
                  Dépenses
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color="#6B7280" />
            <Text style={styles.emptyText}>Aucune transaction</Text>
            <Text style={styles.emptySubtext}>Ajoutez votre première transaction</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={[
                  styles.transactionIcon,
                  transaction.type === 'recette' ? styles.recetteIcon : styles.depenseIcon
                ]}>
                  <Ionicons
                    name={transaction.type === 'recette' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionBus}>{getBusName(transaction.busId)}</Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {format(new Date(transaction.date), 'dd MMM yyyy à HH:mm')}
                  </Text>
                </View>
                <View style={styles.transactionActions}>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.type === 'recette' ? styles.recetteAmount : styles.depenseAmount
                  ]}>
                    {transaction.type === 'recette' ? '+' : '-'}
                    {transaction.amount.toLocaleString('fr-FR')} {getBusCurrency(transaction.busId)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => openEditModal(transaction)}>
                      <Ionicons name="create-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(transaction)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {transaction.description ? (
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
              ) : null}
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
                {editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'recette' && styles.typeButtonActiveRecette,
                  ]}
                  onPress={() => {
                    setType('recette');
                    setCategory('');
                  }}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === 'recette' && styles.typeButtonTextActive,
                    ]}
                  >
                    Recette
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'depense' && styles.typeButtonActiveDepense,
                  ]}
                  onPress={() => {
                    setType('depense');
                    setCategory('');
                  }}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === 'depense' && styles.typeButtonTextActive,
                    ]}
                  >
                    Dépense
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Bus *</Text>
              <View style={styles.categoryGrid}>
                {buses.map((bus) => (
                  <TouchableOpacity
                    key={bus.id}
                    style={[
                      styles.categoryChip,
                      selectedBusId === bus.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedBusId(bus.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedBusId === bus.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {bus.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Catégorie *</Text>
              <View style={styles.categoryGrid}>
                {(type === 'recette' ? recetteCategories : depenseCategories).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Montant *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Détails..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {editingTransaction ? 'Modifier' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterSection: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  pickerContainer: {
    height: 40,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonActiveRecette: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonActiveDepense: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: 'bold',
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
  transactionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recetteIcon: {
    backgroundColor: '#10B981',
  },
  depenseIcon: {
    backgroundColor: '#EF4444',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionBus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionActions: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recetteAmount: {
    color: '#10B981',
  },
  depenseAmount: {
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
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
