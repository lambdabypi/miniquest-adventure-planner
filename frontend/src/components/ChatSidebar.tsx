// frontend/src/components/ChatSidebar.tsx
import React, { useState } from 'react';
import { Conversation } from '../api/chat';
import { useTheme, t } from '../contexts/ThemeContext';

interface ChatSidebarProps {
	conversations: Conversation[];
	currentConversationId: string | null;
	loading: boolean;
	onLoadConversation: (conversationId: string) => void;
	onNewChat: () => void;
	onDeleteConversation: (conversationId: string) => void;
	layoutMode: 'chat-left' | 'chat-right';
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
	conversations, currentConversationId, loading,
	onLoadConversation, onNewChat, onDeleteConversation, layoutMode,
}) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [showSidebar, setShowSidebar] = useState(false);
	const isOnLeft = layoutMode === 'chat-left';

	const handleNewChat = () => { setShowSidebar(false); onNewChat(); };
	const handleLoadConversation = (id: string) => { setShowSidebar(false); onLoadConversation(id); };

	return (
		<>
			{/* Sidebar panel */}
			<div style={{
				position: 'fixed',
				top: '70px',
				left: isOnLeft ? (showSidebar ? 0 : '-300px') : 'auto',
				right: isOnLeft ? 'auto' : (showSidebar ? 0 : '-300px'),
				width: '280px',
				height: 'calc(100vh - 70px)',
				background: tk.sidebarBg,
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)',
				borderRight: isOnLeft ? `1px solid ${tk.sidebarBorder}` : 'none',
				borderLeft: isOnLeft ? 'none' : `1px solid ${tk.sidebarBorder}`,
				boxShadow: showSidebar
					? (isOnLeft ? '4px 0 24px rgba(0,0,0,0.35)' : '-4px 0 24px rgba(0,0,0,0.35)')
					: 'none',
				zIndex: 999,
				transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
				display: 'flex',
				flexDirection: 'column',
			}}>
				{/* Header */}
				<div style={{
					padding: '20px',
					borderBottom: `1px solid ${tk.sidebarBorder}`,
					background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
					flexShrink: 0,
				}}>
					<h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', color: 'white', fontWeight: 700 }}>
						💬 Chat History
					</h3>
					<button
						onClick={handleNewChat}
						style={{
							width: '100%', padding: '8px 12px',
							background: 'rgba(255,255,255,0.15)',
							border: '1px solid rgba(255,255,255,0.3)',
							borderRadius: '8px', color: 'white',
							fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
						onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none'; }}
					>
						+ New Chat
					</button>
				</div>

				{/* List */}
				<div style={{ flex: 1, padding: '10px', overflowY: 'auto', minHeight: 0 }}>
					{loading ? (
						<div style={{ textAlign: 'center', padding: '20px', color: tk.textMuted }}>
							<div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Loading...</div>
						</div>
					) : conversations.length === 0 ? (
						<div style={{ textAlign: 'center', padding: '30px 20px', color: tk.textMuted, fontSize: '0.85rem' }}>
							<div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
							No previous chats
						</div>
					) : (
						conversations.map((conv, i) => (
							<ConversationItem
								key={conv._id}
								conversation={conv}
								isActive={conv._id === currentConversationId}
								onLoad={handleLoadConversation}
								onDelete={onDeleteConversation}
								index={i}
								isDark={isDark}
							/>
						))
					)}
				</div>

				{/* Hide button */}
				<button
					onClick={() => setShowSidebar(false)}
					style={{
						padding: '12px', background: 'transparent', border: 'none',
						borderTop: `1px solid ${tk.sidebarBorder}`,
						color: tk.textMuted, fontSize: '0.85rem', fontWeight: 600,
						cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
					}}
					onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = tk.textPrimary; }}
					onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tk.textMuted; }}
				>
					{isOnLeft ? '← Hide History' : 'Hide History →'}
				</button>
			</div>

			{/* Toggle button */}
			{!showSidebar && (
				<button
					onClick={() => setShowSidebar(true)}
					style={{
						position: 'fixed',
						bottom: '20px',
						left: isOnLeft ? '370px' : 'auto',
						right: isOnLeft ? 'auto' : '370px',
						zIndex: 1000,
						background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
						color: 'white', border: 'none', borderRadius: '12px',
						padding: '11px 20px', cursor: 'pointer',
						fontSize: '0.88rem', fontWeight: 600,
						boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
						transition: 'all 0.25s',
						display: 'flex', alignItems: 'center', gap: 8,
						animation: 'float 3s ease-in-out infinite',
					}}
					onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.6)'; }}
					onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.45)'; }}
				>
					<span>💬</span>
					<span>History</span>
				</button>
			)}

			{/* Overlay */}
			{showSidebar && (
				<div
					onClick={() => setShowSidebar(false)}
					style={{
						position: 'fixed', top: '70px', left: 0, right: 0, bottom: 0,
						background: 'rgba(0,0,0,0.5)',
						zIndex: 998,
						animation: 'fadeIn 0.2s ease',
					}}
				/>
			)}

			<style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes slideInItem {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
      `}</style>
		</>
	);
};

const ConversationItem: React.FC<{
	conversation: Conversation;
	isActive: boolean;
	onLoad: (id: string) => void;
	onDelete: (id: string) => void;
	index: number;
	isDark: boolean;
}> = ({ conversation, isActive, onLoad, onDelete, index, isDark }) => {
	const tk = t(isDark);
	const [showDelete, setShowDelete] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [hovered, setHovered] = useState(false);

	return (
		<>
			<div
				onMouseEnter={() => { setShowDelete(true); setHovered(true); }}
				onMouseLeave={() => { setShowDelete(false); setHovered(false); }}
				onClick={() => onLoad(conversation._id)}
				style={{
					padding: '11px 12px', marginBottom: '6px',
					background: tk.convItemBg(isActive),
					border: `1px solid ${tk.convItemBorder(isActive)}`,
					borderRadius: '10px', cursor: 'pointer',
					transition: 'all 0.2s',
					position: 'relative',
					transform: hovered && !isActive ? 'translateX(3px)' : 'none',
					animation: `slideInItem 0.25s ease both`,
					animationDelay: `${index * 40}ms`,
				}}
			>
				<div style={{
					fontSize: '0.85rem', color: tk.textPrimary, fontWeight: 500,
					marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
				}}>
					{conversation.preview || 'Empty conversation'}
				</div>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ fontSize: '0.7rem', color: tk.textSecondary }}>📍 {conversation.location}</div>
					<div style={{ fontSize: '0.7rem', color: tk.textMuted }}>{conversation.message_count} msgs</div>
				</div>
				<div style={{ fontSize: '0.65rem', color: tk.textMuted, marginTop: '3px' }}>
					{new Date(conversation.updated_at).toLocaleDateString()}
				</div>
				{showDelete && (
					<button
						onClick={e => { e.stopPropagation(); setShowDeleteModal(true); }}
						style={{
							position: 'absolute', top: '8px', right: '8px',
							background: '#ef4444', color: 'white', border: 'none',
							borderRadius: '6px', padding: '3px 8px', fontSize: '0.7rem',
							cursor: 'pointer', transition: 'all 0.15s',
							animation: 'fadeIn 0.15s ease',
						}}
					>🗑️</button>
				)}
			</div>

			{showDeleteModal && (
				<div
					onClick={e => { e.stopPropagation(); setShowDeleteModal(false); }}
					style={{
						position: 'fixed', inset: 0,
						background: 'rgba(0,0,0,0.6)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						zIndex: 9999, animation: 'fadeIn 0.2s ease',
					}}
				>
					<div
						onClick={e => e.stopPropagation()}
						style={{
							background: isDark ? 'rgba(30,20,60,0.98)' : 'white',
							backdropFilter: 'blur(20px)',
							border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
							borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '90%',
							boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
							animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
							color: tk.textPrimary,
						}}
					>
						<h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>🗑️ Delete Conversation?</h3>
						<p style={{ color: tk.textSecondary, marginBottom: '18px', lineHeight: 1.5, fontSize: '0.9rem' }}>
							This action cannot be undone.
						</p>
						<div style={{
							padding: '12px', borderRadius: '8px', marginBottom: '20px',
							background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
						}}>
							<div style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 500 }}>
								"{conversation.preview || 'Empty conversation'}"
							</div>
							<div style={{ fontSize: '0.75rem', color: tk.textMuted, marginTop: '4px' }}>
								{conversation.message_count} messages · {new Date(conversation.updated_at).toLocaleDateString()}
							</div>
						</div>
						<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
							<button
								onClick={() => setShowDeleteModal(false)}
								style={{
									background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
									color: tk.textSecondary, border: 'none',
									padding: '10px 20px', borderRadius: '8px',
									fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
								}}
							>Cancel</button>
							<button
								onClick={() => { onDelete(conversation._id); setShowDeleteModal(false); }}
								style={{
									background: '#ef4444', color: 'white', border: 'none',
									padding: '10px 20px', borderRadius: '8px',
									fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
								}}
							>Delete</button>
						</div>
					</div>
				</div>
			)}
			<style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
		</>
	);
};

export default ChatSidebar;