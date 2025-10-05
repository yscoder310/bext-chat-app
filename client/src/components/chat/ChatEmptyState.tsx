import { Center, Stack, Box, Text, Badge, useMantineColorScheme, useMantineTheme } from '@mantine/core';

export const ChatEmptyState = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Center style={{ 
      height: '100vh', 
      maxHeight: 'calc(100vh - 60px)', 
      backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] 
    }}>
      <Stack align="center" gap="xl">
        <Box
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: isDark ? theme.colors.dark[6] : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isDark 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.colors.blue[6]}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Box>
        <Stack align="center" gap="xs">
          <Text size="xl" fw={600} c={isDark ? 'white' : 'dark'}>
            Welcome to Chat App
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Select a conversation from the sidebar to start messaging, or create a new conversation to connect with others
          </Text>
        </Stack>
        <Badge size="lg" variant="light" color="blue">
          💬 Start Chatting
        </Badge>
      </Stack>
    </Center>
  );
};
