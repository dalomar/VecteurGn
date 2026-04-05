import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-gifted-charts';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
};

interface AnalyticsData {
  busId?: string;
  period: string;
  totalRecettes?: number;
  totalDepenses?: number;
  recettesByCategory?: Record<string, number>;
  depensesByCategory?: Record<string, number>;
  comparison?: Array<{
    id: string;
    name: string;
    currency: string;
    recettes: number;
    depenses: number;
    balance: number;
  }>;
}

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const { buses, fetchBuses } = useStore();

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [period, selectedBusId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);
      if (selectedBusId) {
        params.append('busId', selectedBusId);
      }

      const response = await fetch(`${API_URL}/stats/analytics?${params.toString()}`);
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };

  const renderSingleBusAnalytics = () => {
    if (!analyticsData || !analyticsData.totalRecettes) return null;

    const recettesData = Object.entries(analyticsData.recettesByCategory || {}).map(([key, value], index) => ({
      value,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      frontColor: '#10B981',
      labelTextStyle: { color: '#FFFFFF', fontSize: 10 },
    }));

    const depensesData = Object.entries(analyticsData.depensesByCategory || {}).map(([key, value], index) => ({
      value,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      frontColor: '#EF4444',
      labelTextStyle: { color: '#FFFFFF', fontSize: 10 },
    }));

    const recettesPieData = Object.entries(analyticsData.recettesByCategory || {}).map(([key, value], index) => ({
      value,
      color: getCategoryColor(index),
      text: `${((value / (analyticsData.totalRecettes || 1)) * 100).toFixed(0)}%`,
    }));

    const depensesPieData = Object.entries(analyticsData.depensesByCategory || {}).map(([key, value], index) => ({
      value,
      color: getCategoryColor(index),
      text: `${((value / (analyticsData.totalDepenses || 1)) * 100).toFixed(0)}%`,
    }));

    const selectedBus = buses.find(b => b.id === selectedBusId);

    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.recetteCard]}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.summaryLabel}>Recettes</Text>
            <Text style={styles.summaryValue}>
              {analyticsData.totalRecettes?.toLocaleString('fr-FR')} {selectedBus?.currency}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.depenseCard]}>
            <Ionicons name="trending-down" size={24} color="#EF4444" />
            <Text style={styles.summaryLabel}>Dépenses</Text>
            <Text style={styles.summaryValue}>
              {analyticsData.totalDepenses?.toLocaleString('fr-FR')} {selectedBus?.currency}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.balanceCard]}>
          <Ionicons name="wallet" size={24} color="#3B82F6" />
          <Text style={styles.summaryLabel}>Solde</Text>
          <Text style={[
            styles.summaryValue,
            (analyticsData.totalRecettes || 0) - (analyticsData.totalDepenses || 0) >= 0
              ? { color: '#10B981' }
              : { color: '#EF4444' }
          ]}>
            {((analyticsData.totalRecettes || 0) - (analyticsData.totalDepenses || 0)).toLocaleString('fr-FR')} {selectedBus?.currency}
          </Text>
        </View>

        {/* Bar Chart - Recettes vs Dépenses */}
        {recettesData.length > 0 || depensesData.length > 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Recettes vs Dépenses par Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                <BarChart
                  data={[...recettesData, ...depensesData]}
                  width={Math.max(Dimensions.get('window').width - 80, recettesData.length * 60)}
                  height={220}
                  barWidth={22}
                  spacing={24}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#9CA3AF' }}
                  noOfSections={4}
                  maxValue={Math.max(
                    ...Object.values(analyticsData.recettesByCategory || {}),
                    ...Object.values(analyticsData.depensesByCategory || {})
                  ) * 1.1}
                />
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Pie Charts */}
        <View style={styles.pieChartsRow}>
          {recettesPieData.length > 0 && (
            <View style={styles.pieChartCard}>
              <Text style={styles.chartTitle}>Recettes</Text>
              <PieChart
                data={recettesPieData}
                donut
                radius={70}
                innerRadius={45}
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 16, color: '#10B981', fontWeight: 'bold' }}>
                    {analyticsData.totalRecettes?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </Text>
                )}
              />
              <View style={styles.legend}>
                {Object.keys(analyticsData.recettesByCategory || {}).map((key, index) => (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.legendText}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {depensesPieData.length > 0 && (
            <View style={styles.pieChartCard}>
              <Text style={styles.chartTitle}>Dépenses</Text>
              <PieChart
                data={depensesPieData}
                donut
                radius={70}
                innerRadius={45}
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: 'bold' }}>
                    {analyticsData.totalDepenses?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </Text>
                )}
              />
              <View style={styles.legend}>
                {Object.keys(analyticsData.depensesByCategory || {}).map((key, index) => (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.legendText}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderComparison = () => {
    if (!analyticsData || !analyticsData.comparison) return null;

    const barData = analyticsData.comparison.flatMap((bus, index) => [
      {
        value: bus.recettes,
        label: bus.name.length > 8 ? bus.name.substring(0, 8) + '...' : bus.name,
        frontColor: '#10B981',
        spacing: index === 0 ? 0 : 2,
        labelTextStyle: { color: '#FFFFFF', fontSize: 10 },
      },
      {
        value: bus.depenses,
        frontColor: '#EF4444',
      },
    ]);

    return (
      <View>
        {/* Comparison Bar Chart */}
        {analyticsData.comparison.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Comparaison Recettes vs Dépenses</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Recettes</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Dépenses</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                <BarChart
                  data={barData}
                  width={Math.max(Dimensions.get('window').width - 80, analyticsData.comparison.length * 80)}
                  height={220}
                  barWidth={30}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#9CA3AF' }}
                  noOfSections={4}
                  maxValue={Math.max(
                    ...analyticsData.comparison.map(b => Math.max(b.recettes, b.depenses))
                  ) * 1.1}
                />
              </View>
            </ScrollView>
          </View>
        )}

        {/* Bus Cards */}
        {analyticsData.comparison.map((bus) => (
          <View key={bus.id} style={styles.busComparisonCard}>
            <View style={styles.busComparisonHeader}>
              <Ionicons name="bus" size={24} color="#3B82F6" />
              <Text style={styles.busComparisonName}>{bus.name}</Text>
            </View>
            <View style={styles.busComparisonStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Recettes</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {bus.recettes.toLocaleString('fr-FR')} {bus.currency}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Dépenses</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {bus.depenses.toLocaleString('fr-FR')} {bus.currency}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Solde</Text>
                <Text style={[
                  styles.statValue,
                  bus.balance >= 0 ? { color: '#10B981' } : { color: '#EF4444' }
                ]}>
                  {bus.balance.toLocaleString('fr-FR')} {bus.currency}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analyses</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Période:</Text>
          <View style={styles.periodFilter}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodButton,
                  period === p && styles.periodButtonActive,
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    period === p && styles.periodButtonTextActive,
                  ]}
                >
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bus Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Bus:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.busFilter}>
            <TouchableOpacity
              style={[
                styles.busChip,
                selectedBusId === '' && styles.busChipActive,
              ]}
              onPress={() => setSelectedBusId('')}
            >
              <Text
                style={[
                  styles.busChipText,
                  selectedBusId === '' && styles.busChipTextActive,
                ]}
              >
                Comparaison
              </Text>
            </TouchableOpacity>
            {buses.map((bus) => (
              <TouchableOpacity
                key={bus.id}
                style={[
                  styles.busChip,
                  selectedBusId === bus.id && styles.busChipActive,
                ]}
                onPress={() => setSelectedBusId(bus.id)}
              >
                <Text
                  style={[
                    styles.busChipText,
                    selectedBusId === bus.id && styles.busChipTextActive,
                  ]}
                >
                  {bus.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : buses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={80} color="#6B7280" />
            <Text style={styles.emptyText}>Aucune donnée disponible</Text>
            <Text style={styles.emptySubtext}>Ajoutez des bus et des transactions pour voir les analyses</Text>
          </View>
        ) : selectedBusId ? (
          renderSingleBusAnalytics()
        ) : (
          renderComparison()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
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
  scrollView: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  periodFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  busFilter: {
    flexDirection: 'row',
  },
  busChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  busChipActive: {
    backgroundColor: '#3B82F6',
  },
  busChipText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  busChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 64,
    alignItems: 'center',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  recetteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  depenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#1F2937',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chartContainer: {
    paddingVertical: 8,
  },
  pieChartsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pieChartCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  legend: {
    marginTop: 16,
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  busComparisonCard: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  busComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  busComparisonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  busComparisonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
