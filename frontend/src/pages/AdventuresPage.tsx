// frontend/src/pages/AdventuresPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdventures } from '../hooks/useAdventures';
import { useChatHistory } from '../hooks/useChatHistory';
import { useTheme, t } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import EnhancedAdventureCard from '../components/EnhancedAdventureCard';
import ChatSidebar from '../components/ChatSidebar';
import OutOfScopeMessage from '../components/OutOfScopeMessage';
import ProgressTracker from '../components/ProgressTracker';

interface ChatMessage {
	id: string;
	type: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

type LayoutMode = 'chat-left' | 'chat-right';
type MobileTab = 'chat' | 'adventures';

// ========================================
// CHAT PANEL
// ========================================
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
	setInput: (v: string) => void;
	setShowLocationEdit: (v: boolean) => void;
	setCustomAddress: (v: string) => void;
	handleSend: () => void;
	handleSuggestionClick: (s: string) => void;
	handleLoadConversation: (id: string) => void;
	handleNewChat: () => void;
	handleDeleteConversation: (id: string) => void;
	handleManualAddressSet: () => void;
	handleResetToAuto: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
	layoutMode, conversations, currentConversationId, chatMessages, loading,
	activeSuggestions, input, location, showLocationEdit, customAddress,
	isManualAddress, locationInputRef, chatEndRef, user, isDark, isMobile,
	setInput, setShowLocationEdit, setCustomAddress, handleSend,
	handleSuggestionClick, handleLoadConversation, handleNewChat,
	handleDeleteConversation, handleManualAddressSet, handleResetToAuto,
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
			{/* Sidebar hidden on mobile */}
			{!isMobile && (
				<ChatSidebar
					conversations={conversations}
					currentConversationId={currentConversationId}
					loading={false}
					onLoadConversation={handleLoadConversation}
					onNewChat={handleNewChat}
					onDeleteConversation={handleDeleteConversation}
					layoutMode={layoutMode}
				/>
			)}

