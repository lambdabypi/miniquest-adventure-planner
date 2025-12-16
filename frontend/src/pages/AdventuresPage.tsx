// frontend/src/pages/AdventuresPage.tsx - COMPLETE WITH ALL STATES
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdventures } from '../hooks/useAdventures';
import { useChatHistory } from '../hooks/useChatHistory';
import EnhancedAdventureCard from '../components/EnhancedAdventureCard';
import ChatSidebar from '../components/ChatSidebar';
import OutOfScopeMessage from '../components/OutOfScopeMessage';

interface ChatMessage {
	id: string;
	type: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

type LayoutMode = 'chat-left' | 'chat-right';

// ========================================
// CHAT PANEL COMPONENT
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
	locationInputRef: React.RefObject<HTMLInputElement>;
	chatEndRef: React.RefObject<HTMLDivElement>;
	user: any;
	setInput: (value: string) => void;
	setLocation: (value: string) => void;
	setShowLocationEdit: (value: boolean) => void;
	handleSend: () => void;
	handleSuggestionClick: (suggestion: string) => void;
	handleLoadConversation: (id: string) => void;
	handleNewChat: () => void;
	handleDeleteConversation: (id: string) => void;
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
	locationInputRef,
	chatEndRef,
	user,
	setInput,
	setLocation,
	setShowLocationEdit,
	handleSend,
	handleSuggestionClick,
	handleLoadConversation,
	handleNewChat,
	handleDeleteConversation,
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
				7 AI Agents • Live Research
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
						7 agents working
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

		<div style={{
			padding: '15px',
			borderTop: '1px solid #e2e8f0',
			background: '#ffffff',
			flexShrink: 0,
		}}>
			<div style={{ marginBottom: '10px', fontSize: '0.8rem' }}>
				{!showLocationEdit ? (
					<div style={{ color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
						<span>📍 {location}</span>
						<button
							onClick={() => setShowLocationEdit(true)}
							style={{
								background: 'none',
								border: 'none',
								color: '#2563eb',
								cursor: 'pointer',
								fontSize: '0.75rem',
								textDecoration: 'underline',
								padding: 0,
							}}
						>
							change
						</button>
					</div>
				) : (
					<div style={{ display: 'flex', gap: '4px' }}>
						<input
							ref={locationInputRef}
							type="text"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							autoFocus
							style={{
								flex: 1,
								padding: '6px 10px',
								border: '1px solid #e2e8f0',
								borderRadius: '6px',
								fontSize: '0.8rem',
							}}
						/>
						<button
							onClick={() => setShowLocationEdit(false)}
							style={{
								padding: '6px 10px',
								background: '#16a34a',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								fontSize: '0.75rem',
								cursor: 'pointer',
							}}
						>
							✓
						</button>
					</div>
				)}
			</div>

			<div style={{ display: 'flex', gap: '8px' }}>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && handleSend()}
					placeholder="What to explore?"
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
// ADVENTURES PANEL COMPONENT
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
	unrelatedQuery: boolean;  // ✅ NEW
	clarificationMessage: string;
	suggestions: string[];
	recommendedServices: any[];
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

		{/* ✅ PRIORITY 1: Unrelated Query */}
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

		{/* ✅ PRIORITY 2: Out-of-Scope Message */}
		{outOfScope === true && !unrelatedQuery && !loading && (
			<OutOfScopeMessage
				scopeIssue={scopeIssue || 'multi_day_trip'}
				message={clarificationMessage || 'This request is outside MiniQuest\'s scope'}
				suggestions={suggestions || []}
				recommendedServices={recommendedServices || []}
				onSuggestionClick={handleSuggestionClick}
			/>
		)}

		{/* ✅ PRIORITY 3: Clarification Needed (Too Vague) */}
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

		{/* ✅ PRIORITY 4: Adventures Display */}
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

		{/* ✅ PRIORITY 5: Empty State */}
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
// MAIN ADVENTURES PAGE COMPONENT
// ========================================
const AdventuresPage: React.FC = () => {
	const { user } = useAuth();
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [location, setLocation] = useState('Boston, MA');
	const [showLocationEdit, setShowLocationEdit] = useState(false);
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
		unrelatedQuery,  // ✅ NEW
		researchStats,
		generateAdventures
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
		if (!currentConversationId && chatMessages.length === 0) {
			setChatMessages([{
				id: '0',
				type: 'assistant',
				content: `Hi ${user?.username}! Tell me what you'd like to explore and I'll create personalized adventures with live research from 7 AI agents.`,
				timestamp: new Date()
			}]);
		}
	}, [user, currentConversationId]);

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

