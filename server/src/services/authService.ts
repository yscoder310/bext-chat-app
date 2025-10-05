import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { JWTPayload } from '../types';

export class AuthService {
  private static generateToken(userId: string, email: string, role: 'user' | 'admin'): string {
    const payload: JWTPayload = { userId, email, role };
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  static async register(username: string, email: string, password: string) {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 400);
      }
      throw new AppError('Username already taken', 400);
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: 'user',
    });

    // Generate token
    const token = this.generateToken(String(user._id), user.email, user.role);

    return {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isOnline: user.isOnline,
      },
      token,
    };
  }

  static async login(email: string, password: string) {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update online status
    user.isOnline = true;
    await user.save();

    // Generate token
    const token = this.generateToken(String(user._id), user.email, user.role);

    return {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isOnline: user.isOnline,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    };
  }

  static async updateOnlineStatus(userId: string, isOnline: boolean) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isOnline,
        lastSeen: new Date(),
      },
      { new: true }
    );

    return user;
  }

  static async getAllUsers(excludeUserId?: string) {
    const query = excludeUserId ? { _id: { $ne: excludeUserId } } : {};
    const users = await User.find(query).select('-password');
    
    return users.map(user => ({
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  static async updateProfile(
    userId: string, 
    updates: { username?: string; email?: string }
  ) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if username is being changed and is already taken
    if (updates.username && updates.username !== user.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw new AppError('Username already taken', 400);
      }
    }

    // Check if email is being changed and is already taken
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ 
        email: updates.email,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw new AppError('Email already registered', 400);
      }
    }

    // Update user
    if (updates.username) user.username = updates.username;
    if (updates.email) user.email = updates.email;

    await user.save();

    // Generate new token with updated email if email was changed
    const token = updates.email 
      ? this.generateToken(String(user._id), user.email, user.role)
      : undefined;

    return {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isOnline: user.isOnline,
      },
      token,
    };
  }

  static async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }
}
