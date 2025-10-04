import mongoose, { Document, Schema } from 'mongoose';
import { IConversation } from '../types';

export interface IConversationDocument extends Omit<IConversation, '_id'>, Document {}

const conversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type: String,
      enum: ['one-to-one', 'group'],
      required: true,
      default: 'one-to-one',
    },
    participants: [
      {
        type: String,
        ref: 'User',
        required: true,
      },
    ],
    groupName: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    groupAdmin: {
      type: String,
      ref: 'User',
    },
    lastMessage: {
      type: String,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Ensure group conversations have a group name
conversationSchema.pre('save', function (next) {
  if (this.type === 'group' && !this.groupName) {
    next(new Error('Group conversations must have a group name'));
  } else {
    next();
  }
});

export default mongoose.model<IConversationDocument>('Conversation', conversationSchema);
