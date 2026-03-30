// frontend/src/pages/AdventuresPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdventures, GenerationOptions, DEFAULT_GENERATION_OPTIONS } from '../hooks/useAdventures';
import { useChatHistory } from '../hooks/useChatHistory';
import { useTheme, t } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import EnhancedAdventureCard from '../components/EnhancedAdventureCard';
import ChatSidebar from '../components/ChatSidebar';
import OutOfScopeMessage from '../components/OutOfScopeMessage';
import ProgressTracker from '../components/ProgressTracker';
import SurpriseButton from '../components/SurpriseButton';
import GroupModeModal from '../components/GroupModeModal';
import OnboardingModal from '../components/OnboardingModal';

interface ChatMessage {
	id: string;
	type: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

type LayoutMode = 'chat-left' | 'chat-right';
type MobileTab = 'chat' | 'adventures';

// ─── Vibe chip definitions ────────────────────────────────────────────────────
interface VibeChip {
	label: string;
	emoji: string;
	query: string;
	color: string;
}

const VIBE_CHIPS: VibeChip[] = [
	{ label: 'Party', emoji: '🎉', query: 'party night out', color: '#8b5cf6' },
	{ label: 'Date Night', emoji: '💑', query: 'romantic date night', color: '#ec4899' },
	{ label: 'Drinks', emoji: '🍻', query: 'bar hopping craft drinks', color: '#f59e0b' },
	{ label: 'Foodie', emoji: '🍽️', query: 'foodie spots local eats', color: '#ef4444' },
	{ label: 'Brunch', emoji: '🥂', query: 'brunch spots mimosas', color: '#f97316' },
	{ label: 'Chill', emoji: '🌿', query: 'chill coffee shops parks', color: '#10b981' },
	{ label: 'Artsy', emoji: '🎨', query: 'art galleries culture', color: '#6366f1' },
	{ label: 'Active', emoji: '🏃', query: 'outdoor active adventure', color: '#14b8a6' },
	{ label: 'Birthday', emoji: '🎂', query: 'birthday celebration night', color: '#e879f9' },
	{ label: 'Hidden Gems', emoji: '💎', query: 'hidden gems local spots', color: '#0ea5e9' },
	{ label: 'Rainy Day', emoji: '🌧️', query: 'indoor rainy day activity', color: '#64748b' },
	{ label: 'Shopping', emoji: '🛍️', query: 'boutiques markets shopping', color: '#d946ef' },
];

// ─── Vibe Chip Panel ──────────────────────────────────────────────────────────
const VibeChipPanel: React.FC<{
	onSelect: (query: string) => void;
	isDark: boolean;
	isMobile: boolean;
	disabled: boolean;
}> = ({ onSelect, isDark, isMobile, disabled }) => {
	const [expanded, setExpanded] = useState(false);
	const visibleCount = isMobile ? 4 : 6;
	const shown = expanded ? VIBE_CHIPS : VIBE_CHIPS.slice(0, visibleCount);

	return (
		<div style={{ marginBottom: 8 }}>
			<div style={{
				fontSize: '0.68rem', fontWeight: 600,
				color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
				marginBottom: 5, letterSpacing: '0.04em', paddingLeft: 2,
			}}>QUICK VIBES</div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
				{shown.map(chip => (
					<button
						key={chip.label}
						onClick={() => !disabled && onSelect(chip.query)}
						disabled={disabled}
						title={chip.query}
						style={{
							display: 'flex', alignItems: 'center', gap: 4,
							padding: isMobile ? '4px 9px' : '5px 11px',
							borderRadius: 20,
							background: isDark ? `${chip.color}22` : `${chip.color}18`,
							border: `1px solid ${chip.color}55`,
							color: chip.color,
							fontSize: isMobile ? '0.72rem' : '0.74rem',
							fontWeight: 600,
							cursor: disabled ? 'not-allowed' : 'pointer',
							opacity: disabled ? 0.45 : 1,
							transition: 'all 0.15s',
							whiteSpace: 'nowrap', lineHeight: 1,
						}}
						onMouseEnter={e => {
							if (!disabled) {
								e.currentTarget.style.background = `${chip.color}33`;
								e.currentTarget.style.borderColor = `${chip.color}99`;
								e.currentTarget.style.transform = 'translateY(-1px)';
							}
						}}
						onMouseLeave={e => {
							e.currentTarget.style.background = isDark ? `${chip.color}22` : `${chip.color}18`;
							e.currentTarget.style.borderColor = `${chip.color}55`;
							e.currentTarget.style.transform = 'none';
						}}
					>
						<span style={{ fontSize: isMobile ? '0.78rem' : '0.8rem', lineHeight: 1 }}>{chip.emoji}</span>
						{chip.label}
					</button>
				))}
				<button
					onClick={() => setExpanded(p => !p)}
					style={{
						display: 'flex', alignItems: 'center', gap: 3,
						padding: isMobile ? '4px 9px' : '5px 10px',
						borderRadius: 20, background: 'transparent',
						border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
						color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
						fontSize: isMobile ? '0.7rem' : '0.72rem',
						fontWeight: 600, cursor: 'pointer',
						transition: 'all 0.15s', whiteSpace: 'nowrap', lineHeight: 1,
					}}
					onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'; }}
					onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
				>
					{expanded ? '↑ Less' : `+${VIBE_CHIPS.length - visibleCount} more`}
				</button>
			</div>
		</div>
	);
};

// ─── Generation Options Panel ─────────────────────────────────────────────────
interface OptionsPanelProps {
	options: GenerationOptions;
	onChange: (o: GenerationOptions) => void;
	isDark: boolean;
	disabled: boolean;
}

const GenerationOptionsPanel: React.FC<OptionsPanelProps> = ({ options, onChange, isDark, disabled }) => {
	const tk = t(isDark);
	const [open, setOpen] = useState(false);
	const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
	const bg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
	const modeLabel: Record<GenerationOptions['diversity_mode'], string> = {
		standard: '🔁 Standard', high: '🎲 High', fresh: '✨ Fresh',
	};
	const modeDesc: Record<GenerationOptions['diversity_mode'], string> = {
		standard: 'Consistent results for the same query.',
		high: 'Random modifiers added — surfaces different venues.',
		fresh: 'Rotates sources + modifiers — maximally different each time.',
	};
	return (
		<div style={{ marginBottom: 8 }}>
			<button
				onClick={() => setOpen(p => !p)} disabled={disabled}
				style={{
					display: 'flex', alignItems: 'center', justifyContent: 'space-between',
					width: '100%', padding: '6px 10px', borderRadius: 8,
					background: bg, border: `1px solid ${border}`,
					cursor: disabled ? 'not-allowed' : 'pointer',
					opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
				}}
			>
				<span style={{ fontSize: '0.72rem', fontWeight: 600, color: tk.textSecondary }}>
					⚙️ {options.stops_per_adventure} stop{options.stops_per_adventure !== 1 ? 's' : ''} · {modeLabel[options.diversity_mode]}
				</span>
				<span style={{ fontSize: '0.7rem', color: tk.textMuted }}>{open ? '▲' : '▼'}</span>
			</button>
			{open && (
				<div style={{ marginTop: 6, padding: '12px 14px', borderRadius: 8, background: bg, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div>
						<div style={{ fontSize: '0.7rem', fontWeight: 600, color: tk.textSecondary, marginBottom: 6 }}>
							Stops per adventure: <strong style={{ color: tk.textPrimary }}>{options.stops_per_adventure}</strong>
						</div>
						<input type="range" min={1} max={6} step={1} value={options.stops_per_adventure}
							onChange={e => onChange({ ...options, stops_per_adventure: Number(e.target.value) })}
							style={{ width: '100%', accentColor: '#667eea' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: tk.textMuted }}>
							<span>1 — quick</span><span>3 — default</span><span>6 — full day</span>
						</div>
					</div>
					<div>
						<div style={{ fontSize: '0.7rem', fontWeight: 600, color: tk.textSecondary, marginBottom: 6 }}>Venue diversity</div>
						<div style={{ display: 'flex', gap: 6 }}>
							{(['standard', 'high', 'fresh'] as const).map(mode => (
								<button key={mode} onClick={() => onChange({ ...options, diversity_mode: mode })}
									style={{
										flex: 1, padding: '6px 4px', borderRadius: 6,
										border: `1px solid ${options.diversity_mode === mode ? '#667eea' : border}`,
										background: options.diversity_mode === mode ? (isDark ? 'rgba(102,126,234,0.2)' : '#ede9fe') : 'transparent',
										color: options.diversity_mode === mode ? (isDark ? '#a78bfa' : '#5b21b6') : tk.textMuted,
										fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
									}}
								>{modeLabel[mode]}</button>
							))}
						</div>
						<div style={{ fontSize: '0.62rem', color: tk.textMuted, marginTop: 4, lineHeight: 1.4 }}>
							{modeDesc[options.diversity_mode]}
						</div>
					</div>
					<button onClick={() => onChange(DEFAULT_GENERATION_OPTIONS)}
						style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: tk.textMuted, fontSize: '0.68rem', cursor: 'pointer' }}
					>↺ Reset to defaults</button>
				</div>
			)}
		</div>
	);
};

// ============================================================
// CHAT PANEL
// ============================================================
interface ChatPanelProps {
	layoutMode: LayoutMode;
	conversations: any[];
	currentConversationId: string | null;
	chatMessages: ChatMessage[];
	loading: boolean;
	activeSuggestions: string[];
	input: string;
	location: string;
	showLocationEdit: boolean;
	customAddress: string;
	isManualAddress: boolean;
	locationInputRef: React.RefObject<HTMLInputElement>;
	chatEndRef: React.RefObject<HTMLDivElement>;
	user: any;
	isDark: boolean;
	isMobile: boolean;
	openSidebarRef: React.MutableRefObject<(() => void) | null>;
	generationOptions: GenerationOptions;
	setGenerationOptions: (o: GenerationOptions) => void;
	setInput: (v: string) => void;
	setShowLocationEdit: (v: boolean) => void;
	setCustomAddress: (v: string) => void;
	handleSend: () => void;
	handleVibeSelect: (query: string) => void;
	handleSuggestionClick: (s: string) => void;
	handleLoadConversation: (id: string) => void;
	handleNewChat: () => void;
	handleDeleteConversation: (id: string) => void;
	handleManualAddressSet: () => void;
	handleResetToAuto: () => void;
	onOpenGroupMode: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
	layoutMode, conversations, currentConversationId, chatMessages, loading,
	activeSuggestions, input, location, showLocationEdit, customAddress,
	isManualAddress, locationInputRef, chatEndRef, user, isDark, isMobile,
	openSidebarRef, generationOptions, setGenerationOptions,
	setInput, setShowLocationEdit, setCustomAddress, handleSend,
	handleVibeSelect, handleSuggestionClick, handleLoadConversation, handleNewChat,
	handleDeleteConversation, handleManualAddressSet, handleResetToAuto,
	onOpenGroupMode,
}) => {
	const tk = t(isDark);
	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
	const asstBubbleBg = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
	const asstBubbleColor = isDark ? tk.textPrimary : '#1e293b';

	return (
		<div style={{
			background: tk.cardBg,
			backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
			borderRight: !isMobile && layoutMode === 'chat-left' ? `1px solid ${borderColor}` : 'none',
			borderLeft: !isMobile && layoutMode === 'chat-right' ? `1px solid ${borderColor}` : 'none',
			display: 'flex', flexDirection: 'column',
			height: '100%', overflow: 'hidden', position: 'relative',
		}}>
			<ChatSidebar
				conversations={conversations}
				currentConversationId={currentConversationId}
				loading={false}
				onLoadConversation={handleLoadConversation}
				onNewChat={handleNewChat}
				onDeleteConversation={handleDeleteConversation}
				layoutMode={layoutMode}
				onRequestOpen={(fn) => { openSidebarRef.current = fn; }}
			/>

			{/* Header */}
			<div style={{
				padding: isMobile ? '12px 16px' : '20px', flexShrink: 0,
				borderBottom: `1px solid ${borderColor}`,
				background: isDark
					? 'linear-gradient(135deg, rgba(102,126,234,0.25) 0%, rgba(118,75,162,0.25) 100%)'
					: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				color: 'white',
			}}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
					<h1 style={{
						fontFamily: '"Oswald", Bold, sans-serif',
						fontSize: isMobile ? '1.3rem' : '1.55rem',
						fontWeight: 400, letterSpacing: '2px',
						background: 'linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)',
						WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						filter: 'drop-shadow(0 2px 8px rgba(124,58,237,0.35))',
						lineHeight: 1,
					}}>MiniQuest</h1>
					<button
						onClick={() => openSidebarRef.current?.()}
						style={{
							background: 'linear-gradient(135deg, rgba(124,58,237,0.75) 0%, rgba(59,130,246,0.75) 100%)',
							border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px',
							padding: isMobile ? '4px 10px' : '5px 14px', color: 'white',
							fontSize: isMobile ? '0.72rem' : '0.75rem', fontWeight: 600, cursor: 'pointer',
							display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
							letterSpacing: '0.02em', transition: 'opacity 0.2s, transform 0.15s',
							boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
						}}
						onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
						onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
					>
						<span style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>💬</span>
						History
					</button>
				</div>
				<div style={{ fontSize: '0.75rem', opacity: 0.9 }}>6 AI Agents • Live Research • Real-time Progress</div>
				{currentConversationId && (
					<div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4 }}>💾 Auto-saving conversation</div>
				)}
			</div>

			{/* Messages */}
			<div style={{
				flex: 1, overflowY: 'auto', padding: isMobile ? '10px' : '15px',
				display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0,
			}}>
				{chatMessages.map(msg => (
					<div key={msg.id} style={{ alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '90%' : '85%' }}>
						<div style={{
							padding: '10px 14px',
							borderRadius: msg.type === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
							background: msg.type === 'user' ? '#667eea' : asstBubbleBg,
							color: msg.type === 'user' ? 'white' : asstBubbleColor,
							fontSize: isMobile ? '0.85rem' : '0.9rem', lineHeight: '1.4', whiteSpace: 'pre-line',
						}}>{msg.content}</div>
						<div style={{ fontSize: '0.65rem', color: tk.textMuted, marginTop: 4, textAlign: msg.type === 'user' ? 'right' : 'left' }}>
							{msg.timestamp.toLocaleTimeString()}
						</div>
					</div>
				))}
				{loading && (
					<div style={{
						alignSelf: 'flex-start',
						background: isDark ? 'rgba(3,105,161,0.15)' : '#f0f9ff',
						border: `1px solid ${isDark ? 'rgba(186,230,253,0.2)' : '#bae6fd'}`,
						padding: '12px', borderRadius: '12px 12px 12px 2px',
						fontSize: '0.85rem', color: isDark ? '#7dd3fc' : '#0369a1',
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
							<div className="spinner" /><strong>Processing...</strong>
						</div>
						<div style={{ fontSize: '0.75rem', color: tk.textMuted }}>
							6 agents working{!isMobile && ' • Check right panel for progress'}
						</div>
					</div>
				)}
				<div ref={chatEndRef} />
			</div>

			{/* Quick suggestions */}
			{activeSuggestions.length > 0 && !loading && (
				<div style={{
					padding: '10px 12px', flexShrink: 0, maxHeight: 160, overflowY: 'auto',
					borderTop: `1px solid ${borderColor}`,
					background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
				}}>
					<div style={{ fontSize: '0.72rem', color: isDark ? '#fcd34d' : '#92400e', marginBottom: 6, fontWeight: 600 }}>
						💡 Quick suggestions:
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
						{activeSuggestions.map((s, idx) => (
							<button key={idx} onClick={() => handleSuggestionClick(s)}
								style={{
									background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
									border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`,
									borderRadius: 6, padding: '7px 10px',
									textAlign: 'left', cursor: 'pointer',
									fontSize: '0.78rem', color: tk.textPrimary, transition: 'all 0.15s',
								}}
								onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7'; e.currentTarget.style.borderColor = '#f59e0b'; }}
								onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'white'; e.currentTarget.style.borderColor = isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'; }}
							>→ {s}</button>
						))}
					</div>
				</div>
			)}

			{/* Input area */}
			<div style={{ padding: isMobile ? '10px 12px' : '12px 15px', borderTop: `1px solid ${borderColor}`, background: tk.cardBg, flexShrink: 0 }}>
				{/* Location badge / edit */}
				{!showLocationEdit ? (
					<div style={{ marginBottom: 8 }}>
						<div style={{
							padding: '7px 10px', borderRadius: 8, marginBottom: 6,
							background: isManualAddress
								? (isDark ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg,#fef3c7,#fde68a)')
								: (isDark ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg,#dbeafe,#bfdbfe)'),
							border: isManualAddress
								? `2px solid ${isDark ? 'rgba(245,158,11,0.4)' : '#f59e0b'}`
								: `1px solid ${isDark ? 'rgba(147,197,253,0.3)' : '#93c5fd'}`,
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ fontSize: '1rem' }}>{isManualAddress ? '📍' : '🤖'}</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{
										fontSize: '0.66rem', fontWeight: 600, marginBottom: 1,
										color: isManualAddress
											? (isDark ? '#fcd34d' : '#92400e')
											: (isDark ? '#93c5fd' : '#1e40af'),
									}}>
										{isManualAddress ? '📍 Manual' : '🤖 Smart Detection'}
									</div>
									<div style={{
										fontSize: '0.82rem', fontWeight: 600, color: tk.textPrimary,
										overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
									}}>{location}</div>
								</div>
								<button
									onClick={() => setShowLocationEdit(true)}
									style={{
										background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
										border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
										borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
										fontSize: '0.7rem', fontWeight: 600, color: tk.textSecondary,
										whiteSpace: 'nowrap', flexShrink: 0,
									}}
								>{isManualAddress ? '✏️' : '📍 Set'}</button>
							</div>
						</div>
						{!isMobile && (
							<div style={{ fontSize: '0.68rem', color: tk.textMuted, fontStyle: 'italic', padding: '0 4px', marginBottom: 6 }}>
								{isManualAddress ? (
									<>Using your address as the route origin.{' '}
										<button onClick={handleResetToAuto} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.68rem', padding: 0 }}>
											Switch to auto-detect
										</button>
									</>
								) : "💡 I'll detect the city from your query"}
							</div>
						)}
					</div>
				) : (
					<div style={{ marginBottom: 8 }}>
						<div style={{
							background: isDark ? 'rgba(3,105,161,0.12)' : '#f0f9ff',
							border: `1px solid ${isDark ? 'rgba(186,230,253,0.2)' : '#bae6fd'}`,
							borderRadius: 8, padding: 10, marginBottom: 6,
						}}>
							<div style={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#7dd3fc' : '#0369a1', marginBottom: 6 }}>
								📍 Set Location
							</div>
							<div style={{ fontSize: '0.7rem', color: tk.textMuted, marginBottom: 6 }}>
								Any US city or address — e.g. "Chicago, IL" or "123 Main St, Austin, TX"
							</div>
							<div style={{ display: 'flex', gap: 5 }}>
								<input
									ref={locationInputRef}
									type="text"
									value={customAddress}
									onChange={e => setCustomAddress(e.target.value)}
									onKeyPress={e => e.key === 'Enter' && handleManualAddressSet()}
									placeholder="e.g., Chicago, IL"
									autoFocus
									style={{
										flex: 1, padding: '7px 10px', border: '2px solid #3b82f6',
										borderRadius: 6, fontSize: '0.82rem', outline: 'none',
										background: tk.inputBg, color: tk.textPrimary,
									}}
								/>
								<button onClick={handleManualAddressSet} disabled={!customAddress.trim()}
									style={{
										padding: '7px 10px',
										background: customAddress.trim() ? '#16a34a' : (isDark ? '#374151' : '#cbd5e0'),
										color: 'white', border: 'none', borderRadius: 6,
										fontSize: '0.78rem', fontWeight: 600,
										cursor: customAddress.trim() ? 'pointer' : 'not-allowed',
									}}
								>✓</button>
								<button onClick={() => { setShowLocationEdit(false); setCustomAddress(''); }}
									style={{ padding: '7px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
								>✕</button>
							</div>
						</div>
					</div>
				)}

				<GenerationOptionsPanel options={generationOptions} onChange={setGenerationOptions} isDark={isDark} disabled={loading} />
				<VibeChipPanel onSelect={handleVibeSelect} isDark={isDark} isMobile={isMobile} disabled={loading} />

				<div style={{ display: 'flex', gap: 5 }}>
					<input
						type="text" value={input}
						onChange={e => setInput(e.target.value)}
						onKeyPress={e => e.key === 'Enter' && handleSend()}
						placeholder="e.g., 'coffee shops near me' or 'party in Austin'"
						disabled={loading}
						style={{
							flex: 1, minWidth: 0, padding: '10px 10px',
							border: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
							borderRadius: 8, fontSize: '0.88rem', outline: 'none',
							background: tk.inputBg, color: tk.textPrimary, transition: 'border-color 0.2s',
						}}
						onFocus={e => { e.currentTarget.style.borderColor = '#667eea'; }}
						onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'; }}
					/>
					<SurpriseButton onSurprise={handleSuggestionClick} loading={loading} isDark={isDark} />
					<button onClick={onOpenGroupMode} disabled={loading} title="Group mode"
						style={{
							background: loading ? (isDark ? '#374151' : '#cbd5e0') : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
							color: loading ? (isDark ? '#6b7280' : '#94a3b8') : 'white',
							border: 'none', borderRadius: 8, fontSize: '1rem', padding: '10px 11px',
							cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, lineHeight: 1,
							boxShadow: loading ? 'none' : '0 2px 8px rgba(6,182,212,0.4)',
							transition: 'opacity 0.2s, transform 0.15s',
						}}
						onMouseEnter={e => { if (!loading) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
						onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
					>👥</button>
					<button onClick={handleSend} disabled={loading || !input.trim()} title="Send"
						style={{
							padding: '10px 13px',
							background: loading || !input.trim() ? (isDark ? '#374151' : '#cbd5e0') : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: loading || !input.trim() ? (isDark ? '#6b7280' : '#94a3b8') : 'white',
							border: 'none', borderRadius: 8,
							cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
							fontSize: '1rem', flexShrink: 0, lineHeight: 1,
							boxShadow: loading || !input.trim() ? 'none' : '0 2px 8px rgba(102,126,234,0.4)',
							transition: 'opacity 0.2s, transform 0.15s',
						}}
						onMouseEnter={e => { if (!loading && input.trim()) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
						onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
					>{loading ? '⏳' : '🚀'}</button>
				</div>
			</div>
		</div>
	);
};

// ============================================================
// ADVENTURES PANEL
// ============================================================
interface AdventuresPanelProps {
	user: any; layoutMode: LayoutMode; adventures: any[]; loading: boolean;
	researchStats: any; outOfScope: boolean; scopeIssue: string | null;
	clarificationNeeded: boolean; unrelatedQuery: boolean; clarificationMessage: string;
	suggestions: string[]; recommendedServices: any[]; metadata?: any;
	progressUpdates: any[]; currentProgress: any; toggleLayout: () => void;
	handleAdventureSaved: (id: string, name: string) => void;
	handleSuggestionClick: (s: string) => void;
	isDark: boolean; isMobile: boolean;
}

const AdventuresPanel: React.FC<AdventuresPanelProps> = ({
	user, layoutMode, adventures, loading, researchStats, outOfScope, scopeIssue,
	clarificationNeeded, unrelatedQuery, clarificationMessage, suggestions,
	recommendedServices, metadata, progressUpdates, currentProgress,
	toggleLayout, handleAdventureSaved, handleSuggestionClick, isDark, isMobile,
}) => {
	const tk = t(isDark);
	return (
		<div style={{ overflowY: 'auto', padding: isMobile ? '12px' : '20px', height: '100%' }}>
			<div style={{
				display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				marginBottom: isMobile ? '12px' : '20px',
				padding: isMobile ? '10px 14px' : '15px 20px', borderRadius: '12px',
				background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
				border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
				backdropFilter: 'blur(12px)',
				boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
			}}>
				<div>
					<div style={{ fontSize: '0.82rem', color: tk.textMuted, marginBottom: '2px' }}>Welcome back</div>
					<div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 600, color: tk.textPrimary }}>{user?.username}</div>
				</div>
				{!isMobile && (
					<button onClick={toggleLayout}
						style={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white', border: 'none', padding: '8px 16px',
							borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
							cursor: 'pointer', display: 'flex', alignItems: 'center',
							gap: '8px', transition: 'transform 0.2s',
						}}
						onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
						title={layoutMode === 'chat-left' ? 'Switch to Chat Right' : 'Switch to Chat Left'}
					>
						<span>🔄</span>
						<span>{layoutMode === 'chat-left' ? 'Chat → Right' : 'Chat → Left'}</span>
					</button>
				)}
			</div>

			{loading && <ProgressTracker currentProgress={currentProgress} progressHistory={progressUpdates} isVisible={loading} />}

			{unrelatedQuery && !loading && (
				<div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', borderRadius: '12px', padding: isMobile ? '20px' : '30px', marginBottom: '20px', textAlign: 'center' }}>
					<div style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '12px' }}>🤖</div>
					<h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', marginBottom: '12px', fontWeight: 600 }}>Not About Adventures!</h2>
					<p style={{ fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '20px', opacity: 0.95, lineHeight: '1.6' }}>{clarificationMessage}</p>
					{(suggestions?.length ?? 0) > 0 && (
						<div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)' }}>
							<h3 style={{ fontSize: '1rem', marginBottom: '12px', fontWeight: 600 }}>💡 Try asking about places like:</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
								{suggestions.map((s, i) => (
									<button key={i} onClick={() => handleSuggestionClick(s)}
										style={{ background: 'rgba(255,255,255,0.9)', color: '#1e293b', border: 'none', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: 500 }}
										onMouseEnter={e => { e.currentTarget.style.background = 'white'; }}
										onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
									>→ {s}</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{outOfScope && !unrelatedQuery && !loading && (
				<OutOfScopeMessage
					scopeIssue={scopeIssue ?? 'multi_day_trip'}
					message={clarificationMessage ?? "This request is outside MiniQuest's scope"}
					suggestions={suggestions ?? []}
					recommendedServices={recommendedServices ?? []}
					onSuggestionClick={handleSuggestionClick}
					detectedCity={metadata?.detected_city}
				/>
			)}

			{clarificationNeeded && !outOfScope && !unrelatedQuery && !loading && (
				<div style={{ background: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
					<div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: isDark ? '#fcd34d' : '#92400e' }}>
						🤔 {clarificationMessage}
					</div>
					{(suggestions?.length ?? 0) > 0 && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
							<div style={{ fontSize: '0.82rem', color: isDark ? '#fcd34d' : '#92400e', fontWeight: 600, marginBottom: '4px' }}>💡 Try these instead:</div>
							{suggestions.map((s, i) => (
								<button key={i} onClick={() => handleSuggestionClick(s)}
									style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`, borderRadius: '8px', padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', color: tk.textPrimary, transition: 'all 0.2s' }}
									onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7'; }}
									onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'white'; }}
								>→ {s}</button>
							))}
						</div>
					)}
				</div>
			)}

			{adventures.length > 0 && !outOfScope && !unrelatedQuery && (
				<>
					<div style={{ marginBottom: '12px', padding: '10px 16px', background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '10px' }}>
						<div style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', color: isDark ? '#6ee7b7' : '#15803d', fontWeight: 600 }}>
							📊 {adventures.length} Adventures • {researchStats.totalInsights} Live Insights • {Math.round(researchStats.avgConfidence * 100)}% Confidence
						</div>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
						{adventures.map((adventure, idx) => (
							<EnhancedAdventureCard key={idx} adventure={adventure} index={idx} onSave={(id) => handleAdventureSaved(id, adventure.title)} />
						))}
					</div>
				</>
			)}

			{!loading && adventures.length === 0 && !outOfScope && !clarificationNeeded && !unrelatedQuery && (
				<div style={{ textAlign: 'center', padding: isMobile ? '40px 16px' : '60px 20px' }}>
					<div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗺️</div>
					<div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: tk.textSecondary }}>No adventures yet</div>
					<div style={{ fontSize: '0.9rem', color: tk.textMuted }}>Tell me what you'd like to explore, or tap a vibe above!</div>
				</div>
			)}
		</div>
	);
};

