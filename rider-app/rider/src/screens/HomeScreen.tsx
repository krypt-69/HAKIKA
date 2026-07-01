import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRiderAuth } from '../auth/RiderAuthContext';

const HomeScreen: React.FC = () => {
  const { user, logout } = useRiderAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, Rider</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.placeholder}>No deliveries assigned yet.</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  email: { fontSize: 16, color: '#666', marginBottom: 30 },
  placeholder: { fontSize: 14, color: '#999', marginBottom: 40 },
  logoutBtn: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  logoutText: { color: '#c00' },
});

export default HomeScreen;
