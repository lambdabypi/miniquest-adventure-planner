// frontend/src/api/chat.ts
/**
 * Chat conversation history API calls
 */

import apiClient from './client';

export interface ChatMessage {
	id: string;
	type: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface SaveConversationRequest {
	messages: ChatMessage[];
	location: string;
	query_id?: string;
}

export interface Conversation {
	_id: string;
	user_id: string;
	messages: ChatMessage[];
	location: string;
	query_id?: string;
	created_at: string;
	updated_at: string;
	message_count: number;
	preview?: string;
}

export const chatApi = {
	/**
	 * Save a new conversation
	 */
	async saveConversation(request: SaveConversationRequest): Promise<{ conversation_id: string }> {
		const response = await apiClient.post('/api/chat/conversations', request);
		return response.data;
	},

	/**
	 * Update an existing conversation with new messages
	 */
	async updateConversation(conversationId: string, messages: ChatMessage[]): Promise<void> {
		await apiClient.put(`/api/chat/conversations/${conversationId}`, { messages });
	},

	/**
	 * Get list of user's conversations (metadata only)
	 */
	async getConversations(limit: number = 20): Promise<Conversation[]> {
		const response = await apiClient.get('/api/chat/conversations', {
			params: { limit }
		});
		return response.data.conversations;
	},

	/**
	 * Get a specific conversation with full message history
	 */
	async getConversation(conversationId: string): Promise<Conversation> {
		const response = await apiClient.get(`/api/chat/conversations/${conversationId}`);
		return response.data.conversation;
	},

	/**
	 * Delete a conversation
	 */
	async deleteConversation(conversationId: string): Promise<void> {
		await apiClient.delete(`/api/chat/conversations/${conversationId}`);
	},
};

export default chatApi;