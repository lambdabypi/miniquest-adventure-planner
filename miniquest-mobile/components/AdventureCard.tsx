// components/AdventureCard.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { adventureApi } from '../api/client';
import { Colors } from '../constants/theme';

interface Props { adventure: any; index: number; }

const THEMES = ['🌟', '🎯', '✨'];

export default function AdventureCard({ adventure, index }: Props) {
	const [expanded, setExpanded] = useState(index === 0);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const handleSave = async () => {
		setSaving(true);
		try {
			await adventureApi.save(adventure);
			setSaved(true);
			Alert.alert('Saved!', 'Adventure added to your collection');
		} catch {
			Alert.alert('Error', 'Could not save adventure');
		} finally {
			setSaving(false);
		}
	};

	return (
		<BlurView intensity={40} tint="light" style={s.card}>
			{/* Header */}
			<TouchableOpacity onPress={() => setExpanded(!expanded)} style={s.header}>
				<View style={s.headerLeft}>
					<Text style={s.icon}>{THEMES[index % 3]}</Text>
					<View style={s.headerText}>
						<Text style={s.title}>{adventure.title}</Text>
						<Text style={s.tagline}>{adventure.tagline}</Text>
					</View>
				</View>
				<Text style={s.chevron}>{expanded ? '▲' : '▼'}</Text>
			</TouchableOpacity>

			{/* Meta */}
			<View style={s.meta}>
				<View style={s.badge}><Text style={s.badgeText}>⏱ {adventure.duration}min</Text></View>
				<View style={s.badge}><Text style={s.badgeText}>💰 ${adventure.cost}</Text></View>
				<View style={s.badge}><Text style={s.badgeText}>📍 {adventure.locations?.length || 0} stops</Text></View>
			</View>

			{/* Expanded content */}
			{expanded && (
				<View style={s.body}>
					<Text style={s.description}>{adventure.description}</Text>

					{/* Steps */}
					{adventure.steps?.map((step: any, i: number) => (
						<View key={i} style={s.step}>
							<View style={s.stepDot} />
							<View style={s.stepContent}>
								<Text style={s.stepTime}>{step.time}</Text>
								<Text style={s.stepActivity}>{step.activity}</Text>
								{step.details && <Text style={s.stepDetails}>{step.details}</Text>}
							</View>
						</View>
					))}

					{/* Venues */}
					{adventure.locations?.length > 0 && (
						<View style={s.venues}>
							<Text style={s.venuesTitle}>📍 Venues</Text>
							{adventure.locations.map((loc: any, i: number) => (
								<View key={i} style={s.venue}>
									<Text style={s.venueName}>{loc.name}</Text>
									{loc.rating && <Text style={s.venueRating}>⭐ {loc.rating}</Text>}
								</View>
							))}
						</View>
					)}

					{/* Save button */}
					<TouchableOpacity
						style={[s.saveBtn, saved && s.savedBtn]}
						onPress={handleSave}
						disabled={saving || saved}
					>
						<Text style={s.saveBtnText}>{saved ? '❤️ Saved!' : saving ? 'Saving...' : '🤍 Save Adventure'}</Text>
					</TouchableOpacity>
				</View>
			)}
		</BlurView>
	);
}

const s = StyleSheet.create({
	card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 16, padding: 20 },
	header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
	headerLeft: { flexDirection: 'row', flex: 1, gap: 12 },
	icon: { fontSize: 28 },
	headerText: { flex: 1 },
	title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
	tagline: { color: Colors.whiteAlpha80, fontSize: 13, fontStyle: 'italic' },
	chevron: { color: Colors.whiteAlpha60, fontSize: 14, marginLeft: 8, marginTop: 4 },
	meta: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
	badge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.glassBorder },
	badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	body: { marginTop: 20, borderTopWidth: 1, borderTopColor: Colors.glassBorder, paddingTop: 20 },
	description: { color: Colors.whiteAlpha80, fontSize: 14, lineHeight: 22, marginBottom: 20 },
	step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
	stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gradientStart, marginTop: 5 },
	stepContent: { flex: 1 },
	stepTime: { color: Colors.gradientStart, fontSize: 12, fontWeight: '700', marginBottom: 2 },
	stepActivity: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
	stepDetails: { color: Colors.whiteAlpha60, fontSize: 12 },
	venues: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 16 },
	venuesTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
	venue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
	venueName: { color: Colors.whiteAlpha80, fontSize: 13, flex: 1 },
	venueRating: { color: Colors.gradientStart, fontSize: 12, fontWeight: '600' },
	saveBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
	savedBtn: { backgroundColor: 'rgba(255,100,100,0.2)', borderColor: 'rgba(255,100,100,0.4)' },
	saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});