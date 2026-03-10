// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{
			headerShown: false,
			tabBarStyle: { backgroundColor: 'rgba(30,30,30,0.95)', borderTopColor: Colors.glassBorder, height: 60, paddingBottom: 8 },
			tabBarActiveTintColor: Colors.gradientStart,
			tabBarInactiveTintColor: Colors.whiteAlpha60,
			tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
		}}>
			<Tabs.Screen name="home" options={{ title: '🧭 Explore', tabBarLabel: 'Explore' }} />
			<Tabs.Screen name="saved" options={{ title: '❤️ Saved', tabBarLabel: 'Saved' }} />
		</Tabs>
	);
}