// ============================================================
// MOBILE TAB BAR
// ============================================================
const MobileTabBar: React.FC<{
	activeTab: MobileTab; setActiveTab: (t: MobileTab) => void;
	loading: boolean; adventureCount: number; isDark: boolean;
}> = ({ activeTab, setActiveTab, loading, adventureCount, isDark }) => {
	const tk = t(isDark);
	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
	return (
		<div style={{ display: 'flex', borderTop: `1px solid ${borderColor}`, background: tk.cardBg, flexShrink: 0 }}>
			{(['chat', 'adventures'] as MobileTab[]).map(tab => {
				const isActive = activeTab === tab;
				const label = tab === 'chat' ? '💬 Chat' : `🗺️ Adventures${adventureCount > 0 ? ` (${adventureCount})` : ''}`;
				return (
					<button key={tab} onClick={() => setActiveTab(tab)}
						style={{
							flex: 1, padding: '13px 8px', background: 'transparent', border: 'none',
							borderTop: isActive ? '2px solid #667eea' : '2px solid transparent',
							fontSize: '0.88rem', fontWeight: isActive ? 700 : 500,
							color: isActive ? '#667eea' : tk.textMuted,
							cursor: 'pointer', transition: 'all 0.15s',
							display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
						}}
					>
						{label}
						{tab === 'adventures' && loading && (
							<div style={{ width: 7, height: 7, borderRadius: '50%', background: '#667eea', animation: 'pulse 1s infinite' }} />
						)}
					</button>
				);
			})}
		</div>
	);
};

