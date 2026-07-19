import React, { useCallback, useEffect, useState } from 'react';
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
import { useStore } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import PeriodSelector from '../components/PeriodSelector';
import BusSelector from '../components/BusSelector';
import DateField from '../components/DateField';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Period = 'day' | 'week' | 'month' | 'year';

function AnimatedProgressBar({ percentage, color }: { percentage: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage, { duration: 900 });
  }, [percentage, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.progressBar}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'recette' | 'depense'>('recette');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currentPeriod, setCurrentPeriod] = useState<Period>('month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentWeek, setCurrentWeek] = useState<number | undefined>(undefined);
  const { user, logout } = useAuth();
  const router = useRouter();

  const recetteScale = useSharedValue(1);
  const depenseScale = useSharedValue(1);
  const recetteAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: recetteScale.value }] }));
  const depenseAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: depenseScale.value }] }));

  const { ranking, busBalances, buses, fetchRanking, fetchBusBalances, fetchBuses, createTransaction } = useStore();

  const refreshDashboard = useCallback(async () => {
    await fetchBuses();
    await fetchBusBalances();
    await fetchRanking(currentPeriod, currentYear, currentMonth, currentWeek);
  }, [fetchBuses, fetchBusBalances, fetchRanking, currentPeriod, currentYear, currentMonth, currentWeek]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard])
  );

  const handlePeriodChange = (period: Period, year: number, month?: number, week?: number) => {
    setCurrentPeriod(period);
    setCurrentYear(year);
    setCurrentMonth(month ?? new Date().getMonth() + 1);
    setCurrentWeek(week);
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
        date: new Date(`${transactionDate}T12:00:00`).toISOString(),
      });

      setSelectedBusId('');
      setCategory('');
      setAmount('');
      setDescription('');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setModalVisible(false);

      await refreshDashboard();

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Transaction ajoutée avec succès!',
        position: 'top',
      });
    } catch {
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
    if (percentage >= 50) return '#F4B400';
    return '#EF4444';
  };

  const recetteCategories = ['recette', 'billets', 'location', 'autres'];
  const depenseCategories = ['carburant', 'entretien', 'assurance', 'salaires', 'autres'];

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await logout();
        router.replace('/login');
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible de se déconnecter',
          position: 'top',
        });
      }
    };

    if (Platform.OS === 'web') {
      performLogout();
      return;
    }

    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.sessionInfo}>
              <Ionicons name="person-circle-outline" size={18} color="#A6ABB4" />
              <Text style={styles.sessionText}>{user?.username || 'Utilisateur'}</Text>
            </View>
            <TouchableOpacity style={styles.headerLogoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
          <Animated.View entering={ZoomIn.springify().delay(100)} style={styles.logoEmblem}>
            <LinearGradient
              colors={['rgba(244,180,0,0.22)', 'rgba(244,180,0,0.04)']}
              style={styles.logoGlow}
            >
              <View style={styles.logoCircle}>
                <Ionicons name="bus" size={34} color="#F4B400" />
              </View>
            </LinearGradient>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>GN</Text>
            </View>
          </Animated.View>
          <Text style={styles.headerTitle}>
            VECTEUR <Text style={styles.headerTitleAccent}>GN</Text>
          </Text>
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
            busBalances.map((busBalance, index) => (
              <Animated.View
                key={busBalance.id}
                entering={FadeInUp.duration(400).delay(Math.min(index * 80, 320))}
                style={styles.busBalanceCard}
              >
                <View style={styles.busBalanceHeader}>
                  <Ionicons name="bus" size={20} color="#F4B400" />
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
              </Animated.View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Actions Rapides</Text>
          <View style={styles.actionButtons}>
            <Animated.View style={[styles.actionButton, styles.recetteButton, recetteAnimStyle]}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  setTransactionType('recette');
                  setCategory('');
                  setTransactionDate(new Date().toISOString().slice(0, 10));
                  setModalVisible(true);
                }}
                onPressIn={() => { recetteScale.value = withSpring(0.94, { damping: 8 }); }}
                onPressOut={() => { recetteScale.value = withSpring(1, { damping: 8 }); }}
                style={styles.actionButtonInner}
              >
                <Ionicons name="add-circle" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>Nouvelle Recette</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.actionButton, styles.depenseButton, depenseAnimStyle]}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  setTransactionType('depense');
                  setCategory('');
                  setTransactionDate(new Date().toISOString().slice(0, 10));
                  setModalVisible(true);
                }}
                onPressIn={() => { depenseScale.value = withSpring(0.94, { damping: 8 }); }}
                onPressOut={() => { depenseScale.value = withSpring(1, { damping: 8 }); }}
                style={styles.actionButtonInner}
              >
                <Ionicons name="remove-circle" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>Nouvelle Dépense</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Ranking Section */}
        <View style={styles.rankingSection}>
          <View style={styles.rankingHeader}>
            <Text style={styles.sectionTitle}>🏆 Classement des Bus</Text>
          </View>

          <PeriodSelector onPeriodChange={handlePeriodChange} />

          {ranking.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={64} color="#7B818C" />
              <Text style={styles.emptyText}>Aucun bus enregistré</Text>
              <Text style={styles.emptySubtext}>Ajoutez votre premier bus dans l&apos;onglet Bus</Text>
            </View>
          ) : (
            ranking.map((item, index) => {
              const busBalance = busBalances.find(b => b.id === item.id);
              const bus = buses.find(b => b.id === item.id);
              const percentage = item.percentage;
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.duration(400).delay(Math.min(index * 100, 400))}
                  style={styles.rankCard}
                >
                  <View style={styles.rankHeader}>
                    <Text style={styles.rankIcon}>{getRankIcon(index)}</Text>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{item.name}</Text>
                      <Text style={styles.rankRegistration}>Objectif/j: {bus ? formatCurrency(bus.dailyTarget, item.currency) : '-'}</Text>
                      <Text style={styles.rankRegistration}>Objectif période: {formatCurrency(item.target, item.currency)}</Text>
                    </View>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankRevenueLabel}>Recettes</Text>
                      <Text style={styles.rankRevenue}>{formatCurrency(item.revenue, item.currency)}</Text>
                      <Text
                        style={[
                          styles.rankPercentage,
                          { color: getProgressColor(percentage) },
                        ]}
                      >
                        {Math.round(percentage).toLocaleString('fr-FR')}%
                      </Text>
                    </View>
                  </View>
                  <AnimatedProgressBar
                    percentage={Math.min(percentage, 100)}
                    color={getProgressColor(percentage)}
                  />
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
                </Animated.View>
              );
            })
          )}
        </View>

        {/* Footer */}
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
              <Text style={styles.label}>Bus *</Text>
              <BusSelector
                buses={buses}
                selectedBusId={selectedBusId}
                onSelect={setSelectedBusId}
                placeholder="Choisir un bus"
              />

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

              <Text style={styles.label}>Montant *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#7B818C"
              />

              <Text style={styles.label}>Date *</Text>
              <DateField value={transactionDate} onChange={setTransactionDate} />

              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Détails de la transaction..."
                placeholderTextColor="#7B818C"
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
    backgroundColor: '#0D0F12',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#171A1F',
    borderBottomWidth: 2,
    borderBottomColor: '#2B313A',
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D0F12',
    borderWidth: 1,
    borderColor: '#2B313A',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sessionText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  headerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D0F12',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  logoEmblem: {
    position: 'relative',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1A1E26',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#F4B400',
  },
  logoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#F4B400',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#0D0F12',
  },
  logoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0D0F12',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitleAccent: {
    color: '#F4B400',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A6ABB4',
    letterSpacing: 0.5,
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
    backgroundColor: '#171A1F',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2B313A',
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
    color: '#A6ABB4',
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
    backgroundColor: '#171A1F',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  emptyBalanceText: {
    fontSize: 14,
    color: '#A6ABB4',
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
    backgroundColor: '#171A1F',
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
    backgroundColor: '#F4B400',
  },
  periodButtonText: {
    color: '#A6ABB4',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  rankCard: {
    backgroundColor: '#171A1F',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2B313A',
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
    color: '#A6ABB4',
  },
  rankStats: {
    alignItems: 'flex-end',
  },
  rankRevenueLabel: {
    fontSize: 10,
    color: '#7B818C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: '#2B313A',
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
    borderTopColor: '#2B313A',
  },
  rankFooterItem: {
    alignItems: 'center',
  },
  rankFooterLabel: {
    fontSize: 11,
    color: '#A6ABB4',
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
    borderTopColor: '#2B313A',
  },
  footerText: {
    fontSize: 12,
    color: '#7B818C',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A6ABB4',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7B818C',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#171A1F',
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
    borderBottomColor: '#2B313A',
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
    backgroundColor: '#2B313A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3A404A',
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
    backgroundColor: '#2B313A',
    borderWidth: 1,
    borderColor: '#3A404A',
  },
  categoryChipActive: {
    backgroundColor: '#F4B400',
    borderColor: '#F4B400',
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
