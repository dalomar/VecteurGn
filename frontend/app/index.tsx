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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import PeriodSelector from '../components/PeriodSelector';

type Period = 'day' | 'week' | 'month' | 'year';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'recette' | 'depense'>('recette');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { ranking, busBalances, buses, fetchRanking, fetchBusBalances, fetchBuses, createTransaction } = useStore();

  useEffect(() => {
    fetchBuses();
    fetchBusBalances();
    const now = new Date();
    fetchRanking('month', now.getFullYear(), now.getMonth() + 1);
  }, []);

  const handlePeriodChange = (period: Period, year: number, month?: number, week?: number) => {
    fetchRanking(period, year, month, week);
  };

  const handleQuickTransaction = async () => {
    if (!selectedBusId || !category || !amount) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs obligatoires',
        position: 'top',
      });
      return;
    }

    try {
      await createTransaction({
        busId: selectedBusId,
        type: transactionType,
        category,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString(),
      });

      // Reset form
      setSelectedBusId('');
      setCategory('');
      setAmount('');
      setDescription('');
      setModalVisible(false);

      // Refresh data
      fetchBusBalances();
      fetchRanking(selectedPeriod);

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Transaction ajoutée avec succès!',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: "Erreur lors de l'ajout de la transaction",
        position: 'top',
      });
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🏆';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#10B981';
    if (percentage >= 50) return '#3B82F6';
    return '#EF4444';
  };

  const recetteCategories = ['billets', 'location', 'autres'];
  const depenseCategories = ['carburant', 'entretien', 'assurance', 'salaires', 'autres'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="bus" size={32} color="#3B82F6" />
          </View>
          <Text style={styles.headerTitle}>Vecteur GN</Text>
          <Text style={styles.headerSubtitle}>Tableau de bord</Text>
        </View>

        {/* Balance Section - Par Bus */}
        <View style={styles.balanceSection}>
          <Text style={styles.sectionTitle}>💰 Solde par Bus</Text>
          {busBalances.length === 0 ? (
            <View style={styles.emptyBalanceCard}>
              <Text style={styles.emptyBalanceText}>Aucun bus enregistré</Text>
            </View>
          ) : (
            busBalances.map((busBalance) => (
              <View key={busBalance.id} style={styles.busBalanceCard}>
                <View style={styles.busBalanceHeader}>
                  <Ionicons name="bus" size={20} color="#3B82F6" />
                  <Text style={styles.busBalanceName}>{busBalance.name}</Text>
                </View>
                <View style={styles.busBalanceStats}>
                  <View style={styles.busBalanceStat}>
                    <Text style={styles.busBalanceLabel}>Solde</Text>
                    <Text style={[
                      styles.busBalanceValue,
                      busBalance.balance >= 0 ? styles.positive : styles.negative
                    ]}>
                      {formatCurrency(busBalance.balance, busBalance.currency)}
                    </Text>
                  </View>
                  <View style={styles.busBalanceStat}>
                    <Text style={styles.busBalanceLabel}>Recettes</Text>
                    <Text style={[styles.busBalanceValue, styles.recetteColor]}>
                      {formatCurrency(busBalance.recettes, busBalance.currency)}
                    </Text>
                  </View>
                  <View style={styles.busBalanceStat}>
                    <Text style={styles.busBalanceLabel}>Dépenses</Text>
                    <Text style={[styles.busBalanceValue, styles.depenseColor]}>
                      {formatCurrency(busBalance.depenses, busBalance.currency)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Actions Rapides</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.recetteButton]}
              onPress={() => {
                setTransactionType('recette');
                setCategory('');
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={28} color="#fff" />
              <Text style={styles.actionButtonText}>Nouvelle Recette</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.depenseButton]}
              onPress={() => {
                setTransactionType('depense');
                setCategory('');
                setModalVisible(true);
              }}
            >
              <Ionicons name="remove-circle" size={28} color="#fff" />
              <Text style={styles.actionButtonText}>Nouvelle Dépense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ranking Section */}
        <View style={styles.rankingSection}>
          <View style={styles.rankingHeader}>
            <Text style={styles.sectionTitle}>🏆 Classement des Bus</Text>
          </View>

          {/* Period Selector */}
          <PeriodSelector onPeriodChange={handlePeriodChange} />

          {/* Ranking List */}
          {ranking.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={64} color="#6B7280" />
              <Text style={styles.emptyText}>Aucun bus enregistré</Text>
              <Text style={styles.emptySubtext}>Ajoutez votre premier bus dans l'onglet Bus</Text>
            </View>
          ) : (
            ranking.map((item, index) => {
              const busBalance = busBalances.find(b => b.id === item.id);
              return (
                <View key={item.id} style={styles.rankCard}>
                  <View style={styles.rankHeader}>
                    <Text style={styles.rankIcon}>{getRankIcon(index)}</Text>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{item.name}</Text>
                      <Text style={styles.rankRegistration}>Objectif: {formatCurrency(item.target, item.currency)}</Text>
                    </View>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankRevenue}>{formatCurrency(item.revenue, item.currency)}</Text>
                      <Text
                        style={[
                          styles.rankPercentage,
                          { color: getProgressColor(item.percentage) },
                        ]}
                      >
                        {item.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(item.percentage, 100)}%`,
                          backgroundColor: getProgressColor(item.percentage),
                        },
                      ]}
                    />
                  </View>
                  {/* Total Recettes et Dépenses */}
                  {busBalance && (
                    <View style={styles.rankFooter}>
                      <View style={styles.rankFooterItem}>
                        <Text style={styles.rankFooterLabel}>Recettes:</Text>
                        <Text style={[styles.rankFooterValue, styles.recetteColor]}>
                          {formatCurrency(busBalance.recettes, item.currency)}
                        </Text>
                      </View>
                      <View style={styles.rankFooterItem}>
                        <Text style={styles.rankFooterLabel}>Dépenses:</Text>
                        <Text style={[styles.rankFooterValue, styles.depenseColor]}>
                          {formatCurrency(busBalance.depenses, item.currency)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Footer - Propriétaire */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Développé par Oumar DRAMÉ</Text>
        </View>
      </ScrollView>

      {/* Quick Transaction Modal */}
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
                {transactionType === 'recette' ? 'Nouvelle Recette' : 'Nouvelle Dépense'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Bus Selection */}
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

              {/* Category Selection */}
              <Text style={styles.label}>Catégorie *</Text>
              <View style={styles.categoryGrid}>
                {(transactionType === 'recette' ? recetteCategories : depenseCategories).map((cat) => (
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

              {/* Amount */}
              <Text style={styles.label}>Montant *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B7280"
              />

              {/* Description */}
              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Détails de la transaction..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  transactionType === 'recette' ? styles.recetteButton : styles.depenseButton,
                ]}
                onPress={handleQuickTransaction}
              >
                <Text style={styles.submitButtonText}>Enregistrer</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1F2937',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  balanceSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  busBalanceCard: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  busBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  busBalanceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  busBalanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busBalanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  busBalanceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  busBalanceValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  recetteColor: {
    color: '#10B981',
  },
  depenseColor: {
    color: '#EF4444',
  },
  emptyBalanceCard: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyBalanceText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  quickActions: {
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  recetteButton: {
    backgroundColor: '#10B981',
  },
  depenseButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankingSection: {
    padding: 16,
    paddingBottom: 16,
  },
  rankingHeader: {
    marginBottom: 12,
  },
  periodFilter: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  rankCard: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankIcon: {
    fontSize: 24,
    width: 40,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  rankRegistration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rankStats: {
    alignItems: 'flex-end',
  },
  rankRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 2,
  },
  rankPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  rankFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  rankFooterItem: {
    alignItems: 'center',
  },
  rankFooterLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  rankFooterValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
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
