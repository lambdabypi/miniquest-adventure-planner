// frontend/src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
	isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
	theme: 'dark',
	toggleTheme: () => { },
	isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [theme, setTheme] = useState<Theme>(() => {
		return (localStorage.getItem('miniquest_theme') as Theme) || 'dark';
	});

	useEffect(() => {
		localStorage.setItem('miniquest_theme', theme);
		document.documentElement.setAttribute('data-theme', theme);
	}, [theme]);

	const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => useContext(ThemeContext);

// Theme token helper — use this everywhere instead of hardcoded colors
export const t = (isDark: boolean) => ({
	// Backgrounds
	pageBg: isDark
		? 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
		: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fef9c3 100%)',
	cardBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
	cardBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
	navBg: isDark ? 'rgba(15,12,41,0.85)' : 'rgba(255,255,255,0.8)',
	navBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
	inputBg: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
	inputBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
	sidebarBg: isDark ? 'rgba(15,12,41,0.97)' : 'rgba(255,255,255,0.97)',
	sidebarBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
	progressCardBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
	progressCardBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
	progressTrackBg: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
	stepCardBg: isDark ? 'rgba(59,130,246,0.1)' : '#f0f9ff',
	stepCardBorder: isDark ? 'rgba(59,130,246,0.3)' : '#bae6fd',
	stepCardIdleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
	stepCardIdleBorder: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
	historyItemBorder: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
	convItemBg: (active: boolean) => active
		? (isDark ? 'rgba(124,58,237,0.2)' : '#ede9fe')
		: (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
	convItemBorder: (active: boolean) => active
		? (isDark ? 'rgba(167,139,250,0.4)' : '#7c3aed')
		: (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
	researchBg: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
	researchBorder: isDark ? 'rgba(16,185,129,0.25)' : '#bbf7d0',
	loadingBg: isDark ? 'rgba(59,130,246,0.08)' : '#f0f9ff',
	loadingBorder: isDark ? 'rgba(59,130,246,0.2)' : '#bae6fd',
	formTextareaBg: isDark ? 'rgba(255,255,255,0.07)' : 'white',
	formTextareaBorder: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db',
	// Blobs
	blob1: isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)',
	blob2: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)',
	// Text
	textPrimary: isDark ? 'white' : '#1e293b',
	textSecondary: isDark ? 'rgba(255,255,255,0.65)' : '#64748b',
	textMuted: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8',
	textAccent: isDark ? '#c4b5fd' : '#7c3aed',
	textGreen: isDark ? '#6ee7b7' : '#15803d',
	researchTitle: isDark ? '#6ee7b7' : '#15803d',
	// Links
	linkColor: isDark ? '#a78bfa' : '#7c3aed',
	// Active nav
	activeNavBg: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
	activeNavBorder: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.3)',
	activeNavText: isDark ? '#c4b5fd' : '#7c3aed',
	inactiveNavText: isDark ? 'rgba(255,255,255,0.65)' : '#64748b',
	// Buttons
	logoutBg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
	logoutBorder: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)',
	logoutText: isDark ? '#fca5a5' : '#dc2626',
	secondaryBtnBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
	secondaryBtnText: isDark ? 'rgba(255,255,255,0.8)' : '#475569',
	secondaryBtnBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
	userInfoBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
	userInfoBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
});