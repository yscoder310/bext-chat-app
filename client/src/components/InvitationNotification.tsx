import { Modal, Stack, Group, Avatar, Text, Button, Badge, ScrollArea } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '../api/conversations';
import { socketService } from '../lib/socket';
import { notifications } from '@mantine/notifications';
import { Invitation } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface InvitationNotificationProps {
  opened: boolean;
  onClose: () => void;
}

export const InvitationNotification = ({ opened, onClose }: InvitationNotificationProps) => {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: conversationApi.getPendingInvitations,
    enabled: opened,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleAccept = (invitation: Invitation) => {
    socketService.acceptInvitation(invitation._id);
    
    notifications.show({
      title: 'Invitation Accepted',
      message: 'Joining group...',
      color: 'green',
    });

    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
  };

  const handleDecline = (invitation: Invitation) => {
    socketService.declineInvitation(invitation._id);
    
    notifications.show({
      title: 'Invitation Declined',
      message: 'You declined the invitation',
      color: 'orange',
    });

    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
  };

  const getConversationName = (invitation: Invitation): string => {
    if (typeof invitation.conversationId === 'string') {
      return 'Unknown Group';
    }
    return invitation.conversationId.groupName || 'Group';
  };

  const getConversationDescription = (invitation: Invitation): string | undefined => {
    if (typeof invitation.conversationId === 'string') {
      return undefined;
    }
    return invitation.conversationId.groupDescription;
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Group Invitations" size="md">
      <Stack>
        {isLoading ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Loading invitations...
          </Text>
        ) : invitations.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No pending invitations
          </Text>
        ) : (
          <ScrollArea h={400}>
            <Stack gap="md">
              {invitations.map((invitation) => (
                <Group
                  key={invitation._id}
                  p="md"
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                  align="start"
                >
                  <Avatar size="lg">
                    {getConversationName(invitation)[0]?.toUpperCase() || 'G'}
                  </Avatar>
                  
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {getConversationName(invitation)}
                        </Text>
                        {typeof invitation.conversationId !== 'string' && 
                         invitation.conversationId.groupType === 'public' && (
                          <Badge size="xs" color="blue">Public</Badge>
                        )}
                      </Group>
                      
                      {getConversationDescription(invitation) && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {getConversationDescription(invitation)}
                        </Text>
                      )}
                    </div>

                    <Text size="xs" c="dimmed">
                      Invited by <strong>{invitation.invitedBy.username}</strong>
                      {' • '}
                      {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                    </Text>

                    <Group gap="xs" mt="xs">
                      <Button
                        size="xs"
                        onClick={() => handleAccept(invitation)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDecline(invitation)}
                      >
                        Decline
                      </Button>
                    </Group>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  );
};
