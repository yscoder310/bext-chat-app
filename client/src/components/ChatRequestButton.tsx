import { Popover, ActionIcon, Badge, Stack, Group, Avatar, Text, Button, Loader, ScrollArea, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useChatRequests } from '../hooks/useChatRequests';

export const ChatRequestButton = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [opened, setOpened] = useState(false);
  const {
    pendingRequests,
    isLoadingPending,
    acceptRequest,
    rejectRequest,
  } = useChatRequests();

  const handleAccept = (requestId: string) => {
    acceptRequest(requestId);
  };

  const handleReject = (requestId: string) => {
    rejectRequest(requestId);
  };

  return (
    <Popover
      width={350}
      position="bottom-end"
      opened={opened}
      onChange={setOpened}
      shadow="md"
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => setOpened((o) => !o)}
          style={{ position: 'relative' }}
        >
          <Bell size={22} />
          {pendingRequests.length > 0 && (
            <Badge
              size="xs"
              variant="filled"
              color="red"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                padding: '4px 6px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                fontSize: '10px',
              }}
            >
              {pendingRequests.length}
            </Badge>
          )}
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Chat Requests
            </Text>
            {pendingRequests.length > 0 && (
              <Badge size="sm" variant="filled" color="blue">
                {pendingRequests.length}
              </Badge>
            )}
          </Group>

          {isLoadingPending ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : pendingRequests.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No pending requests
            </Text>
          ) : (
            <ScrollArea.Autosize mah={400}>
              <Stack gap="sm">
                {pendingRequests.map((request) => (
                  <Stack
                    key={request._id}
                    gap="xs"
                    p="sm"
                    style={{
                      border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                      borderRadius: '8px',
                      backgroundColor: isDark ? theme.colors.dark[6] : 'white',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size="md" radius="xl">
                        {request.senderId.username[0].toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {request.senderId.username}
                        </Text>
                        {request.message && (
                          <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                            "{request.message}"
                          </Text>
                        )}
                      </div>
                    </Group>
                    <Group gap="xs" grow>
                      <Button
                        size="xs"
                        variant="filled"
                        color="green"
                        onClick={() => handleAccept(request._id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        color="red"
                        onClick={() => handleReject(request._id)}
                      >
                        Reject
                      </Button>
                    </Group>
                  </Stack>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
