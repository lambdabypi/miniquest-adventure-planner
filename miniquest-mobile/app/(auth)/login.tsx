// app/(auth)/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/theme';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();

	const handleLogin = async () => {
		if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
		setLoading(true);
		try {
			await login(email, password);
		} catch (e: any) {
			Alert.alert('Login failed', e.response?.data?.detail || 'Invalid credentials');
		} finally {
			setLoading(false);
		}
	};

	return (
		<LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={s.container}>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>
				<Text style={s.logo}>MiniQuest</Text>
				<Text style={s.tagline}>Your AI Adventure Planner</Text>

				<BlurView intensity={40} tint="light" style={s.card}>
					<Text style={s.title}>Welcome back</Text>

					<TextInput
						style={s.input}
						placeholder="Email"
						placeholderTextColor={Colors.whiteAlpha60}
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
					/>
					<TextInput
						style={s.input}
						placeholder="Password"
						placeholderTextColor={Colors.whiteAlpha60}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>

					<TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
						{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
					</TouchableOpacity>

					<Link href="/(auth)/register" asChild>
						<TouchableOpacity style={s.link}>
							<Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Register</Text></Text>
						</TouchableOpacity>
					</Link>
				</BlurView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	inner: { flex: 1, justifyContent: 'center', padding: 24 },
	logo: { fontSize: 42, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
	tagline: { fontSize: 16, color: Colors.whiteAlpha80, textAlign: 'center', marginBottom: 40 },
	card: { borderRadius: 24, padding: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder },
	title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 },
	input: { backgroundColor: Colors.glassInput, borderRadius: 12, padding: 14, color: '#fff', marginBottom: 14, borderWidth: 1, borderColor: Colors.glassBorder, fontSize: 16 },
	btn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.glassBorder },
	btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
	link: { marginTop: 20, alignItems: 'center' },
	linkText: { color: Colors.whiteAlpha80, fontSize: 14 },
	linkBold: { color: '#fff', fontWeight: '700' },
});