// app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
	const { isAuthenticated, isLoading } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		const inAuth = segments[0] === '(auth)';
		if (!isAuthenticated && !inAuth) router.replace('/(auth)/login');
		if (isAuthenticated && inAuth) router.replace('/(tabs)/home');
	}, [isAuthenticated, isLoading, segments]);

	return <Slot />;
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<RootLayoutNav />
		</AuthProvider>
	);
}