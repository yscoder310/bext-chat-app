import { Modal, Stack, TextInput, Button, PasswordInput, Tabs, Text, Divider, Group, Avatar, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { authApi } from '../api/auth';
import { notifications } from '@mantine/notifications';
import { updateUser } from '../store/slices/authSlice';
import { User, Lock, Mail } from 'lucide-react';
import { getAvatarColor } from '../utils/avatarColor';

interface UserProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

export const UserProfileModal = ({ opened, onClose }: UserProfileModalProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  // Profile update state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Reset form when modal opens/user changes
  useEffect(() => {
    if (opened && user) {
      setUsername(user.username);
      setEmail(user.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [opened, user]);

  const handleUpdateProfile = async () => {
    if (!username.trim() || !email.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Username and email are required',
        color: 'red',
      });
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const result = await authApi.updateProfile({ username, email });

      // Update local state
      dispatch(updateUser(result.user));
      
      // Update token if email was changed
      if (result.token) {
        localStorage.setItem('token', result.token);
      }

      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update profile',
        color: 'red',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      notifications.show({
        title: 'Validation Error',
        message: 'All password fields are required',
        color: 'red',
      });
      return;
    }

    if (newPassword.length < 6) {
      notifications.show({
        title: 'Validation Error',
        message: 'New password must be at least 6 characters',
        color: 'red',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Validation Error',
        message: 'New passwords do not match',
        color: 'red',
      });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await authApi.updatePassword({ currentPassword, newPassword });

      notifications.show({
        title: 'Success',
        message: 'Password updated successfully',
        color: 'green',
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update password',
        color: 'red',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          Profile Settings
        </Text>
      }
      size="md"
    >
      <Stack gap="lg">
        {/* User Avatar and Info */}
        <Group justify="center">
          <Stack align="center" gap="xs">
            <Avatar 
              size={80} 
              radius="xl" 
              color={getAvatarColor(user.username)}
              styles={{
                root: {
                  border: `3px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }
              }}
            >
              {user.username[0]?.toUpperCase()}
            </Avatar>
            <div style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600}>
                {user.username}
              </Text>
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            </div>
          </Stack>
        </Group>

        <Divider />

        {/* Tabs for Profile and Password */}
        <Tabs defaultValue="profile">
          <Tabs.List grow>
            <Tabs.Tab value="profile" leftSection={<User size={16} />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="password" leftSection={<Lock size={16} />}>
              Password
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile" pt="lg">
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftSection={<User size={16} />}
                required
              />

              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftSection={<Mail size={16} />}
                required
              />

              <Button
                onClick={handleUpdateProfile}
                loading={isUpdatingProfile}
                fullWidth
                mt="md"
              >
                Update Profile
              </Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="password" pt="lg">
            <Stack gap="md">
              <PasswordInput
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                onClick={handleUpdatePassword}
                loading={isUpdatingPassword}
                fullWidth
                mt="md"
              >
                Update Password
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  );
};
