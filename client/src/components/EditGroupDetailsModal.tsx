import { useState } from 'react';
import { Modal, TextInput, Textarea, Button, Group, Stack } from '@mantine/core';
import { Edit } from 'lucide-react';
import { conversationApi } from '../api/conversations';
import { notifications } from '@mantine/notifications';
import { useDispatch } from 'react-redux';
import { updateConversation } from '../store/slices/chatSlice';
import type { Conversation } from '../types';

interface EditGroupDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export function EditGroupDetailsModal({ opened, onClose, conversation }: EditGroupDetailsModalProps) {
  const dispatch = useDispatch();
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [groupDescription, setGroupDescription] = useState(conversation.groupDescription || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Group name is required',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const updatedConversation = await conversationApi.updateGroupDetails(conversation.id, {
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
      });

      dispatch(updateConversation(updatedConversation));

      notifications.show({
        title: 'Success',
        message: 'Group details updated successfully',
        color: 'green',
      });

      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to update group details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form to original values
    setGroupName(conversation.groupName || '');
    setGroupDescription(conversation.groupDescription || '');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Edit Group Details"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Group Name"
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            leftSection={<Edit size={16} />}
            maxLength={50}
          />

          <Textarea
            label="Group Description"
            placeholder="Enter group description (optional)"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            minRows={3}
            maxRows={6}
            maxLength={200}
            description={`${groupDescription.length}/200 characters`}
          />

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              leftSection={<Edit size={16} />}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
