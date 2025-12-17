// frontend/src/pages/AdventuresPage.tsx - COMPLETE WITH HYBRID LOCATION SYSTEM
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdventures } from '../hooks/useAdventures';
import { useChatHistory } from '../hooks/useChatHistory';
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

// ========================================
// CHAT PANEL COMPONENT - WITH HYBRID LOCATION
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
	setInput: (value: string) => void;
	setShowLocationEdit: (value: boolean) => void;
	setCustomAddress: (value: string) => void;
	handleSend: () => void;
	handleSuggestionClick: (suggestion: string) => void;
	handleLoadConversation: (id: string) => void;
	handleNewChat: () => void;
	handleDeleteConversation: (id: string) => void;
	handleManualAddressSet: () => void;
	handleResetToAuto: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
	layoutMode,
	conversations,
	currentConversationId,
	chatMessages,
	loading,
	activeSuggestions,
	input,
	location,
	showLocationEdit,
	customAddress,
	isManualAddress,
	locationInputRef,
	chatEndRef,
	user,
	setInput,
	setShowLocationEdit,
	setCustomAddress,
	handleSend,
	handleSuggestionClick,
	handleLoadConversation,
	handleNewChat,
	handleDeleteConversation,
	handleManualAddressSet,
	handleResetToAuto,
}) => (
	<div style={{
		background: 'white',
		borderRight: layoutMode === 'chat-left' ? '1px solid #e2e8f0' : 'none',
		borderLeft: layoutMode === 'chat-right' ? '1px solid #e2e8f0' : 'none',
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		overflow: 'hidden',
		position: 'relative',
	}}>
		<ChatSidebar
			conversations={conversations}
			currentConversationId={currentConversationId}
			loading={false}
			onLoadConversation={handleLoadConversation}
			onNewChat={handleNewChat}
			onDeleteConversation={handleDeleteConversation}
			layoutMode={layoutMode}
		/>

		<div style={{
			padding: '20px',
			borderBottom: '1px solid #e2e8f0',
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			color: 'white',
			flexShrink: 0,
		}}>
			<h1 style={{ fontSize: '1.3rem', margin: '0 0 5px 0' }}>🗺️ MiniQuest</h1>
			<div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
				7 AI Agents • Live Research • Real-time Progress
			</div>
			{currentConversationId && (
				<div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '4px' }}>
					💾 Auto-saving conversation
				</div>
			)}
		</div>

		<div style={{
			flex: 1,
			overflowY: 'auto',
			padding: '15px',
			display: 'flex',
			flexDirection: 'column',
			gap: '10px',
			minHeight: 0,
		}}>
			{chatMessages.map((msg) => (
				<div
					key={msg.id}
					style={{
						alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
						maxWidth: '85%',
					}}
				>
					<div style={{
						padding: '10px 14px',
						borderRadius: msg.type === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
						background: msg.type === 'user' ? '#667eea' : '#f1f5f9',
						color: msg.type === 'user' ? 'white' : '#1e293b',
						fontSize: '0.9rem',
						lineHeight: '1.4',
						whiteSpace: 'pre-line',
					}}>
						{msg.content}
					</div>
					<div style={{
						fontSize: '0.65rem',
						color: '#94a3b8',
						marginTop: '4px',
						textAlign: msg.type === 'user' ? 'right' : 'left',
					}}>
						{msg.timestamp.toLocaleTimeString()}
					</div>
				</div>
			))}

			{loading && (
				<div style={{
					alignSelf: 'flex-start',
					background: '#f0f9ff',
					border: '1px solid #bae6fd',
					padding: '12px',
					borderRadius: '12px 12px 12px 2px',
					fontSize: '0.85rem',
					color: '#0369a1',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
						<div className="spinner" />
						<strong>Processing...</strong>
					</div>
					<div style={{ fontSize: '0.75rem', color: '#64748b' }}>
						7 agents working • Check right panel for progress
					</div>
				</div>
			)}

			<div ref={chatEndRef} />
		</div>

		{activeSuggestions.length > 0 && !loading && (
			<div style={{
				padding: '12px 15px',
				borderTop: '1px solid #e2e8f0',
				background: '#fffbeb',
				flexShrink: 0,
				maxHeight: '200px',
				overflowY: 'auto',
			}}>
				<div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '8px', fontWeight: '600' }}>
					💡 Quick suggestions:
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					{activeSuggestions.map((suggestion, idx) => (
						<button
							key={idx}
							onClick={() => handleSuggestionClick(suggestion)}
							style={{
								background: 'white',
								border: '1px solid #fbbf24',
								borderRadius: '6px',
								padding: '8px 10px',
								textAlign: 'left',
								cursor: 'pointer',
								fontSize: '0.8rem',
								color: '#1e293b',
								transition: 'all 0.15s',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = '#fef3c7';
								e.currentTarget.style.borderColor = '#f59e0b';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'white';
								e.currentTarget.style.borderColor = '#fbbf24';
							}}
						>
							→ {suggestion}
						</button>
					))}
				</div>
			</div>
		)}

		{/* ✅ HYBRID LOCATION SECTION */}
		<div style={{
			padding: '15px',
			borderTop: '1px solid #e2e8f0',
			background: '#ffffff',
			flexShrink: 0,
		}}>
			{!showLocationEdit ? (
				// Display Mode
				<div style={{ marginBottom: '10px' }}>
					<div style={{
						padding: '10px 12px',
						background: isManualAddress
							? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
							: location.includes('Boston')
								? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
								: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
						border: isManualAddress
							? '2px solid #f59e0b'
							: location.includes('Boston')
								? '1px solid #93c5fd'
								: '1px solid #fcd34d',
						borderRadius: '8px',
						marginBottom: '8px',
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
							<span style={{ fontSize: '1.2rem' }}>
								{isManualAddress ? '📍' : location.includes('Boston') ? '🏛️' : '🗽'}
							</span>
							<div style={{ flex: 1 }}>
								<div style={{
									fontSize: '0.7rem',
									fontWeight: '600',
									color: isManualAddress ? '#92400e' : location.includes('Boston') ? '#1e40af' : '#92400e',
									marginBottom: '3px',
								}}>
									{isManualAddress ? '📍 Manual Address' : '🤖 Smart Detection'}
								</div>
								<div style={{
									fontSize: '0.85rem',
									fontWeight: '600',
									color: '#1e293b',
								}}>
									{location}
								</div>
							</div>
							<button
								onClick={() => setShowLocationEdit(true)}
								style={{
									background: 'rgba(255, 255, 255, 0.8)',
									border: '1px solid rgba(0, 0, 0, 0.1)',
									borderRadius: '6px',
									padding: '6px 10px',
									cursor: 'pointer',
									fontSize: '0.75rem',
									fontWeight: '600',
									color: '#475569',
									transition: 'all 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'white';
									e.currentTarget.style.borderColor = '#3b82f6';
									e.currentTarget.style.color = '#3b82f6';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
									e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
									e.currentTarget.style.color = '#475569';
								}}
							>
								{isManualAddress ? '✏️ Edit' : '📍 Set Custom'}
							</button>
						</div>
					</div>

					<div style={{
						fontSize: '0.7rem',
						color: '#64748b',
						fontStyle: 'italic',
						padding: '0 4px',
					}}>
						{isManualAddress ? (
							<>
								Using your address for routing. <button
									onClick={handleResetToAuto}
									style={{
										background: 'none',
										border: 'none',
										color: '#3b82f6',
										cursor: 'pointer',
										textDecoration: 'underline',
										fontSize: '0.7rem',
										padding: 0,
									}}
								>
									Switch to auto-detect
								</button>
							</>
						) : (
							'💡 I\'ll detect the city from your query (or set a custom address above)'
						)}
					</div>
				</div>
			) : (
				// Edit Mode
				<div style={{ marginBottom: '10px' }}>
					<div style={{
						background: '#f0f9ff',
						border: '1px solid #bae6fd',
						borderRadius: '8px',
						padding: '12px',
						marginBottom: '8px',
					}}>
						<div style={{
							fontSize: '0.8rem',
							fontWeight: '600',
							color: '#0369a1',
							marginBottom: '8px',
						}}>
							📍 Set Custom Address
						</div>
						<div style={{
							fontSize: '0.7rem',
							color: '#64748b',
							marginBottom: '10px',
							lineHeight: '1.4',
						}}>
							Enter your starting address for accurate routing between venues.
							<strong style={{ color: '#0369a1' }}> Address must be in Boston, MA or New York, NY area.</strong>
						</div>
						<div style={{ display: 'flex', gap: '6px' }}>
							<input
								ref={locationInputRef}
								type="text"
								value={customAddress}
								onChange={(e) => setCustomAddress(e.target.value)}
								onKeyPress={(e) => e.key === 'Enter' && handleManualAddressSet()}
								placeholder="e.g., 123 Main St, Boston, MA"
								autoFocus
								style={{
									flex: 1,
									padding: '8px 12px',
									border: '2px solid #3b82f6',
									borderRadius: '6px',
									fontSize: '0.85rem',
									outline: 'none',
								}}
							/>
							<button
								onClick={handleManualAddressSet}
								disabled={!customAddress.trim()}
								style={{
									padding: '8px 14px',
									background: customAddress.trim() ? '#16a34a' : '#cbd5e0',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									fontSize: '0.8rem',
									fontWeight: '600',
									cursor: customAddress.trim() ? 'pointer' : 'not-allowed',
								}}
							>
								✓ Set
							</button>
							<button
								onClick={() => {
									setShowLocationEdit(false);
									setCustomAddress('');
								}}
								style={{
									padding: '8px 14px',
									background: '#ef4444',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									fontSize: '0.8rem',
									fontWeight: '600',
									cursor: 'pointer',
								}}
							>
								✕
							</button>
						</div>
					</div>
				</div>
			)}

			<div style={{ display: 'flex', gap: '8px' }}>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && handleSend()}
					placeholder={
						isManualAddress
							? "What would you like to explore?"
							: "e.g., 'coffee shops in Boston' or 'museums in NYC'"
					}
					disabled={loading}
					style={{
						flex: 1,
						padding: '10px 12px',
						border: '2px solid #e2e8f0',
						borderRadius: '8px',
						fontSize: '0.9rem',
						outline: 'none',
					}}
				/>
				<button
					onClick={handleSend}
					disabled={loading || !input.trim()}
					style={{
						padding: '10px 16px',
						background: loading || !input.trim() ? '#cbd5e0' : '#667eea',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
						fontSize: '0.9rem',
						fontWeight: '600',
					}}
				>
					{loading ? '⏳' : '🚀'}
				</button>
			</div>
		</div>
	</div>
);