	// ✅ NEW: Handle unrelated queries
	useEffect(() => {
		if (unrelatedQuery === true && !loading && isGenerating) {
			const genId = `unrelated_${Date.now()}`;

			console.log('🤷 Unrelated query detected in effect');

			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);

				// Add chat message for unrelated query
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant',
					content: clarificationMessage || "I'm MiniQuest, your local adventure planning assistant! Ask me about museums, restaurants, parks, or other fun places to explore.",
					timestamp: new Date()
				}]);

				setActiveSuggestions(suggestions || []);
				setIsGenerating(false);
			}
		}
	}, [unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	// ✅ Handle out-of-scope
	useEffect(() => {
		if (outOfScope === true && !unrelatedQuery && !loading && isGenerating) {
			const genId = `outofscope_${Date.now()}`;

			console.log('🚫 Out-of-scope detected in effect');

			if (lastGenerationId !== genId) {
				setLastGenerationId(genId);

				// Add chat message for out-of-scope
				setChatMessages(prev => [...prev, {
					id: genId,
					type: 'assistant',
					content: `🚫 ${clarificationMessage || 'This request is outside MiniQuest\'s scope. Check the right panel for recommendations.'}`,
					timestamp: new Date()
				}]);

				setActiveSuggestions(suggestions || []);
				setIsGenerating(false);
			}
		}
	}, [outOfScope, unrelatedQuery, loading, clarificationMessage, suggestions, isGenerating]);

	// ✅ Handle clarification needed (too vague)
	useEffect(() => {
		if (clarificationNeeded === true && !outOfScope && !unrelatedQuery && !loading && isGenerating) {
			const genId = Date.now().toString();

			console.log('🤔 Clarification needed in effect');

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

	// ✅ Handle successful adventures
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

		const conv = await loadConversation(conversationId);
		if (conv && conv.messages) {
			const loadedMessages = conv.messages.map(msg => ({
				id: msg.id,
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
		setChatMessages([{
			id: '0',
			type: 'assistant',
			content: `Hi ${user?.username}! Tell me what you'd like to explore and I'll create personalized adventures with live research from 7 AI agents.`,
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

	const handleSend = () => {
		if (!input.trim() || loading) return;

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			type: 'user',
			content: input,
			timestamp: new Date()
		};

		setChatMessages(prev => [...prev, userMessage]);
		setActiveSuggestions([]);
		setIsGenerating(true);
		generateAdventures(input, location);
		setInput('');
	};

	const handleSuggestionClick = (suggestion: string) => {
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			type: 'user',
			content: suggestion,
			timestamp: new Date()
		};

		setChatMessages(prev => [...prev, userMessage]);
		setActiveSuggestions([]);
		setIsGenerating(true);
		generateAdventures(suggestion, location);
	};

	const handleAdventureSaved = (adventureId: string, adventureName: string) => {
		console.log('Adventure saved:', adventureId);

		setSavedAdventureName(adventureName);
		setShowSaveNotification(true);

		setChatMessages(prev => [...prev, {
			id: Date.now().toString(),
			type: 'assistant',
			content: `💾 Saved "${adventureName}" to your collection! View it in the Saved Adventures page.`,
			timestamp: new Date()
		}]);

		setTimeout(() => {
			setShowSaveNotification(false);
		}, 5000);
	};

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
						locationInputRef={locationInputRef}
						chatEndRef={chatEndRef}
						user={user}
						setInput={setInput}
						setLocation={setLocation}
						setShowLocationEdit={setShowLocationEdit}
						handleSend={handleSend}
						handleSuggestionClick={handleSuggestionClick}
						handleLoadConversation={handleLoadConversation}
						handleNewChat={handleNewChat}
						handleDeleteConversation={handleDeleteConversation}
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
						locationInputRef={locationInputRef}
						chatEndRef={chatEndRef}
						user={user}
						setInput={setInput}
						setLocation={setLocation}
						setShowLocationEdit={setShowLocationEdit}
						handleSend={handleSend}
						handleSuggestionClick={handleSuggestionClick}
						handleLoadConversation={handleLoadConversation}
						handleNewChat={handleNewChat}
						handleDeleteConversation={handleDeleteConversation}
					/>
				</>
			)}

			<div style={{
				position: 'fixed',
				bottom: '20px',
				left: '50%',
				transform: 'translateX(-50%)',
				background: 'rgba(102, 126, 234, 0.95)',
				color: 'white',
				padding: '8px 16px',
				borderRadius: '20px',
				fontSize: '0.75rem',
				fontWeight: '600',
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
				backdropFilter: 'blur(10px)',
				zIndex: 1000,
				pointerEvents: 'none',
				opacity: 0.8,
			}}>
				{layoutMode === 'chat-left' ? '💬 Chat Left | 🗺️ Adventures Right' : '🗺️ Adventures Left | 💬 Chat Right'}
			</div>

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