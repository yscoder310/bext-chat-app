import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button, Badge, Pagination, Center, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '../api/conversations';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users } from 'lucide-react';
import { getAvatarColor } from '../utils/avatarColor';

interface PublicGroupsDiscoveryProps {
  opened: boolean;
  onClose: () => void;
}

export const PublicGroupsDiscovery = ({ opened, onClose }: PublicGroupsDiscoveryProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['publicGroups', debouncedSearch, page],
    queryFn: () => conversationApi.getPublicGroups(debouncedSearch || undefined, page, 10),
    enabled: opened,
  });

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      await conversationApi.joinPublicGroup(groupId);
      
      notifications.show({
        title: 'Joined Group',
        message: `You've joined ${groupName}`,
        color: 'green',
      });

      // Invalidate conversations to refetch with new group
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Optionally close the modal after joining
      // onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to join group',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Discover Public Groups" size="lg">
      <Stack>
        <TextInput
          placeholder="Search public groups..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset to first page on search
          }}
          leftSection={<Search size={16} />}
        />

        <ScrollArea h={500}>
          {isLoading ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              Loading groups...
            </Text>
          ) : !data || data.groups.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {search ? `No groups found for "${search}"` : 'No public groups available'}
            </Text>
          ) : (
            <Stack gap="md">
              {data.groups.map((group) => (
                <Group
                  key={group.id}
                  p="md"
                  style={{
                    border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                    borderRadius: '8px',
                    backgroundColor: isDark ? theme.colors.dark[6] : 'white',
                  }}
                  align="start"
                >
                  <Avatar size="lg" color={getAvatarColor(group.groupName || 'Group')}>
                    {group.groupName[0]?.toUpperCase() || 'G'}
                  </Avatar>
                  
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {group.groupName}
                        </Text>
                        <Badge size="xs" color="blue">Public</Badge>
                      </Group>
                      
                      {group.groupDescription && (
                        <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                          {group.groupDescription}
                        </Text>
                      )}
                    </div>

                    <Group gap="md">
                      <Group gap={4}>
                        <Users size={14} />
                        <Text size="xs" c="dimmed">
                          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        </Text>
                      </Group>
                      
                      {group.lastMessageAt && (
                        <Text size="xs" c="dimmed">
                          Active {formatDistanceToNow(new Date(group.lastMessageAt), { addSuffix: true })}
                        </Text>
                      )}
                    </Group>

                    <Button
                      size="xs"
                      onClick={() => handleJoinGroup(group.id, group.groupName)}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Join Group
                    </Button>
                  </Stack>
                </Group>
              ))}
            </Stack>
          )}
        </ScrollArea>

        {data && data.pages > 1 && (
          <Center mt="md">
            <Pagination
              total={data.pages}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Center>
        )}

        {data && (
          <Text size="xs" c="dimmed" ta="center">
            Showing {data.groups.length} of {data.total} groups
          </Text>
        )}
      </Stack>
    </Modal>
  );
};
