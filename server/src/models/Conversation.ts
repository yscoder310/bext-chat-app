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
    memberJoinDates: {
      type: Map,
      of: Date,
      default: new Map(),
      // Maps userId -> Date when they joined
      // Used to filter messages: only show messages sent after join date
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
    return next(new Error('Group conversations must have a group name'));
  }
  
  // Ensure participants array is not empty
  if (!this.participants || this.participants.length === 0) {
    return next(new Error('Conversation must have at least one participant'));
  }
  
  next();
});

export default mongoose.model<IConversationDocument>('Conversation', conversationSchema);
