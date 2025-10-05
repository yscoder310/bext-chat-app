import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
  conversationId: mongoose.Types.ObjectId; // Changed from roomId to conversationId
  invitedBy: mongoose.Types.ObjectId;
  invitedUser: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation', // Reference to Conversation, not Room
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
InvitationSchema.index({ invitedUser: 1, status: 1 });
InvitationSchema.index({ conversationId: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 }); // For cleanup of expired invitations

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);