// ============================================================
// MAIN PAGE
// ============================================================
const AdventuresPage: React.FC = () => {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const isMobile = useIsMobile();
	const openSidebarRef = useRef<(() => void) | null>(null);

	const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	// ✅ location is now a free-form string — no longer locked to Boston/NYC
	const [location, setLocation] = useState('Boston, MA');
	const [isManualAddress, setIsManualAddress] = useState(false);
	const [showLocationEdit, setShowLocationEdit] = useState(false);
	const [customAddress, setCustomAddress] = useState('');
	const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
	const [queryId, setQueryId] = useState<string | null>(null);
	const [showSaveNotification, setShowSaveNotification] = useState(false);
	const [savedAdventureName, setSavedAdventureName] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
	const [layoutMode, setLayoutMode] = useState<LayoutMode>(
		() => (localStorage.getItem('miniquest_layout_mode') as LayoutMode) || 'chat-left'
	);
	const [showGroupMode, setShowGroupMode] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('miniquest_onboarded'));
	const [generationOptions, setGenerationOptions] = useState<GenerationOptions>(DEFAULT_GENERATION_OPTIONS);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const locationInputRef = useRef<HTMLInputElement>(null);

	const {
		adventures, loading, clarificationNeeded, clarificationMessage, suggestions,
		outOfScope, scopeIssue, recommendedServices, unrelatedQuery, locationNotFound,
		metadata, progressUpdates, currentProgress, researchStats,
		generateAdventuresWithStreaming, clearAdventures,
	} = useAdventures();

	const {
		autoSaveConversation, currentConversationId, conversations,
		loadConversations, loadConversation, deleteConversation, setCurrentConversationId,
	} = useChatHistory();

	useEffect(() => {
		if (isMobile && adventures.length > 0) setMobileTab('adventures');
	}, [adventures.length, isMobile]);

	// ✅ Validate US address — rejects obviously international inputs only.
	// City-level scope enforcement is handled by the backend.
	const validateAddress = (address: string): { valid: boolean; error?: string } => {
		const a = address.trim();
		if (a.length < 3) return { valid: false, error: 'Please enter a valid US city or address.' };
		const intlKeywords = [
			'london', 'paris', 'tokyo', 'berlin', 'sydney', 'toronto',
			'dubai', 'amsterdam', 'rome', 'barcelona', 'beijing', 'shanghai',
			'moscow', 'seoul', 'bangkok', 'mumbai', 'delhi', 'cairo',
		];
		if (intlKeywords.some(k => a.toLowerCase().includes(k))) {
			return { valid: false, error: 'MiniQuest supports US locations only.' };
		}
		return { valid: true };
	};

	const handleManualAddressSet = () => {
		if (!customAddress.trim()) return;
		const v = validateAddress(customAddress);
		if (!v.valid) {
			setChatMessages(prev => [...prev, {
				id: Date.now().toString(), type: 'assistant',
				content: `❌ ${v.error}`,
				timestamp: new Date(),
			}]);
			return;
		}
		setLocation(customAddress);
		setIsManualAddress(true);
		setShowLocationEdit(false);
		setChatMessages(prev => [...prev, {
			id: Date.now().toString(), type: 'assistant',
			content: `✅ Location set to "${customAddress}". I'll use this as your route origin.`,
			timestamp: new Date(),
		}]);
	};

	const handleResetToAuto = () => {
		setIsManualAddress(false);
		setCustomAddress('');
		setLocation('Boston, MA');
		setChatMessages(prev => [...prev, {
			id: Date.now().toString(), type: 'assistant',
			content: '🤖 Switched back to smart city detection.',
			timestamp: new Date(),
		}]);
	};

	useEffect(() => { localStorage.setItem('miniquest_layout_mode', layoutMode); }, [layoutMode]);
	const toggleLayout = () => setLayoutMode(prev => prev === 'chat-left' ? 'chat-right' : 'chat-left');
	useEffect(() => { loadConversations(20); }, [loadConversations]);
	useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, loading]);

	useEffect(() => {
		if (chatMessages.length > 1 && isGenerating) {
			const timer = setTimeout(() => autoSaveConversation(chatMessages, location, queryId || undefined), 2000);
			return () => clearTimeout(timer);
		}
	}, [chatMessages, location, queryId, autoSaveConversation, isGenerating]);

	useEffect(() => {
		if (unrelatedQuery && !loading && isGenerating) {
			const id = `unrelated_${Date.now()}`;
			if (lastGenerationId !== id) {
				setLastGenerationId(id);
				setChatMessages(prev => [...prev, { id, type: 'assistant', content: clarificationMessage || "I'm MiniQuest!", timestamp: new Date() }]);
				setActiveSuggestions(suggestions ?? []);
				setIsGenerating(false);
			}
		}
	}, [unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (outOfScope && !unrelatedQuery && !loading && isGenerating) {
			const id = `outofscope_${Date.now()}`;
			if (lastGenerationId !== id) {
				setLastGenerationId(id);
				setChatMessages(prev => [...prev, { id, type: 'assistant', content: `🚫 ${clarificationMessage ?? 'Out of scope.'}`, timestamp: new Date() }]);
				setActiveSuggestions(suggestions ?? []);
				setIsGenerating(false);
			}
		}
	}, [outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (clarificationNeeded && !outOfScope && !unrelatedQuery && !locationNotFound && !loading && isGenerating) {
			const id = Date.now().toString();
			if (lastGenerationId !== id) {
				setLastGenerationId(id);
				setChatMessages(prev => [...prev, { id, type: 'assistant', content: clarificationMessage, timestamp: new Date() }]);
				setActiveSuggestions(suggestions ?? []);
				setIsGenerating(false);
			}
		}
	}, [clarificationNeeded, outOfScope, unrelatedQuery, locationNotFound, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (locationNotFound && !loading && isGenerating) {
			const id = `locnotfound_${Date.now()}`;
			if (lastGenerationId !== id) {
				setLastGenerationId(id);
				setChatMessages(prev => [...prev, {
					id, type: 'assistant',
					content: `📍 ${clarificationMessage || "I couldn't find that neighborhood."}`,
					timestamp: new Date(),
				}]);
				setActiveSuggestions(suggestions ?? []);
				setIsGenerating(false);
			}
		}
	}, [locationNotFound, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (adventures.length > 0 && !loading && isGenerating) {
			const id = `success_alldone_${Date.now()}`;
			if (lastGenerationId !== id) {
				setLastGenerationId(id);
				setChatMessages(prev => [...prev, {
					id, type: 'assistant',
					content: `✅ Created ${adventures.length} adventures with ${researchStats.totalInsights} live insights (${Math.round(researchStats.avgConfidence * 100)}% confidence)`,
					timestamp: new Date(),
				}]);
				setIsGenerating(false);
			}
		}
	}, [loading, isGenerating]);

	const handleLoadConversation = async (id: string) => {
		setIsGenerating(false); setActiveSuggestions([]); setLastGenerationId(null); clearAdventures();
		const conv = await loadConversation(id);
		if (conv?.messages) {
			setChatMessages(conv.messages.map((m: any, i: number) => ({
				id: `loaded_${id}_${i}`, type: m.type as 'user' | 'assistant',
				content: m.content, timestamp: new Date(m.timestamp),
			})));
			setLocation(conv.location);
			setQueryId(conv.query_id ?? null);
		}
	};

	const handleNewChat = () => {
		setIsGenerating(false); setActiveSuggestions([]); setLastGenerationId(null); clearAdventures();
		setChatMessages([{
			id: `welcome_${Date.now()}`, type: 'assistant',
			content: `Hi ${user?.username}! 👋\n\nDiscover amazing places across the US — Boston, NYC, Chicago, Austin, and more.\n\n🎯 Tap a vibe chip, or type what you're in the mood for!\n\nExamples:\n• "party night out in Chicago"\n• "coffee shops near me"\n• "hidden gems in Austin, TX"\n\nLet's explore! 🗺️✨`,
			timestamp: new Date(),
		}]);
		setCurrentConversationId(null); setQueryId(null);
	};

	const handleDeleteConversation = async (id: string) => {
		await deleteConversation(id);
		if (id === currentConversationId) handleNewChat();
	};

	// ✅ _sendQuery — when manual address is set, always use it as-is.
	// When auto-detect is on, pass location as-is too and let the backend
	// LocationParser extract the city from the query text. The frontend no
	// longer hard-codes Boston/NYC inference.
	const _sendQuery = useCallback((query: string, fillInput = false) => {
		if (loading) return;
		// Always use the current location string — manual or auto.
		// Backend LocationParser will extract an explicit city/neighborhood
		// from the query and use user_address only for routing origin.
		const loc = location;
		if (fillInput) setInput(query);
		setChatMessages(prev => [...prev, {
			id: Date.now().toString(), type: 'user', content: query, timestamp: new Date(),
		}]);
		setActiveSuggestions([]);
		setIsGenerating(true);
		generateAdventuresWithStreaming(query, loc, generationOptions);
		setInput('');
	}, [loading, location, generateAdventuresWithStreaming, generationOptions]);

	const handleSend = useCallback(() => { if (!input.trim() || loading) return; _sendQuery(input.trim()); }, [input, loading, _sendQuery]);
	const handleSuggestionClick = useCallback((s: string) => _sendQuery(s), [_sendQuery]);
	const handleVibeSelect = useCallback((query: string) => { if (!loading) _sendQuery(query); }, [loading, _sendQuery]);

	const handleAdventureSaved = (id: string, name: string) => {
		setSavedAdventureName(name); setShowSaveNotification(true);
		setChatMessages(prev => [...prev, {
			id: Date.now().toString(), type: 'assistant',
			content: `💾 Saved "${name}" to your collection!`, timestamp: new Date(),
		}]);
		setTimeout(() => setShowSaveNotification(false), 5000);
	};

	useEffect(() => {
		if (chatMessages.length === 0) {
			setChatMessages([{
				id: `initial_${Date.now()}`, type: 'assistant',
				content: `Hi ${user?.username}! 👋\n\nDiscover amazing places across the US — Boston, NYC, Chicago, Austin, and more.\n\n🎯 Tap a vibe chip, or type what you're in the mood for!\n\nExamples:\n• "party night out in Chicago"\n• "coffee shops near me"\n• "hidden gems in Austin, TX"\n\nLet's explore! 🗺️✨`,
				timestamp: new Date(),
			}]);
		}
	}, []);

	const panelProps = {
		user, layoutMode, adventures, loading, researchStats,
		outOfScope: !!outOfScope, scopeIssue: scopeIssue ?? null,
		clarificationNeeded: !!clarificationNeeded && !locationNotFound,
		unrelatedQuery: !!unrelatedQuery,
		clarificationMessage, suggestions: suggestions ?? [],
		recommendedServices: recommendedServices ?? [], metadata,
		progressUpdates, currentProgress, toggleLayout,
		handleAdventureSaved, handleSuggestionClick, isDark, isMobile,
	};

	const chatProps = {
		layoutMode, conversations, currentConversationId, chatMessages, loading,
		activeSuggestions, input, location, showLocationEdit, customAddress,
		isManualAddress, locationInputRef, chatEndRef, user, isDark, isMobile,
		openSidebarRef, generationOptions, setGenerationOptions,
		setInput, setShowLocationEdit, setCustomAddress,
		handleSend, handleVibeSelect, handleSuggestionClick,
		handleLoadConversation, handleNewChat, handleDeleteConversation,
		handleManualAddressSet, handleResetToAuto,
		onOpenGroupMode: () => setShowGroupMode(true),
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', background: 'transparent', overflow: 'hidden' }}>
			{showSaveNotification && (
				<div style={{
					position: 'fixed',
					top: isMobile ? 'auto' : '80px', bottom: isMobile ? '80px' : 'auto',
					right: '16px', left: isMobile ? '16px' : 'auto',
					background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
					color: 'white', padding: '14px 18px', borderRadius: '12px',
					boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 2000,
					display: 'flex', alignItems: 'center', gap: '10px',
					animation: 'slideIn 0.3s ease-out',
				}}>
					<div style={{ fontSize: '1.3rem' }}>✅</div>
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 600, marginBottom: '2px', fontSize: isMobile ? '0.9rem' : '1rem' }}>Adventure Saved!</div>
						<div style={{ fontSize: '0.82rem', opacity: 0.9 }}>"{savedAdventureName}" saved</div>
					</div>
					<button onClick={() => setShowSaveNotification(false)}
						style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
					>✕</button>
				</div>
			)}

			{!isMobile && (
				<div style={{ flex: 1, display: 'grid', gridTemplateColumns: layoutMode === 'chat-left' ? '370px 1fr' : '1fr 370px', overflow: 'hidden' }}>
					{layoutMode === 'chat-left'
						? <><ChatPanel {...chatProps} /><AdventuresPanel {...panelProps} /></>
						: <><AdventuresPanel {...panelProps} /><ChatPanel {...chatProps} /></>
					}
				</div>
			)}

			{isMobile && (
				<>
					<div style={{ flex: 1, overflow: 'hidden' }}>
						<div style={{ display: mobileTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
							<ChatPanel {...chatProps} />
						</div>
						<div style={{ display: mobileTab === 'adventures' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
							<AdventuresPanel {...panelProps} />
						</div>
					</div>
					<MobileTabBar activeTab={mobileTab} setActiveTab={setMobileTab} loading={loading} adventureCount={adventures.length} isDark={isDark} />
				</>
			)}

			{showOnboarding && (
				<OnboardingModal username={user?.username || ''} onComplete={(pref) => { setShowOnboarding(false); handleSuggestionClick(pref); }} />
			)}
			{showGroupMode && (
				<GroupModeModal location={location} onGenerate={handleSuggestionClick} onClose={() => setShowGroupMode(false)} />
			)}

			<style>{`
				@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
				@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
				.spinner { width: 12px; height: 12px; border: 2px solid rgba(3,105,161,0.3); border-top-color: #0369a1; border-radius: 50%; animation: spin 0.8s linear infinite; }
				@keyframes spin { to { transform: rotate(360deg); } }
			`}</style>
		</div>
	);
};

export default AdventuresPage;