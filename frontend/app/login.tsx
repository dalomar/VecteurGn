import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleLogin = async () => {
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
      setLoading(true);
      await login(username, password);
      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: `Bienvenue ${username}!`,
        position: 'top',
      });
      router.replace('/');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error.message || 'Vérifiez vos identifiants',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <Animated.View
              entering={ZoomIn.springify().delay(100)}
              style={styles.logoContainer}
            >
              <Ionicons name="bus" size={64} color="#F4B400" />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(350)}>
              <Text style={styles.title}>Vecteur GN</Text>
              <Text style={styles.subtitle}>Gestion de Flotte de Bus</Text>
            </Animated.View>
          </View>

          {/* Login Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d&apos;utilisateur</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#A6ABB4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="vecteur"
                  placeholderTextColor="#7B818C"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#A6ABB4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#7B818C"
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </View>

            <Animated.View
              entering={FadeInDown.duration(500).delay(650)}
              style={buttonAnimStyle}
            >
              <Pressable
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                onPressIn={() => {
                  if (!loading) buttonScale.value = withSpring(0.96, { damping: 10 });
                }}
                onPressOut={() => {
                  buttonScale.value = withSpring(1, { damping: 10 });
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-in" size={20} color="#fff" />
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(800)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>Développé par Oumar DRAMÉ</Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#171A1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#F4B400',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A6ABB4',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171A1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4B400',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#7B818C',
  },
});