// ========================================
// ADVENTURES PANEL COMPONENT (unchanged)
// ========================================
interface AdventuresPanelProps {
	user: any;
	layoutMode: LayoutMode;
	adventures: any[];
	loading: boolean;
	researchStats: any;
	outOfScope: boolean;
	scopeIssue: string | null;
	clarificationNeeded: boolean;
	unrelatedQuery: boolean;
	clarificationMessage: string;
	suggestions: string[];
	recommendedServices: any[];
	metadata?: any;
	progressUpdates: any[];
	currentProgress: any;
	toggleLayout: () => void;
	handleAdventureSaved: (id: string, name: string) => void;
	handleSuggestionClick: (suggestion: string) => void;
}

const AdventuresPanel: React.FC<AdventuresPanelProps> = ({
	user,
	layoutMode,
	adventures,
	loading,
	researchStats,
	outOfScope,
	scopeIssue,
	clarificationNeeded,
	unrelatedQuery,
	clarificationMessage,
	suggestions,
	recommendedServices,
	metadata,
	progressUpdates,
	currentProgress,
	toggleLayout,
	handleAdventureSaved,
	handleSuggestionClick,
}) => (
	<div style={{
		overflowY: 'auto',
		padding: '20px',
		height: '100%',
	}}>
		<div style={{
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: '20px',
			padding: '15px 20px',
			background: 'white',
			borderRadius: '12px',
			boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
		}}>
			<div>
				<div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>
					Welcome back
				</div>
				<div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>
					{user?.username}
				</div>
			</div>

			<button
				onClick={toggleLayout}
				style={{
					background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					color: 'white',
					border: 'none',
					padding: '8px 16px',
					borderRadius: '8px',
					fontSize: '0.85rem',
					fontWeight: '600',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					transition: 'transform 0.2s',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.transform = 'scale(1.05)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.transform = 'scale(1)';
				}}
				title={layoutMode === 'chat-left' ? 'Switch to Chat Right' : 'Switch to Chat Left'}
			>
				<span>🔄</span>
				<span>{layoutMode === 'chat-left' ? 'Chat → Right' : 'Chat → Left'}</span>
			</button>
		</div>

		{loading && (
			<ProgressTracker
				currentProgress={currentProgress}
				progressHistory={progressUpdates}
				isVisible={loading}
			/>
		)}

		{unrelatedQuery === true && !loading && (
			<div style={{
				background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
				color: 'white',
				borderRadius: '12px',
				padding: '30px',
				marginBottom: '20px',
				textAlign: 'center',
			}}>
				<div style={{ fontSize: '3rem', marginBottom: '15px' }}>🤖</div>
				<h2 style={{ fontSize: '1.5rem', marginBottom: '15px', fontWeight: '600' }}>
					Not About Adventures!
				</h2>
				<p style={{ fontSize: '1rem', marginBottom: '25px', opacity: 0.95, lineHeight: '1.6' }}>
					{clarificationMessage}
				</p>
				{suggestions && suggestions.length > 0 && (
					<div style={{
						background: 'rgba(255,255,255,0.15)',
						backdropFilter: 'blur(10px)',
						padding: '20px',
						borderRadius: '12px',
						border: '1px solid rgba(255,255,255,0.3)'
					}}>
						<h3 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: '600' }}>
							💡 Try asking about places like:
						</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
							{suggestions.map((suggestion, idx) => (
								<button
									key={idx}
									onClick={() => handleSuggestionClick(suggestion)}
									style={{
										background: 'rgba(255,255,255,0.9)',
										color: '#1e293b',
										border: 'none',
										padding: '12px 16px',
										borderRadius: '8px',
										fontSize: '0.95rem',
										cursor: 'pointer',
										transition: 'all 0.2s',
										textAlign: 'left',
										fontWeight: '500',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = 'white';
										e.currentTarget.style.transform = 'translateX(5px)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
										e.currentTarget.style.transform = 'translateX(0)';
									}}
								>
									→ {suggestion}
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		)}

		{outOfScope === true && !unrelatedQuery && !loading && (
			<OutOfScopeMessage
				scopeIssue={scopeIssue || 'multi_day_trip'}
				message={clarificationMessage || 'This request is outside MiniQuest\'s scope'}
				suggestions={suggestions || []}
				recommendedServices={recommendedServices || []}
				onSuggestionClick={handleSuggestionClick}
				detectedCity={metadata?.detected_city}
			/>
		)}

		{clarificationNeeded === true && !outOfScope && !unrelatedQuery && !loading && (
			<div style={{
				background: '#fffbeb',
				border: '1px solid #fbbf24',
				borderRadius: '12px',
				padding: '20px',
				marginBottom: '20px',
			}}>
				<div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px', color: '#92400e' }}>
					🤔 {clarificationMessage}
				</div>
				{suggestions && suggestions.length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
						<div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
							💡 Try these instead:
						</div>
						{suggestions.map((suggestion, idx) => (
							<button
								key={idx}
								onClick={() => handleSuggestionClick(suggestion)}
								style={{
									background: 'white',
									border: '1px solid #fbbf24',
									borderRadius: '8px',
									padding: '10px 14px',
									textAlign: 'left',
									cursor: 'pointer',
									fontSize: '0.9rem',
									color: '#1e293b',
									transition: 'all 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = '#fef3c7';
									e.currentTarget.style.borderColor = '#f59e0b';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'white';
									e.currentTarget.style.borderColor = '#fbbf24';
								}}
							>
								→ {suggestion}
							</button>
						))}
					</div>
				)}
			</div>
		)}

		{adventures.length > 0 && !outOfScope && !unrelatedQuery && (
			<>
				<div style={{
					marginBottom: '15px',
					padding: '12px 20px',
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					borderRadius: '10px',
				}}>
					<div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: '600' }}>
						📊 {adventures.length} Adventures • {researchStats.totalInsights} Live Insights • {Math.round(researchStats.avgConfidence * 100)}% Confidence
					</div>
				</div>

				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '20px',
				}}>
					{adventures.map((adventure, idx) => (
						<EnhancedAdventureCard
							key={idx}
							adventure={adventure}
							index={idx}
							onSave={(adventureId) => handleAdventureSaved(adventureId, adventure.title)}
						/>
					))}
				</div>
			</>
		)}

		{!loading && adventures.length === 0 && !outOfScope && !clarificationNeeded && !unrelatedQuery && (
			<div style={{
				textAlign: 'center',
				padding: '60px 20px',
				color: '#94a3b8',
			}}>
				<div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗺️</div>
				<div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>
					No adventures yet
				</div>
				<div style={{ fontSize: '0.9rem' }}>
					Tell me what you'd like to explore in the chat!
				</div>
			</div>
		)}
	</div>
);

