// frontend/src/pages/SocialPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, t } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface Comment { id: string; username: string; content: string; created_at: string; }
interface Post {
	id: string; username: string; content: string;
	adventure_title?: string; location?: string; tags: string[];
	like_count: number; liked_by_me: boolean;
	comment_count: number; comments: Comment[];
	created_at: string;
}

// ── Renders post content with clickable URLs and preserved newlines ──────────
const PostContent: React.FC<{ text: string; textColor: string }> = ({ text, textColor }) => {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const parts = text.split(urlRegex);
	return (
		<p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: textColor, lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
			{parts.map((part, i) =>
				urlRegex.test(part) ? (
					<a key={i} href={part} target="_blank" rel="noopener noreferrer"
						style={{ color: '#667eea', textDecoration: 'underline', wordBreak: 'break-all' }}>
						{part}
					</a>
				) : part
			)}
		</p>
	);
};

const SocialPage: React.FC = () => {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);

	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [newPost, setNewPost] = useState('');
	const [posting, setPosting] = useState(false);
	const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
	const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

	const load = useCallback(async () => {
		try {
			const res = await apiClient.get('/api/social?limit=30&offset=0');
			setPosts(res.data.posts);
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const handlePost = async () => {
		if (!newPost.trim()) return;
		setPosting(true);
		try {
			const res = await apiClient.post('/api/social', { content: newPost.trim() });
			setPosts(p => [res.data, ...p]);
			setNewPost('');
		} finally {
			setPosting(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Cmd/Ctrl+Enter to submit, Enter alone adds newline
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handlePost();
		}
	};

	const handleLike = async (postId: string) => {
		try {
			const res = await apiClient.post(`/api/social/${postId}/like`);
			setPosts(p => p.map(post =>
				post.id === postId
					? { ...post, liked_by_me: res.data.liked, like_count: res.data.like_count }
					: post
			));
		} catch (e) { console.error(e); }
	};

	const handleComment = async (postId: string) => {
		const content = commentInputs[postId]?.trim();
		if (!content) return;
		try {
			const res = await apiClient.post(`/api/social/${postId}/comments`, { content });
			setPosts(p => p.map(post =>
				post.id === postId
					? { ...post, comments: [...post.comments, res.data], comment_count: post.comment_count + 1 }
					: post
			));
			setCommentInputs(c => ({ ...c, [postId]: '' }));
		} catch (e) { console.error(e); }
	};

	const handleDelete = async (postId: string) => {
		try {
			await apiClient.delete(`/api/social/${postId}`);
			setPosts(p => p.filter(post => post.id !== postId));
		} catch (e) { console.error(e); } finally {
			setDeleteConfirm(null);
		}
	};

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const m = Math.floor(diff / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	};

	const avatar = (username: string) => (
		<div style={{
			width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
			background: 'linear-gradient(135deg,#667eea,#764ba2)',
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			color: 'white', fontWeight: 700, fontSize: '0.85rem',
		}}>
			{username?.[0]?.toUpperCase() || '?'}
		</div>
	);

	return (
		<div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
			<h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: tk.textPrimary, marginBottom: 4 }}>
				🌍 Community Feed
			</h1>
			<p style={{ fontSize: '0.85rem', color: tk.textMuted, marginBottom: 24 }}>
				Share your adventures. See what others are exploring.
			</p>

			{/* Compose box */}
			<div style={{
				background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
				border: `1px solid ${borderColor}`, borderRadius: 14,
				padding: 16, marginBottom: 24,
				boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
			}}>
				<textarea
					value={newPost}
					onChange={e => setNewPost(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Share a recent adventure, a hidden gem, or ask for recommendations..."
					rows={3}
					maxLength={500}
					style={{
						width: '100%', resize: 'vertical', border: 'none', outline: 'none',
						background: 'transparent', fontSize: '0.9rem', color: tk.textPrimary,
						fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box',
					}}
				/>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
					<span style={{ fontSize: '0.72rem', color: newPost.length > 450 ? '#ef4444' : tk.textMuted }}>
						{newPost.length}/500
						{newPost.length > 0 && (
							<span style={{ marginLeft: 8, opacity: 0.6 }}>⌘+Enter to post</span>
						)}
					</span>
					<div style={{ display: 'flex', gap: 8 }}>
						{newPost.length > 0 && (
							<button
								onClick={() => setNewPost('')}
								style={{
									padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
									background: 'transparent', color: tk.textMuted,
									fontSize: '0.82rem', cursor: 'pointer',
								}}
							>Clear</button>
						)}
						<button
							onClick={handlePost}
							disabled={!newPost.trim() || posting}
							style={{
								padding: '8px 18px', borderRadius: 8, border: 'none',
								background: newPost.trim() && !posting
									? 'linear-gradient(135deg,#667eea,#764ba2)'
									: (isDark ? '#374151' : '#cbd5e0'),
								color: 'white', fontSize: '0.85rem', fontWeight: 600,
								cursor: newPost.trim() && !posting ? 'pointer' : 'not-allowed',
								transition: 'opacity 0.15s',
							}}
						>{posting ? '⏳ Posting...' : '🚀 Post'}</button>
					</div>
				</div>
			</div>

			{/* Feed */}
			{loading ? (
				<div style={{ textAlign: 'center', padding: 40, color: tk.textMuted }}>Loading feed...</div>
			) : posts.length === 0 ? (
				<div style={{ textAlign: 'center', padding: 40 }}>
					<div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
					<div style={{ color: tk.textMuted }}>Be the first to post!</div>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					{posts.map(post => (
						<div key={post.id} style={{
							background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
							border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16,
							boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
						}}>
							{/* Header */}
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									{avatar(post.username)}
									<div>
										<div style={{ fontSize: '0.88rem', fontWeight: 600, color: tk.textPrimary }}>{post.username}</div>
										<div style={{ fontSize: '0.7rem', color: tk.textMuted }}>
											{timeAgo(post.created_at)}
											{post.location && <span> · 📍 {post.location}</span>}
										</div>
									</div>
								</div>
								{post.username === user?.username && (
									deleteConfirm === post.id ? (
										<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
											<span style={{ fontSize: '0.75rem', color: tk.textMuted }}>Delete?</span>
											<button onClick={() => handleDelete(post.id)} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Yes</button>
											<button onClick={() => setDeleteConfirm(null)} style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', border: 'none', color: tk.textSecondary, borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>No</button>
										</div>
									) : (
										<button
											onClick={() => setDeleteConfirm(post.id)}
											style={{ background: 'none', border: 'none', color: tk.textMuted, cursor: 'pointer', fontSize: '0.8rem', padding: '4px 6px', borderRadius: 6, transition: 'color 0.15s' }}
											title="Delete post"
										>🗑️</button>
									)
								)}
							</div>

							{/* Adventure badge */}
							{post.adventure_title && (
								<div style={{
									display: 'inline-block', padding: '3px 10px', borderRadius: 20,
									background: isDark ? 'rgba(102,126,234,0.15)' : '#eef2ff',
									color: isDark ? '#a5b4fc' : '#4338ca', fontSize: '0.72rem', fontWeight: 600, marginBottom: 8,
								}}>🗺️ {post.adventure_title}</div>
							)}

							{/* Content — clickable links + preserved newlines */}
							<PostContent text={post.content} textColor={tk.textPrimary} />

							{/* Tags */}
							{post.tags.length > 0 && (
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
									{post.tags.map(tag => (
										<span key={tag} style={{
											padding: '2px 8px', borderRadius: 20,
											background: isDark ? 'rgba(16,185,129,0.12)' : '#f0fdf4',
											color: isDark ? '#6ee7b7' : '#15803d', fontSize: '0.72rem',
										}}>#{tag}</span>
									))}
								</div>
							)}

							{/* Actions */}
							<div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
								<button
									onClick={() => handleLike(post.id)}
									style={{
										background: 'none', border: 'none', cursor: 'pointer',
										fontSize: '0.82rem',
										color: post.liked_by_me ? '#ef4444' : tk.textMuted,
										display: 'flex', alignItems: 'center', gap: 4,
										transition: 'transform 0.1s',
									}}
									onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)'; }}
									onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
								>
									{post.liked_by_me ? '❤️' : '🤍'} {post.like_count}
								</button>
								<button
									onClick={() => setOpenComments(c => ({ ...c, [post.id]: !c[post.id] }))}
									style={{
										background: 'none', border: 'none', cursor: 'pointer',
										fontSize: '0.82rem', color: tk.textMuted,
										display: 'flex', alignItems: 'center', gap: 4,
									}}
								>
									💬 {post.comment_count}
									{post.comment_count > 0 && (
										<span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
											{openComments[post.id] ? '▲' : '▼'}
										</span>
									)}
								</button>
							</div>

							{/* Comments section */}
							{openComments[post.id] && (
								<div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
									{post.comments.length === 0 && (
										<div style={{ fontSize: '0.8rem', color: tk.textMuted, marginBottom: 10 }}>
											No comments yet — be the first!
										</div>
									)}
									{post.comments.map(c => (
										<div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
											<div style={{
												width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
												background: 'linear-gradient(135deg,#667eea,#764ba2)',
												display: 'flex', alignItems: 'center', justifyContent: 'center',
												color: 'white', fontSize: '0.7rem', fontWeight: 700,
											}}>{c.username?.[0]?.toUpperCase()}</div>
											<div style={{
												background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
												borderRadius: 8, padding: '6px 10px', flex: 1,
											}}>
												<span style={{ fontSize: '0.78rem', fontWeight: 600, color: tk.textPrimary }}>{c.username} </span>
												<span style={{ fontSize: '0.82rem', color: tk.textPrimary, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.content}</span>
											</div>
										</div>
									))}
									<div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
										<input
											value={commentInputs[post.id] || ''}
											onChange={e => setCommentInputs(c => ({ ...c, [post.id]: e.target.value }))}
											onKeyPress={e => e.key === 'Enter' && handleComment(post.id)}
											placeholder="Add a comment..."
											maxLength={300}
											style={{
												flex: 1, padding: '7px 10px', borderRadius: 8,
												border: `1px solid ${borderColor}`, fontSize: '0.82rem',
												background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
												color: tk.textPrimary, outline: 'none',
											}}
										/>
										<button
											onClick={() => handleComment(post.id)}
											disabled={!commentInputs[post.id]?.trim()}
											style={{
												padding: '7px 12px', borderRadius: 8, border: 'none',
												background: commentInputs[post.id]?.trim() ? '#667eea' : (isDark ? '#374151' : '#cbd5e0'),
												color: 'white', fontSize: '0.78rem',
												fontWeight: 600, cursor: commentInputs[post.id]?.trim() ? 'pointer' : 'not-allowed',
											}}
										>→</button>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default SocialPage;