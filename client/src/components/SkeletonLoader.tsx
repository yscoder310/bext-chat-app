import { Stack, Skeleton, Paper, Group, useMantineColorScheme, useMantineTheme } from '@mantine/core';

export const ConversationListSkeleton = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack gap="md">
      {/* Search skeleton */}
      <Skeleton height={36} radius="md" />
      
      {/* Action buttons skeleton */}
      <Group>
        <Skeleton height={36} width={120} radius="md" />
        <Skeleton height={36} width={36} radius="md" />
      </Group>

      {/* Conversation items skeleton */}
      <Stack gap="xs">
        {[1, 2, 3, 4, 5].map((item) => (
          <Paper
            key={item}
            p="md"
            radius="md"
            style={{
              backgroundColor: isDark ? theme.colors.dark[6] : 'white',
              border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
            }}
          >
            <Group wrap="nowrap">
              <Skeleton height={40} circle />
              <Stack gap={6} style={{ flex: 1 }}>
                <Skeleton height={14} width="60%" radius="sm" />
                <Skeleton height={12} width="80%" radius="sm" />
              </Stack>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
};

export const MessagesSkeleton = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack gap="md" p="md">
      {[1, 2, 3, 4].map((item) => (
        <Group
          key={item}
          align="flex-start"
          wrap="nowrap"
          style={{
            justifyContent: item % 2 === 0 ? 'flex-start' : 'flex-end',
          }}
        >
          {item % 2 === 0 && <Skeleton height={32} circle />}
          <Paper
            p="sm"
            radius="md"
            style={{
              maxWidth: '70%',
              backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            }}
          >
            <Skeleton height={12} width={200} radius="sm" mb={6} />
            <Skeleton height={12} width={150} radius="sm" />
          </Paper>
          {item % 2 !== 0 && <Skeleton height={32} circle />}
        </Group>
      ))}
    </Stack>
  );
};

export const ChatHeaderSkeleton = () => {
  return (
    <Group justify="space-between" p="md">
      <Group>
        <Skeleton height={40} circle />
        <Stack gap={4}>
          <Skeleton height={16} width={120} radius="sm" />
          <Skeleton height={12} width={80} radius="sm" />
        </Stack>
      </Group>
      <Skeleton height={36} width={36} circle />
    </Group>
  );
};
