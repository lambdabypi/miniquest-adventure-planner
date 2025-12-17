// frontend/src/components/ChatSidebar.tsx - FIXED: Auto-close + Push content
import React, { useState } from 'react';
import { Conversation } from '../api/chat';

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
	conversations,
	currentConversationId,
	loading,
	onLoadConversation,
	onNewChat,
	onDeleteConversation,
	layoutMode,
}) => {
	const [showSidebar, setShowSidebar] = useState(false);

	const isOnLeft = layoutMode === 'chat-left';

	// ✅ NEW: Wrapper for onNewChat that closes sidebar
	const handleNewChat = () => {
		setShowSidebar(false);  // Close sidebar first
		onNewChat();  // Then trigger new chat
	};

	// ✅ NEW: Wrapper for onLoadConversation that closes sidebar
	const handleLoadConversation = (conversationId: string) => {
		setShowSidebar(false);  // Close sidebar first
		onLoadConversation(conversationId);  // Then load conversation
	};

	return (
		<>
			{/* Sidebar */}
			<div
				style={{
					position: 'fixed',
					top: '70px',
					left: isOnLeft ? (showSidebar ? 0 : '-300px') : 'auto',
					right: isOnLeft ? 'auto' : (showSidebar ? 0 : '-300px'),
					width: '280px',
					height: 'calc(100vh - 70px)',
					background: 'white',
					borderRight: isOnLeft ? '1px solid #e2e8f0' : 'none',
					borderLeft: isOnLeft ? 'none' : '1px solid #e2e8f0',
					boxShadow: showSidebar
						? (isOnLeft ? '4px 0 12px rgba(0, 0, 0, 0.1)' : '-4px 0 12px rgba(0, 0, 0, 0.1)')
						: 'none',
					zIndex: 999,
					transition: 'all 0.3s ease',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: '20px',
						borderBottom: '1px solid #e2e8f0',
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						color: 'white',
						flexShrink: 0,
					}}
				>
					<h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
						💬 Chat History
					</h3>
					<button
						onClick={handleNewChat}
						style={{
							width: '100%',
							padding: '8px 12px',
							background: 'rgba(255, 255, 255, 0.2)',
							border: '1px solid rgba(255, 255, 255, 0.4)',
							borderRadius: '6px',
							color: 'white',
							fontSize: '0.85rem',
							fontWeight: '600',
							cursor: 'pointer',
							transition: 'background 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
						}}
					>
						+ New Chat
					</button>
				</div>

				{/* Conversations List */}
				<div style={{
					flex: 1,
					padding: '10px',
					overflowY: 'auto',
					minHeight: 0,
				}}>
					{loading ? (
						<div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
							Loading...
						</div>
					) : conversations.length === 0 ? (
						<div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
							No previous chats
						</div>
					) : (
						conversations.map((conv) => (
							<ConversationItem
								key={conv._id}
								conversation={conv}
								isActive={conv._id === currentConversationId}
								onLoad={handleLoadConversation}
								onDelete={onDeleteConversation}
							/>
						))
					)}
				</div>

				{/* Hide Button */}
				<button
					onClick={() => setShowSidebar(false)}
					style={{
						padding: '12px',
						background: '#f8fafc',
						border: 'none',
						borderTop: '1px solid #e2e8f0',
						color: '#64748b',
						fontSize: '0.85rem',
						fontWeight: '600',
						cursor: 'pointer',
						transition: 'all 0.2s',
						flexShrink: 0,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#f1f5f9';
						e.currentTarget.style.color = '#1e293b';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#f8fafc';
						e.currentTarget.style.color = '#64748b';
					}}
				>
					{isOnLeft ? '← Hide History' : 'Hide History →'}
				</button>
			</div>

			{/* Toggle Button */}
			{!showSidebar && (
				<button
					onClick={() => setShowSidebar(true)}
					style={{
						position: 'fixed',
						bottom: '20px',
						left: isOnLeft ? '370px' : 'auto',
						right: isOnLeft ? 'auto' : '370px',
						zIndex: 1000,
						background: '#667eea',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						padding: '12px 20px',
						cursor: 'pointer',
						fontSize: '0.9rem',
						fontWeight: '600',
						boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
						transition: 'all 0.3s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'translateY(-2px)';
						e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
					}}
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
						position: 'fixed',
						top: '70px',
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.3)',
						zIndex: 998,
					}}
				/>
			)}
		</>
	);
};

