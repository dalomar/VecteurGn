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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const { token, user: currentUser, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.replace('/');
    } else {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de charger les utilisateurs',
        position: 'top',
      });
    }
  };

  const handleCreateUser = async () => {
    if (!username || !password) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs',
        position: 'top',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Utilisateur créé avec succès',
        position: 'top',
      });

      setUsername('');
      setPassword('');
      setRole('user');
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de créer l\'utilisateur',
        position: 'top',
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Rôle modifié avec succès',
        position: 'top',
      });

      fetchUsers();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de modifier le rôle',
        position: 'top',
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer "${user.username}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail);
              }

              Toast.show({
                type: 'success',
                text1: 'Succès',
                text2: 'Utilisateur supprimé',
                position: 'top',
              });

              fetchUsers();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: error.message,
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des Utilisateurs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="person-add" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={[
                styles.roleBadge,
                user.role === 'admin' ? styles.adminBadge : styles.userBadge
              ]}>
                <Ionicons
                  name={user.role === 'admin' ? 'shield-checkmark' : 'person'}
                  size={16}
                  color="#fff"
                />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.userRole}>
                  {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </Text>
              </View>
            </View>

            {currentUser?.id !== user.id && (
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleChangeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                >
                  <Ionicons
                    name={user.role === 'admin' ? 'person' : 'shield-checkmark'}
                    size={20}
                    color="#3B82F6"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteUser(user)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Create User Modal */}
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
              <Text style={styles.modalTitle}>Nouvel Utilisateur</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Nom d'utilisateur *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Mot de passe *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />

              <Text style={styles.label}>Rôle *</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleSelectButton,
                    role === 'user' && styles.roleSelectButtonActive,
                  ]}
                  onPress={() => setRole('user')}
                >
                  <Ionicons name="person" size={20} color={role === 'user' ? '#fff' : '#D1D5DB'} />
                  <Text style={[
                    styles.roleSelectText,
                    role === 'user' && styles.roleSelectTextActive,
                  ]}>
                    Utilisateur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleSelectButton,
                    role === 'admin' && styles.roleSelectButtonActive,
                  ]}
                  onPress={() => setRole('admin')}
                >
                  <Ionicons name="shield-checkmark" size={20} color={role === 'admin' ? '#fff' : '#D1D5DB'} />
                  <Text style={[
                    styles.roleSelectText,
                    role === 'admin' && styles.roleSelectTextActive,
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateUser}>
                <Text style={styles.submitButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminBadge: {
    backgroundColor: '#3B82F6',
  },
  userBadge: {
    backgroundColor: '#6B7280',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
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
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  roleSelectButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  roleSelectTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
