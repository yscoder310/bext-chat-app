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
    groupDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Group description cannot exceed 500 characters'],
    },
    groupType: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    groupAdmins: [
      {
        type: String,
        ref: 'User',
      },
    ],
    groupAdmin: {
      type: String,
      ref: 'User',
    },
    groupSettings: {
      maxMembers: {
        type: Number,
        default: 500,
        min: 2,
        max: 10000,
      },
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      isArchived: {
        type: Boolean,
        default: false,
      },
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
