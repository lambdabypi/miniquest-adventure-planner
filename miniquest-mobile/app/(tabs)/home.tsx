// app/(tabs)/home.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { adventureApi } from '../../api/client';
import { Colors } from '../../constants/theme';
import AdventureCard from '../../components/AdventureCard';

const SUGGESTIONS = [
	'Coffee shops and bookstores in Boston',
	'Outdoor adventure near me',
	'Hidden gems in NYC',
	'Relaxing afternoon in Back Bay',
];

export default function HomeScreen() {
	const { user, logout } = useAuth();
	const [query, setQuery] = useState('');
	const [location, setLocation] = useState('Boston, MA');
	const [loading, setLoading] = useState(false);
	const [adventures, setAdventures] = useState<any[]>([]);

	const generate = async () => {
		if (!query.trim()) return Alert.alert('', 'What kind of adventure are you looking for?');
		setLoading(true);
		setAdventures([]);
		try {
			const { data } = await adventureApi.generate(query, location);
			setAdventures(data.adventures || []);
		} catch (e: any) {
			Alert.alert('Error', e.response?.data?.detail || 'Failed to generate adventures');
		} finally {
			setLoading(false);
		}
	};

	return (
		<LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={s.container}>
			<ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

				{/* Header */}
				<View style={s.header}>
					<View>
						<Text style={s.greeting}>Hey, {user?.username || 'Explorer'} 👋</Text>
						<Text style={s.subtitle}>Where to today?</Text>
					</View>
					<TouchableOpacity onPress={logout} style={s.logoutBtn}>
						<Text style={s.logoutText}>Sign out</Text>
					</TouchableOpacity>
				</View>

				{/* Search Card */}
				<BlurView intensity={40} tint="light" style={s.card}>
					<Text style={s.label}>What are you in the mood for?</Text>
					<TextInput
						style={s.input}
						placeholder="e.g. coffee shops and museums..."
						placeholderTextColor={Colors.whiteAlpha60}
						value={query}
						onChangeText={setQuery}
						multiline
						numberOfLines={2}
					/>
					<Text style={s.label}>Location</Text>
					<TextInput
						style={s.input}
						placeholder="Boston, MA"
						placeholderTextColor={Colors.whiteAlpha60}
						value={location}
						onChangeText={setLocation}
					/>
					<TouchableOpacity style={s.btn} onPress={generate} disabled={loading}>
						{loading
							? <ActivityIndicator color="#fff" />
							: <Text style={s.btnText}>✨ Generate Adventures</Text>}
					</TouchableOpacity>
				</BlurView>

				{/* Suggestions */}
				{adventures.length === 0 && !loading && (
					<View style={s.suggestionsWrap}>
						<Text style={s.suggestionsTitle}>Try these:</Text>
						{SUGGESTIONS.map((s, i) => (
							<TouchableOpacity key={i} onPress={() => setQuery(s)} style={sug.chip}>
								<Text style={sug.chipText}>{s}</Text>
							</TouchableOpacity>
						))}
					</View>
				)}

				{/* Loading state */}
				{loading && (
					<BlurView intensity={30} tint="light" style={s.loadingCard}>
						<ActivityIndicator size="large" color="#fff" />
						<Text style={s.loadingText}>Planning your adventure...</Text>
						<Text style={s.loadingSubtext}>Researching venues with AI 🤖</Text>
					</BlurView>
				)}

				{/* Results */}
				{adventures.map((adv, i) => (
					<AdventureCard key={i} adventure={adv} index={i} />
				))}

			</ScrollView>
		</LinearGradient>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
	header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
	greeting: { fontSize: 26, fontWeight: '700', color: '#fff' },
	subtitle: { fontSize: 16, color: Colors.whiteAlpha80, marginTop: 2 },
	logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder },
	logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
	card: { borderRadius: 20, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 20 },
	label: { color: Colors.whiteAlpha80, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
	input: { backgroundColor: Colors.glassInput, borderRadius: 12, padding: 14, color: '#fff', marginBottom: 16, borderWidth: 1, borderColor: Colors.glassBorder, fontSize: 15 },
	btn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
	btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
	suggestionsWrap: { marginBottom: 20 },
	suggestionsTitle: { color: Colors.whiteAlpha80, fontSize: 14, fontWeight: '600', marginBottom: 12 },
	loadingCard: { borderRadius: 20, padding: 32, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 20 },
	loadingText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
	loadingSubtext: { color: Colors.whiteAlpha80, fontSize: 14, marginTop: 8 },
});

const sug = StyleSheet.create({
	chip: { backgroundColor: Colors.glass, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.glassBorder },
	chipText: { color: '#fff', fontSize: 14 },
});