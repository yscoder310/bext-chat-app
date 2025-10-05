import mongoose, { Document, Schema } from 'mongoose';
import { IMessage } from '../types';

export interface IMessageDocument extends Omit<IMessage, '_id'>, Document {}

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      ref: 'Conversation',
    },
    senderId: {
      type: String,
      ref: 'User',
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    systemMessageType: {
      type: String,
      enum: ['member-added', 'member-removed', 'admin-promoted', 'member-left', 'group-created'],
    },
    metadata: {
      type: Map,
      of: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: String,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });

export default mongoose.model<IMessageDocument>('Message', messageSchema);
