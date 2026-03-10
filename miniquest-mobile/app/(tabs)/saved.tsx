// app/(tabs)/saved.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { adventureApi } from '../../api/client';
import { Colors } from '../../constants/theme';

export default function SavedScreen() {
	const [saved, setSaved] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const load = async () => {
		setLoading(true);
		try {
			const { data } = await adventureApi.getSaved();
			setSaved(data || []);
		} catch {
			setSaved([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	const handleDelete = async (id: string) => {
		Alert.alert('Delete', 'Remove this adventure?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete', style: 'destructive', onPress: async () => {
					await adventureApi.delete(id);
					setSaved(prev => prev.filter(a => a._id !== id));
				}
			},
		]);
	};

	return (
		<LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={s.container}>
			<ScrollView contentContainerStyle={s.scroll}>
				<Text style={s.title}>Saved Adventures</Text>
				<Text style={s.subtitle}>{saved.length} saved</Text>

				{loading && <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />}

				{!loading && saved.length === 0 && (
					<BlurView intensity={30} tint="light" style={s.emptyCard}>
						<Text style={s.emptyIcon}>🗺️</Text>
						<Text style={s.emptyText}>No saved adventures yet</Text>
						<Text style={s.emptySubtext}>Generate and save adventures from the Explore tab</Text>
					</BlurView>
				)}

				{saved.map((adv, i) => (
					<BlurView key={i} intensity={30} tint="light" style={s.card}>
						<View style={s.cardHeader}>
							<Text style={s.cardTitle}>{adv.title}</Text>
							<TouchableOpacity onPress={() => handleDelete(adv._id)}>
								<Text style={s.deleteBtn}>✕</Text>
							</TouchableOpacity>
						</View>
						<Text style={s.cardTagline}>{adv.tagline}</Text>
						<View style={s.meta}>
							<Text style={s.metaText}>⏱ {adv.duration} min</Text>
							<Text style={s.metaText}>💰 ${adv.cost}</Text>
							<Text style={s.metaText}>📍 {adv.locations?.length || 0} stops</Text>
						</View>
					</BlurView>
				))}
			</ScrollView>
		</LinearGradient>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
	title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
	subtitle: { fontSize: 15, color: Colors.whiteAlpha80, marginBottom: 24 },
	emptyCard: { borderRadius: 20, padding: 40, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
	emptyIcon: { fontSize: 48, marginBottom: 16 },
	emptyText: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
	emptySubtext: { color: Colors.whiteAlpha80, fontSize: 14, textAlign: 'center' },
	card: { borderRadius: 20, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 16 },
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
	cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 8 },
	deleteBtn: { color: Colors.whiteAlpha60, fontSize: 18, padding: 4 },
	cardTagline: { color: Colors.whiteAlpha80, fontSize: 14, marginBottom: 14, fontStyle: 'italic' },
	meta: { flexDirection: 'row', gap: 16 },
	metaText: { color: Colors.whiteAlpha80, fontSize: 13, fontWeight: '600' },
});