import mongoose, { Document, Schema } from 'mongoose';
import { IChatRequest } from '../types';

export interface IChatRequestDocument extends Omit<IChatRequest, '_id'>, Document {}

const chatRequestSchema = new Schema<IChatRequestDocument>(
  {
    senderId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    receiverId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    message: {
      type: String,
      trim: true,
      maxlength: [200, 'Request message cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
chatRequestSchema.index({ senderId: 1, receiverId: 1 });
chatRequestSchema.index({ receiverId: 1, status: 1 });
chatRequestSchema.index({ status: 1 });

// Prevent duplicate pending requests
chatRequestSchema.index(
  { senderId: 1, receiverId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model<IChatRequestDocument>('ChatRequest', chatRequestSchema);