// Individual Conversation Item
const ConversationItem: React.FC<{
	conversation: Conversation;
	isActive: boolean;
	onLoad: (id: string) => void;
	onDelete: (id: string) => void;
}> = ({ conversation, isActive, onLoad, onDelete }) => {
	const [showDelete, setShowDelete] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete(conversation._id);
		setShowDeleteModal(false);
	};

	const handleCancelDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDeleteModal(false);
	};

	return (
		<>
			<div
				onMouseEnter={() => setShowDelete(true)}
				onMouseLeave={() => setShowDelete(false)}
				style={{
					padding: '12px',
					marginBottom: '8px',
					background: isActive ? '#f0f9ff' : '#f8fafc',
					border: `2px solid ${isActive ? '#667eea' : '#e2e8f0'}`,
					borderRadius: '8px',
					cursor: 'pointer',
					transition: 'all 0.2s',
					position: 'relative',
				}}
				onClick={() => onLoad(conversation._id)}
			>
				{/* Preview */}
				<div
					style={{
						fontSize: '0.85rem',
						color: '#1e293b',
						fontWeight: '500',
						marginBottom: '6px',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{conversation.preview || 'Empty conversation'}
				</div>

				{/* Metadata */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ fontSize: '0.7rem', color: '#64748b' }}>
						📍 {conversation.location}
					</div>
					<div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
						{conversation.message_count} msgs
					</div>
				</div>

				{/* Date */}
				<div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
					{new Date(conversation.updated_at).toLocaleDateString()}
				</div>

				{/* Delete Button */}
				{showDelete && (
					<button
						onClick={handleDeleteClick}
						style={{
							position: 'absolute',
							top: '8px',
							right: '8px',
							background: '#ef4444',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							padding: '4px 8px',
							fontSize: '0.7rem',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#dc2626';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = '#ef4444';
						}}
					>
						🗑️
					</button>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div
					onClick={handleCancelDelete}
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 9999,
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{
							background: 'white',
							borderRadius: '12px',
							padding: '25px',
							maxWidth: '400px',
							width: '90%',
							boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
						}}
					>
						<h3 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '1.3rem' }}>
							🗑️ Delete Conversation?
						</h3>
						<p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
							Are you sure you want to delete this conversation? This action cannot be undone.
						</p>
						<div
							style={{
								padding: '12px',
								background: '#fef2f2',
								border: '1px solid #fecaca',
								borderRadius: '8px',
								marginBottom: '20px',
							}}
						>
							<div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '500' }}>
								"{conversation.preview || 'Empty conversation'}"
							</div>
							<div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '4px' }}>
								{conversation.message_count} messages • {new Date(conversation.updated_at).toLocaleDateString()}
							</div>
						</div>
						<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
							<button
								onClick={handleCancelDelete}
								style={{
									background: '#e2e8f0',
									color: '#475569',
									border: 'none',
									padding: '10px 20px',
									borderRadius: '8px',
									fontSize: '0.9rem',
									fontWeight: '600',
									cursor: 'pointer',
									transition: 'all 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = '#cbd5e1';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = '#e2e8f0';
								}}
							>
								Cancel
							</button>
							<button
								onClick={handleConfirmDelete}
								style={{
									background: '#ef4444',
									color: 'white',
									border: 'none',
									padding: '10px 20px',
									borderRadius: '8px',
									fontSize: '0.9rem',
									fontWeight: '600',
									cursor: 'pointer',
									transition: 'all 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = '#dc2626';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = '#ef4444';
								}}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default ChatSidebar;