			{/* Chat header */}
			<div style={{
				padding: isMobile ? '12px 16px' : '20px', flexShrink: 0,
				borderBottom: `1px solid ${borderColor}`,
				background: isDark
					? 'linear-gradient(135deg, rgba(102,126,234,0.25) 0%, rgba(118,75,162,0.25) 100%)'
					: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				color: isDark ? 'white' : 'black',
			}}>
				<h1 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', margin: '0 0 3px 0' }}>🗺️ MiniQuest</h1>
				<div style={{ fontSize: '0.75rem', opacity: 0.9 }}>7 AI Agents • Live Research • Real-time Progress</div>
				{currentConversationId && <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4 }}>💾 Auto-saving conversation</div>}
			</div>

			{/* Messages */}
			<div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '10px' : '15px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
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
							<div className="spinner" />
							<strong>Processing...</strong>
						</div>
						<div style={{ fontSize: '0.75rem', color: tk.textMuted }}>7 agents working{!isMobile && ' • Check right panel for progress'}</div>
					</div>
				)}
				<div ref={chatEndRef} />
			</div>

			{/* Suggestions */}
			{activeSuggestions.length > 0 && !loading && (
				<div style={{
					padding: '10px 12px', flexShrink: 0, maxHeight: 160, overflowY: 'auto',
					borderTop: `1px solid ${borderColor}`,
					background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
				}}>
					<div style={{ fontSize: '0.72rem', color: isDark ? '#fcd34d' : '#92400e', marginBottom: 6, fontWeight: 600 }}>💡 Quick suggestions:</div>
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

			{/* Location + input */}
			<div style={{ padding: isMobile ? '10px 12px' : '15px', borderTop: `1px solid ${borderColor}`, background: tk.cardBg, flexShrink: 0 }}>
				{!showLocationEdit ? (
					<div style={{ marginBottom: 8 }}>
						<div style={{
							padding: '8px 10px', borderRadius: 8, marginBottom: 6,
							background: isManualAddress
								? (isDark ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg,#fef3c7,#fde68a)')
								: location.includes('Boston')
									? (isDark ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg,#dbeafe,#bfdbfe)')
									: (isDark ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg,#fef3c7,#fde68a)'),
							border: isManualAddress
								? `2px solid ${isDark ? 'rgba(245,158,11,0.4)' : '#f59e0b'}`
								: location.includes('Boston')
									? `1px solid ${isDark ? 'rgba(147,197,253,0.3)' : '#93c5fd'}`
									: `1px solid ${isDark ? 'rgba(252,211,77,0.3)' : '#fcd34d'}`,
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ fontSize: '1rem' }}>{isManualAddress ? '📍' : location.includes('Boston') ? '🏛️' : '🗽'}</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: '0.68rem', fontWeight: 600, marginBottom: 1, color: isManualAddress ? (isDark ? '#fcd34d' : '#92400e') : location.includes('Boston') ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#fcd34d' : '#92400e') }}>
										{isManualAddress ? '📍 Manual' : '🤖 Smart Detection'}
									</div>
									<div style={{ fontSize: '0.82rem', fontWeight: 600, color: tk.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</div>
								</div>
								<button onClick={() => setShowLocationEdit(true)}
									style={{
										background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
										border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
										borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
										fontSize: '0.72rem', fontWeight: 600, color: tk.textSecondary,
										whiteSpace: 'nowrap', flexShrink: 0,
									}}
								>{isManualAddress ? '✏️' : '📍 Set'}</button>
							</div>
						</div>
						{!isMobile && (
							<div style={{ fontSize: '0.7rem', color: tk.textMuted, fontStyle: 'italic', padding: '0 4px' }}>
								{isManualAddress ? (
									<>Using your address for routing.{' '}
										<button onClick={handleResetToAuto} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.7rem', padding: 0 }}>Switch to auto-detect</button>
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
							<div style={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#7dd3fc' : '#0369a1', marginBottom: 6 }}>📍 Set Custom Address</div>
							<div style={{ display: 'flex', gap: 5 }}>
								<input
									ref={locationInputRef} type="text" value={customAddress}
									onChange={e => setCustomAddress(e.target.value)}
									onKeyPress={e => e.key === 'Enter' && handleManualAddressSet()}
									placeholder="e.g., 123 Main St, Boston, MA" autoFocus
									style={{ flex: 1, padding: '7px 10px', border: '2px solid #3b82f6', borderRadius: 6, fontSize: '0.82rem', outline: 'none', background: tk.inputBg, color: tk.textPrimary }}
								/>
								<button onClick={handleManualAddressSet} disabled={!customAddress.trim()}
									style={{ padding: '7px 10px', background: customAddress.trim() ? '#16a34a' : (isDark ? '#374151' : '#cbd5e0'), color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: customAddress.trim() ? 'pointer' : 'not-allowed' }}>✓</button>
								<button onClick={() => { setShowLocationEdit(false); setCustomAddress(''); }}
									style={{ padding: '7px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>✕</button>
							</div>
						</div>
					</div>
				)}

				{/* Message input row */}
				<div style={{ display: 'flex', gap: 7 }}>
					<input
						type="text" value={input}
						onChange={e => setInput(e.target.value)}
						onKeyPress={e => e.key === 'Enter' && handleSend()}
						placeholder={isManualAddress ? 'What to explore?' : "e.g., 'coffee shops in Boston'"}
						disabled={loading}
						style={{
							flex: 1, padding: isMobile ? '10px 10px' : '10px 12px',
							border: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
							borderRadius: 8, fontSize: isMobile ? '0.85rem' : '0.9rem', outline: 'none',
							background: tk.inputBg, color: tk.textPrimary, transition: 'border-color 0.2s',
						}}
						onFocus={e => { e.currentTarget.style.borderColor = '#667eea'; }}
						onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'; }}
					/>
					<button onClick={handleSend} disabled={loading || !input.trim()}
						style={{
							padding: '10px 14px',
							background: loading || !input.trim() ? (isDark ? '#374151' : '#cbd5e0') : '#667eea',
							color: 'white', border: 'none', borderRadius: 8,
							cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
							fontSize: '0.9rem', fontWeight: 600,
						}}>
						{loading ? '⏳' : '🚀'}
					</button>
				</div>
			</div>
		</div>
	);
};

// ========================================
// ADVENTURES PANEL
// ========================================
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
			{/* Welcome bar — hide toggle button on mobile since tabs handle switching */}
			<div style={{
				display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				marginBottom: isMobile ? '12px' : '20px', padding: isMobile ? '10px 14px' : '15px 20px',
				borderRadius: '12px',
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
						style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }}
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
				<OutOfScopeMessage scopeIssue={scopeIssue ?? 'multi_day_trip'} message={clarificationMessage ?? "This request is outside MiniQuest's scope"} suggestions={suggestions ?? []} recommendedServices={recommendedServices ?? []} onSuggestionClick={handleSuggestionClick} detectedCity={metadata?.detected_city} />
			)}

			{clarificationNeeded && !outOfScope && !unrelatedQuery && !loading && (
				<div style={{ background: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
					<div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: isDark ? '#fcd34d' : '#92400e' }}>🤔 {clarificationMessage}</div>
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
					<div style={{ fontSize: '0.9rem', color: tk.textMuted }}>Tell me what you'd like to explore in the chat!</div>
				</div>
			)}
		</div>
	);
};

// ========================================
// MOBILE TAB BAR
// ========================================
const MobileTabBar: React.FC<{
	activeTab: MobileTab;
	setActiveTab: (t: MobileTab) => void;
	loading: boolean;
	adventureCount: number;
	isDark: boolean;
}> = ({ activeTab, setActiveTab, loading, adventureCount, isDark }) => {
	const tk = t(isDark);
	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

	return (
		<div style={{
			display: 'flex', borderTop: `1px solid ${borderColor}`,
			background: tk.cardBg, flexShrink: 0,
		}}>
			{(['chat', 'adventures'] as MobileTab[]).map(tab => {
				const isActive = activeTab === tab;
				const label = tab === 'chat' ? '💬 Chat' : `🗺️ Adventures${adventureCount > 0 ? ` (${adventureCount})` : ''}`;
				return (
					<button key={tab} onClick={() => setActiveTab(tab)}
						style={{
							flex: 1, padding: '13px 8px',
							background: 'transparent', border: 'none',
							borderTop: isActive ? '2px solid #667eea' : '2px solid transparent',
							fontSize: '0.88rem', fontWeight: isActive ? 700 : 500,
							color: isActive ? '#667eea' : tk.textMuted,
							cursor: 'pointer', transition: 'all 0.15s',
							display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
						}}>
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

// ========================================
// MAIN
// ========================================
const AdventuresPage: React.FC = () => {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const isMobile = useIsMobile();
	const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [location, setLocation] = useState('Boston, MA');
	const [detectedCity, setDetectedCity] = useState<'boston' | 'new-york'>('boston');
	const [showLocationEdit, setShowLocationEdit] = useState(false);
	const [customAddress, setCustomAddress] = useState('');
	const [isManualAddress, setIsManualAddress] = useState(false);
	const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
	const [queryId, setQueryId] = useState<string | null>(null);
	const [showSaveNotification, setShowSaveNotification] = useState(false);
	const [savedAdventureName, setSavedAdventureName] = useState('');
	const chatEndRef = useRef<HTMLDivElement>(null);
	const locationInputRef = useRef<HTMLInputElement>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
	const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => (localStorage.getItem('miniquest_layout_mode') as LayoutMode) || 'chat-left');

	const { adventures, loading, clarificationNeeded, clarificationMessage, suggestions, outOfScope, scopeIssue, recommendedServices, unrelatedQuery, metadata, progressUpdates, currentProgress, researchStats, generateAdventuresWithStreaming, clearAdventures } = useAdventures();
	const { autoSaveConversation, currentConversationId, conversations, loadConversations, loadConversation, deleteConversation, setCurrentConversationId } = useChatHistory();

	// Auto-switch to adventures tab on mobile when results arrive
	useEffect(() => {
		if (isMobile && adventures.length > 0 && !loading) {
			setMobileTab('adventures');
		}
	}, [adventures.length, loading, isMobile]);

	const detectCityFromQuery = (query: string): 'boston' | 'new-york' => {
		const q = query.toLowerCase();
		const nyPatterns = ['new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'harlem', 'chelsea', 'soho', 'tribeca', 'greenwich village', 'east village', 'upper east', 'upper west', 'midtown', 'downtown manhattan', 'financial district'];
		const bostonPatterns = ['boston', 'cambridge', 'back bay', 'beacon hill', 'north end', 'south end', 'fenway', 'seaport', 'charlestown', 'allston', 'brighton', 'jamaica plain', 'roxbury', 'dorchester'];
		const hasNY = nyPatterns.some(p => q.includes(p));
		const hasBoston = bostonPatterns.some(p => q.includes(p));
		if (hasNY && !hasBoston) return 'new-york';
		if (hasBoston && !hasNY) return 'boston';
		return detectedCity;
	};

	const updateLocationForCity = (city: 'boston' | 'new-york') => {
		if (isManualAddress) return;
		setDetectedCity(city);
		setLocation(city === 'boston' ? 'Boston, MA' : 'New York, NY');
	};

	const validateAddress = (address: string) => {
		const a = address.toLowerCase().trim();
		const bostonPats = ['boston, ma', 'boston ma', 'boston,ma', 'boston, massachusetts', 'boston massachusetts', 'boston, usa', 'cambridge, ma', 'cambridge ma'];
		const nycPats = ['new york, ny', 'new york ny', 'new york,ny', 'new york, new york', 'nyc', 'ny, ny', 'new york, usa', 'brooklyn, ny', 'brooklyn ny', 'manhattan, ny', 'manhattan ny', 'queens, ny'];
		if (bostonPats.some(p => a.includes(p))) return { valid: true, city: 'boston' as const };
		if (nycPats.some(p => a.includes(p))) return { valid: true, city: 'new-york' as const };
		return { valid: false, error: 'Address must be in Boston, MA or New York, NY area' };
	};

	const handleManualAddressSet = () => {
		if (!customAddress.trim()) return;
		const v = validateAddress(customAddress);
		if (!v.valid) {
			setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: `❌ ${v.error}\n\nPlease enter an address in:\n• Boston, MA\n• New York, NY`, timestamp: new Date() }]);
			return;
		}
		setLocation(customAddress);
		setDetectedCity(v.city!);
		setIsManualAddress(true);
		setShowLocationEdit(false);
		setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: `✅ Using your custom address in ${v.city === 'boston' ? 'Boston' : 'New York'}: "${customAddress}"`, timestamp: new Date() }]);
	};

	const handleResetToAuto = () => {
		setIsManualAddress(false);
		setCustomAddress('');
		setLocation(detectedCity === 'boston' ? 'Boston, MA' : 'New York, NY');
		setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: '🤖 Switched back to smart city detection.', timestamp: new Date() }]);
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
			if (lastGenerationId !== id) { setLastGenerationId(id); setChatMessages(prev => [...prev, { id, type: 'assistant', content: clarificationMessage || "I'm MiniQuest!", timestamp: new Date() }]); setActiveSuggestions(suggestions ?? []); setIsGenerating(false); }
		}
	}, [unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (outOfScope && !unrelatedQuery && !loading && isGenerating) {
			const id = `outofscope_${Date.now()}`;
			if (lastGenerationId !== id) { setLastGenerationId(id); setChatMessages(prev => [...prev, { id, type: 'assistant', content: `🚫 ${clarificationMessage ?? "Out of scope."}`, timestamp: new Date() }]); setActiveSuggestions(suggestions ?? []); setIsGenerating(false); }
		}
	}, [outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (clarificationNeeded && !outOfScope && !unrelatedQuery && !loading && isGenerating) {
			const id = Date.now().toString();
			if (lastGenerationId !== id) { setLastGenerationId(id); setChatMessages(prev => [...prev, { id, type: 'assistant', content: clarificationMessage, timestamp: new Date() }]); setActiveSuggestions(suggestions ?? []); setIsGenerating(false); }
		}
	}, [clarificationNeeded, outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (adventures.length > 0 && !loading && isGenerating) {
			const id = `success_${adventures.length}_${Date.now()}`;
			if (lastGenerationId !== id) { setLastGenerationId(id); setChatMessages(prev => [...prev, { id, type: 'assistant', content: `✅ Created ${adventures.length} adventures with ${researchStats.totalInsights} live insights (${Math.round(researchStats.avgConfidence * 100)}% confidence)`, timestamp: new Date() }]); setIsGenerating(false); }
		}
	}, [adventures, loading, researchStats, isGenerating]);

	const handleLoadConversation = async (id: string) => {
		setIsGenerating(false); setActiveSuggestions([]); setLastGenerationId(null); clearAdventures();
		const conv = await loadConversation(id);
		if (conv?.messages) {
			setChatMessages(conv.messages.map((m: any, i: number) => ({ id: `loaded_${id}_${i}`, type: m.type as 'user' | 'assistant', content: m.content, timestamp: new Date(m.timestamp) })));
			setLocation(conv.location);
			setQueryId(conv.query_id ?? null);
		}
	};

	const handleNewChat = () => {
		setIsGenerating(false); setActiveSuggestions([]); setLastGenerationId(null); clearAdventures();
		setChatMessages([{ id: `welcome_${Date.now()}`, type: 'assistant', content: `Hi ${user?.username}! 👋\n\nI help you discover amazing places in Boston and New York City!\n\n🤖 Smart Mode: Just mention the city in your query\n• "Coffee shops in Boston"\n• "Museums in Manhattan"\n\n📍 Manual Mode: Click the location badge to set a custom address\n\nLet's explore! 🗺️✨`, timestamp: new Date() }]);
		setCurrentConversationId(null); setQueryId(null);
	};

	const handleDeleteConversation = async (id: string) => {
		await deleteConversation(id);
		if (id === currentConversationId) handleNewChat();
	};

	const handleSend = () => {
		if (!input.trim() || loading) return;
		if (!isManualAddress) updateLocationForCity(detectCityFromQuery(input));
		setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() }]);
		setActiveSuggestions([]); setIsGenerating(true);
		generateAdventuresWithStreaming(input, location);
		setInput('');
	};

	const handleSuggestionClick = (suggestion: string) => {
		if (!isManualAddress) updateLocationForCity(detectCityFromQuery(suggestion));
		setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: suggestion, timestamp: new Date() }]);
		setActiveSuggestions([]); setIsGenerating(true);
		generateAdventuresWithStreaming(suggestion, location);
	};

	const handleAdventureSaved = (id: string, name: string) => {
		setSavedAdventureName(name); setShowSaveNotification(true);
		setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: `💾 Saved "${name}" to your collection!`, timestamp: new Date() }]);
		setTimeout(() => setShowSaveNotification(false), 5000);
	};

	useEffect(() => {
		if (chatMessages.length === 0) {
			setChatMessages([{ id: `initial_${Date.now()}`, type: 'assistant', content: `Hi ${user?.username}! 👋\n\nI help you discover amazing places in Boston and New York City!\n\n🤖 Smart Mode: Just mention the city in your query\n• "Coffee shops in Boston"\n• "Museums in Manhattan"\n\n📍 Manual Mode: Click the location badge to set a custom address\n\nLet's explore! 🗺️✨`, timestamp: new Date() }]);
		}
	}, []);

	const panelProps = { user, layoutMode, adventures, loading, researchStats, outOfScope: !!outOfScope, scopeIssue: scopeIssue ?? null, clarificationNeeded: !!clarificationNeeded, unrelatedQuery: !!unrelatedQuery, clarificationMessage, suggestions: suggestions ?? [], recommendedServices: recommendedServices ?? [], metadata, progressUpdates, currentProgress, toggleLayout, handleAdventureSaved, handleSuggestionClick, isDark, isMobile };
	const chatProps = { layoutMode, conversations, currentConversationId, chatMessages, loading, activeSuggestions, input, location, showLocationEdit, customAddress, isManualAddress, locationInputRef, chatEndRef, user, isDark, isMobile, setInput, setShowLocationEdit, setCustomAddress, handleSend, handleSuggestionClick, handleLoadConversation, handleNewChat, handleDeleteConversation, handleManualAddressSet, handleResetToAuto };

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', background: 'transparent', overflow: 'hidden' }}>
			{showSaveNotification && (
				<div style={{ position: 'fixed', top: isMobile ? 'auto' : '80px', bottom: isMobile ? '80px' : 'auto', right: '16px', left: isMobile ? '16px' : 'auto', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideIn 0.3s ease-out' }}>
					<div style={{ fontSize: '1.3rem' }}>✅</div>
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 600, marginBottom: '2px', fontSize: isMobile ? '0.9rem' : '1rem' }}>Adventure Saved!</div>
						<div style={{ fontSize: '0.82rem', opacity: 0.9 }}>"{savedAdventureName}" saved</div>
					</div>
					<button onClick={() => setShowSaveNotification(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
				</div>
			)}

			{/* Desktop: side-by-side grid */}
			{!isMobile && (
				<div style={{ flex: 1, display: 'grid', gridTemplateColumns: layoutMode === 'chat-left' ? '350px 1fr' : '1fr 350px', overflow: 'hidden' }}>
					{layoutMode === 'chat-left' ? (
						<><ChatPanel {...chatProps} /><AdventuresPanel {...panelProps} /></>
					) : (
						<><AdventuresPanel {...panelProps} /><ChatPanel {...chatProps} /></>
					)}
				</div>
			)}

			{/* Mobile: tab switcher */}
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
					<MobileTabBar
						activeTab={mobileTab}
						setActiveTab={setMobileTab}
						loading={loading}
						adventureCount={adventures.length}
						isDark={isDark}
					/>
				</>
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