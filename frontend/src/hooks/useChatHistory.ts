// frontend/src/hooks/useChatHistory.ts
/**
 * Custom hook for managing chat conversation history
 */

import { useState, useCallback } from 'react';
import { chatApi, ChatMessage, Conversation } from '../api/chat';

export const useChatHistory = () => {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>('');

	/**
	 * Save a new conversation
	 */
	const saveConversation = useCallback(async (
		messages: ChatMessage[],
		location: string,
		queryId?: string
	): Promise<string | null> => {
		try {
			setLoading(true);
			setError('');

			const response = await chatApi.saveConversation({
				messages,
				location,
				query_id: queryId,
			});

			const conversationId = response.conversation_id;
			setCurrentConversationId(conversationId);

			console.log('✅ Conversation saved:', conversationId);
			return conversationId;

		} catch (err: any) {
			console.error('❌ Error saving conversation:', err);
			setError(err.message || 'Failed to save conversation');
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Update existing conversation with new messages
	 */
	const updateConversation = useCallback(async (
		conversationId: string,
		newMessages: ChatMessage[]
	): Promise<boolean> => {
		try {
			setLoading(true);
			setError('');

			await chatApi.updateConversation(conversationId, newMessages);

			console.log('✅ Conversation updated:', conversationId);
			return true;

		} catch (err: any) {
			console.error('❌ Error updating conversation:', err);
			setError(err.message || 'Failed to update conversation');
			return false;
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Load user's conversation list
	 */
	const loadConversations = useCallback(async (limit: number = 20) => {
		try {
			setLoading(true);
			setError('');

			const data = await chatApi.getConversations(limit);
			setConversations(data);

			console.log('✅ Loaded conversations:', data.length);

		} catch (err: any) {
			console.error('❌ Error loading conversations:', err);
			setError(err.message || 'Failed to load conversations');
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Load a specific conversation
	 */
	const loadConversation = useCallback(async (conversationId: string): Promise<Conversation | null> => {
		try {
			setLoading(true);
			setError('');

			const conversation = await chatApi.getConversation(conversationId);
			setCurrentConversationId(conversationId);

			console.log('✅ Loaded conversation:', conversationId);
			return conversation;

		} catch (err: any) {
			console.error('❌ Error loading conversation:', err);
			setError(err.message || 'Failed to load conversation');
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Delete a conversation
	 */
	const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
		try {
			setLoading(true);
			setError('');

			await chatApi.deleteConversation(conversationId);

			// Remove from local state
			setConversations(prev => prev.filter(c => c._id !== conversationId));

			if (currentConversationId === conversationId) {
				setCurrentConversationId(null);
			}

			console.log('✅ Deleted conversation:', conversationId);
			return true;

		} catch (err: any) {
			console.error('❌ Error deleting conversation:', err);
			setError(err.message || 'Failed to delete conversation');
			return false;
		} finally {
			setLoading(false);
		}
	}, [currentConversationId]);

	/**
	 * Auto-save conversation as messages are added
	 */
	const autoSaveConversation = useCallback(async (
		messages: ChatMessage[],
		location: string,
		queryId?: string
	): Promise<string | null> => {
		// If we have a current conversation, update it
		if (currentConversationId) {
			const success = await updateConversation(currentConversationId, messages);
			return success ? currentConversationId : null;
		}

		// Otherwise, create a new conversation
		return await saveConversation(messages, location, queryId);
	}, [currentConversationId, saveConversation, updateConversation]);

	return {
		conversations,
		currentConversationId,
		loading,
		error,
		saveConversation,
		updateConversation,
		loadConversations,
		loadConversation,
		deleteConversation,
		autoSaveConversation,
		setCurrentConversationId,
	};
};

export default useChatHistory;