// ========================================
// MAIN ADVENTURES PAGE COMPONENT - WITH HYBRID LOCATION
// ========================================
const AdventuresPage: React.FC = () => {
	const { user } = useAuth();
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');

	// ✅ Hybrid Location System
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

	const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
		const saved = localStorage.getItem('miniquest_layout_mode');
		return (saved as LayoutMode) || 'chat-left';
	});

	const {
		adventures,
		loading,
		error,
		clarificationNeeded,
		clarificationMessage,
		suggestions,
		outOfScope,
		scopeIssue,
		recommendedServices,
		unrelatedQuery,
		metadata,
		progressUpdates,
		currentProgress,
		researchStats,
		generateAdventures,
		generateAdventuresWithStreaming,
		clearAdventures,
	} = useAdventures();

	const {
		autoSaveConversation,
		currentConversationId,
		conversations,
		loadConversations,
		loadConversation,
		deleteConversation,
		setCurrentConversationId,
	} = useChatHistory();

	// ✅ City detection function
	const detectCityFromQuery = (query: string): 'boston' | 'new-york' => {
		const lowerQuery = query.toLowerCase();

		const nyPatterns = [
			'new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'queens',
			'bronx', 'staten island', 'harlem', 'chelsea', 'soho',
			'tribeca', 'greenwich village', 'east village', 'upper east',
			'upper west', 'midtown', 'downtown manhattan', 'financial district'
		];

		const bostonPatterns = [
			'boston', 'cambridge', 'back bay', 'beacon hill', 'north end',
			'south end', 'fenway', 'seaport', 'charlestown', 'allston',
			'brighton', 'jamaica plain', 'roxbury', 'dorchester'
		];

		const hasNY = nyPatterns.some(pattern => lowerQuery.includes(pattern));
		const hasBoston = bostonPatterns.some(pattern => lowerQuery.includes(pattern));

		if (hasNY && !hasBoston) return 'new-york';
		if (hasBoston && !hasNY) return 'boston';

		return detectedCity;
	};

	// ✅ Update location (respects manual override)
	const updateLocationForCity = (city: 'boston' | 'new-york') => {
		if (isManualAddress) return;

		setDetectedCity(city);
		setLocation(city === 'boston' ? 'Boston, MA' : 'New York, NY');
	};

	// ✅ Validate address is in Boston or NYC
	const validateAddress = (address: string): { valid: boolean; city?: 'boston' | 'new-york'; error?: string } => {
		const lowerAddr = address.toLowerCase().trim();

		// Check for Boston patterns
		const bostonPatterns = [
			'boston, ma', 'boston ma', 'boston,ma',
			'boston, massachusetts', 'boston massachusetts',
			'boston, usa', 'cambridge, ma', 'cambridge ma'
		];

		// Check for NYC patterns
		const nycPatterns = [
			'new york, ny', 'new york ny', 'new york,ny',
			'new york, new york', 'nyc', 'ny, ny',
			'new york, usa', 'brooklyn, ny', 'brooklyn ny',
			'manhattan, ny', 'manhattan ny', 'queens, ny'
		];

		const hasBoston = bostonPatterns.some(pattern => lowerAddr.includes(pattern));
		const hasNYC = nycPatterns.some(pattern => lowerAddr.includes(pattern));

		if (hasBoston) {
			return { valid: true, city: 'boston' };
		} else if (hasNYC) {
			return { valid: true, city: 'new-york' };
		} else {
			return {
				valid: false,
				error: 'Address must be in Boston, MA or New York, NY area'
			};
		}
	};

	// ✅ Manual address handler with validation
	const handleManualAddressSet = () => {
		if (!customAddress.trim()) return;

		// Validate address
		const validation = validateAddress(customAddress);

		if (!validation.valid) {
			// Show error message
			setChatMessages(prev => [...prev, {
				id: Date.now().toString(),
				type: 'assistant',
				content: `❌ ${validation.error}

Please enter an address in:
• Boston, MA (e.g., "123 Beacon St, Boston, MA")
• New York, NY (e.g., "456 5th Ave, New York, NY")`,
				timestamp: new Date()
			}]);
			return;
		}

		// Set location and update city
		setLocation(customAddress);
		setDetectedCity(validation.city!);
		setIsManualAddress(true);
		setShowLocationEdit(false);

		const cityName = validation.city === 'boston' ? 'Boston' : 'New York';
		setChatMessages(prev => [...prev, {
			id: Date.now().toString(),
			type: 'assistant',
			content: `✅ Using your custom address in ${cityName}: "${customAddress}" for routing between venues.`,
			timestamp: new Date()
		}]);
	};

	// ✅ Reset to auto mode
	const handleResetToAuto = () => {
		setIsManualAddress(false);
		setCustomAddress('');
		setLocation(detectedCity === 'boston' ? 'Boston, MA' : 'New York, NY');

		setChatMessages(prev => [...prev, {
			id: Date.now().toString(),
			type: 'assistant',
			content: `🤖 Switched back to smart city detection. I'll automatically detect the city from your queries.`,
			timestamp: new Date()
		}]);
	};

	useEffect(() => {
		localStorage.setItem('miniquest_layout_mode', layoutMode);
	}, [layoutMode]);

	const toggleLayout = () => {
		setLayoutMode(prev => prev === 'chat-left' ? 'chat-right' : 'chat-left');
	};

	useEffect(() => {
		loadConversations(20);
	}, [loadConversations]);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages, loading]);

	useEffect(() => {
		if (chatMessages.length > 1 && isGenerating) {
			const saveChat = async () => {
				await autoSaveConversation(chatMessages, location, queryId || undefined);
			};
			const timer = setTimeout(saveChat, 2000);
			return () => clearTimeout(timer);
		}
	}, [chatMessages, location, queryId, autoSaveConversation, isGenerating]);

	useEffect(() => {
		if (unrelatedQuery === true && !loading && isGenerating) {
			const genId = `unrelated_${Date.now()}`;
			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant',
					content: clarificationMessage || "I'm MiniQuest, your local adventure planning assistant!",
					timestamp: new Date()
				}]);
				setActiveSuggestions(suggestions || []);
				setIsGenerating(false);
			}
		}
	}, [unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (outOfScope === true && !unrelatedQuery && !loading && isGenerating) {
			const genId = `outofscope_${Date.now()}`;
			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant',
					content: `🚫 ${clarificationMessage || 'This request is outside MiniQuest\'s scope.'}`,
					timestamp: new Date()
				}]);
				setActiveSuggestions(suggestions || []);
				setIsGenerating(false);
			}
		}
	}, [outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (clarificationNeeded === true && !outOfScope && !unrelatedQuery && !loading && isGenerating) {
			const genId = Date.now().toString();
			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant',
					content: clarificationMessage,
					timestamp: new Date()
				}]);
				setActiveSuggestions(suggestions || []);
				setIsGenerating(false);
			}
		}
	}, [clarificationNeeded, outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	useEffect(() => {
		if (adventures.length > 0 && !loading && isGenerating) {
			const genId = `success_${adventures.length}_${Date.now()}`;
			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant' as const,
					content: `✅ Created ${adventures.length} adventures with ${researchStats.totalInsights} live insights (${Math.round(researchStats.avgConfidence * 100)}% confidence)`,
					timestamp: new Date()
				}]);
				setIsGenerating(false);
			}
		}
	}, [adventures, loading, researchStats, isGenerating]);

	const handleLoadConversation = async (conversationId: string) => {
		setIsGenerating(false);
		setActiveSuggestions([]);
		setLastGenerationId(null);
		clearAdventures();

		const conv = await loadConversation(conversationId);
		if (conv && conv.messages) {
			const loadedMessages = conv.messages.map((msg, idx) => ({
				id: `loaded_${conversationId}_${idx}`,
				type: msg.type as 'user' | 'assistant',
				content: msg.content,
				timestamp: new Date(msg.timestamp)
			}));

			setChatMessages(loadedMessages);
			setLocation(conv.location);
			setQueryId(conv.query_id || null);
		}
	};

	const handleNewChat = () => {
		setIsGenerating(false);
		setActiveSuggestions([]);
		setLastGenerationId(null);
		clearAdventures();

		setChatMessages([{
			id: `welcome_${Date.now()}`,
			type: 'assistant',
			content: `Hi ${user?.username}! 👋

I help you discover amazing places in Boston and New York City!

🤖 Smart Mode: Just mention the city in your query
• "Coffee shops in Boston"
• "Museums in Manhattan"
• I'll automatically detect and search the right city!

📍 Manual Mode: Need a specific address for routing?
• Click the location badge below to set a custom address
• Perfect for starting from your hotel, home, or office

Let's explore! 🗺️✨`,
			timestamp: new Date()
		}]);

		setCurrentConversationId(null);
		setQueryId(null);
	};

	const handleDeleteConversation = async (conversationId: string) => {
		await deleteConversation(conversationId);
		if (conversationId === currentConversationId) {
			handleNewChat();
		}
	};

	// ✅ handleSend with hybrid logic
	const handleSend = () => {
		if (!input.trim() || loading) return;

		if (!isManualAddress) {
			const city = detectCityFromQuery(input);
			updateLocationForCity(city);
		}

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			type: 'user',
			content: input,
			timestamp: new Date()
		};

		setChatMessages(prev => [...prev, userMessage]);
		setActiveSuggestions([]);
		setIsGenerating(true);

		generateAdventuresWithStreaming(input, location);
		setInput('');
	};

	// ✅ handleSuggestionClick with hybrid logic
	const handleSuggestionClick = (suggestion: string) => {
		if (!isManualAddress) {
			const city = detectCityFromQuery(suggestion);
			updateLocationForCity(city);
		}

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			type: 'user',
			content: suggestion,
			timestamp: new Date()
		};

		setChatMessages(prev => [...prev, userMessage]);
		setActiveSuggestions([]);
		setIsGenerating(true);

		generateAdventuresWithStreaming(suggestion, location);
	};

	const handleAdventureSaved = (adventureId: string, adventureName: string) => {
		console.log('Adventure saved:', adventureId);

		setSavedAdventureName(adventureName);
		setShowSaveNotification(true);

		setChatMessages(prev => [...prev, {
			id: Date.now().toString(),
			type: 'assistant',
			content: `💾 Saved "${adventureName}" to your collection!`,
			timestamp: new Date()
		}]);

		setTimeout(() => {
			setShowSaveNotification(false);
		}, 5000);
	};

	// ✅ Updated welcome message
	useEffect(() => {
		if (chatMessages.length === 0) {
			setChatMessages([{
				id: `initial_${Date.now()}`,
				type: 'assistant',
				content: `Hi ${user?.username}! 👋

I help you discover amazing places in Boston and New York City!

🤖 Smart Mode: Just mention the city in your query
• "Coffee shops in Boston"
• "Museums in Manhattan"
• I'll automatically detect and search the right city!

📍 Manual Mode: Need a specific address for routing?
• Click the location badge below to set a custom address
• Perfect for starting from your hotel, home, or office

Let's explore! 🗺️✨`,
				timestamp: new Date()
			}]);
		}
	}, []);

	return (
		<div style={{
			display: 'grid',
			gridTemplateColumns: layoutMode === 'chat-left' ? '350px 1fr' : '1fr 350px',
			height: 'calc(100vh - 70px)',
			background: '#f8fafc',
			position: 'relative',
			overflow: 'hidden',
		}}>
			{showSaveNotification && (
				<div style={{
					position: 'fixed',
					top: '80px',
					right: '20px',
					background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
					color: 'white',
					padding: '16px 24px',
					borderRadius: '12px',
					boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
					zIndex: 2000,
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					maxWidth: '400px',
					animation: 'slideIn 0.3s ease-out',
				}}>
					<div style={{ fontSize: '1.5rem' }}>✅</div>
					<div>
						<div style={{ fontWeight: '600', marginBottom: '4px' }}>
							Adventure Saved!
						</div>
						<div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
							"{savedAdventureName}" saved to your collection
						</div>
					</div>
					<button
						onClick={() => setShowSaveNotification(false)}
						style={{
							background: 'rgba(255, 255, 255, 0.2)',
							border: 'none',
							color: 'white',
							padding: '6px 10px',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '0.9rem',
							marginLeft: 'auto',
						}}
					>
						✕
					</button>
				</div>
			)}

			{layoutMode === 'chat-left' ? (
				<>
					<ChatPanel
						layoutMode={layoutMode}
						conversations={conversations}
						currentConversationId={currentConversationId}
						chatMessages={chatMessages}
						loading={loading}
						activeSuggestions={activeSuggestions}
						input={input}
						location={location}
						showLocationEdit={showLocationEdit}
						customAddress={customAddress}
						isManualAddress={isManualAddress}
						locationInputRef={locationInputRef}
						chatEndRef={chatEndRef}
						user={user}
						setInput={setInput}
						setShowLocationEdit={setShowLocationEdit}
						setCustomAddress={setCustomAddress}
						handleSend={handleSend}
						handleSuggestionClick={handleSuggestionClick}
						handleLoadConversation={handleLoadConversation}
						handleNewChat={handleNewChat}
						handleDeleteConversation={handleDeleteConversation}
						handleManualAddressSet={handleManualAddressSet}
						handleResetToAuto={handleResetToAuto}
					/>
					<AdventuresPanel
						user={user}
						layoutMode={layoutMode}
						adventures={adventures}
						loading={loading}
						researchStats={researchStats}
						outOfScope={outOfScope}
						scopeIssue={scopeIssue}
						clarificationNeeded={clarificationNeeded}
						unrelatedQuery={unrelatedQuery}
						clarificationMessage={clarificationMessage}
						suggestions={suggestions}
						recommendedServices={recommendedServices}
						metadata={metadata}
						progressUpdates={progressUpdates}
						currentProgress={currentProgress}
						toggleLayout={toggleLayout}
						handleAdventureSaved={handleAdventureSaved}
						handleSuggestionClick={handleSuggestionClick}
					/>
				</>
			) : (
				<>
					<AdventuresPanel
						user={user}
						layoutMode={layoutMode}
						adventures={adventures}
						loading={loading}
						researchStats={researchStats}
						outOfScope={outOfScope}
						scopeIssue={scopeIssue}
						clarificationNeeded={clarificationNeeded}
						unrelatedQuery={unrelatedQuery}
						clarificationMessage={clarificationMessage}
						suggestions={suggestions}
						recommendedServices={recommendedServices}
						metadata={metadata}
						progressUpdates={progressUpdates}
						currentProgress={currentProgress}
						toggleLayout={toggleLayout}
						handleAdventureSaved={handleAdventureSaved}
						handleSuggestionClick={handleSuggestionClick}
					/>
					<ChatPanel
						layoutMode={layoutMode}
						conversations={conversations}
						currentConversationId={currentConversationId}
						chatMessages={chatMessages}
						loading={loading}
						activeSuggestions={activeSuggestions}
						input={input}
						location={location}
						showLocationEdit={showLocationEdit}
						customAddress={customAddress}
						isManualAddress={isManualAddress}
						locationInputRef={locationInputRef}
						chatEndRef={chatEndRef}
						user={user}
						setInput={setInput}
						setShowLocationEdit={setShowLocationEdit}
						setCustomAddress={setCustomAddress}
						handleSend={handleSend}
						handleSuggestionClick={handleSuggestionClick}
						handleLoadConversation={handleLoadConversation}
						handleNewChat={handleNewChat}
						handleDeleteConversation={handleDeleteConversation}
						handleManualAddressSet={handleManualAddressSet}
						handleResetToAuto={handleResetToAuto}
					/>
				</>
			)}

			<style>{`
				@keyframes slideIn {
					from {
						transform: translateX(400px);
						opacity: 0;
					}
					to {
						transform: translateX(0);
						opacity: 1;
					}
				}
				
				.spinner {
					width: 12px;
					height: 12px;
					border: 2px solid rgba(3, 105, 161, 0.3);
					border-top-color: #0369a1;
					border-radius: 50%;
					animation: spin 0.8s linear infinite;
				}
				
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
};

export default AdventuresPage;