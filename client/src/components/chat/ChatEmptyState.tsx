import { Center, Stack, Box, Text, Badge, useMantineColorScheme, useMantineTheme, Group, ThemeIcon, Paper } from '@mantine/core';
import { MessageCircle, Users, Sparkles } from 'lucide-react';

export const ChatEmptyState = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Center style={{ 
      height: '100vh', 
      maxHeight: 'calc(100vh - 60px)', 
      backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
      padding: '2rem'
    }}>
      <Stack align="center" gap="xl" maw={600}>
        {/* Main Icon with gradient background */}
        <Box
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: isDark 
              ? `linear-gradient(135deg, ${theme.colors.blue[8]} 0%, ${theme.colors.cyan[8]} 100%)`
              : `linear-gradient(135deg, ${theme.colors.blue[5]} 0%, ${theme.colors.cyan[5]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isDark 
              ? '0 8px 32px rgba(34, 139, 230, 0.3)' 
              : '0 8px 32px rgba(34, 139, 230, 0.2)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        >
          <MessageCircle size={64} color="white" strokeWidth={1.5} />
        </Box>

        {/* Welcome Text */}
        <Stack align="center" gap="md">
          <Group gap="xs">
            <Text 
              size="32px" 
              fw={700} 
              c={isDark ? 'white' : 'dark'}
              style={{ 
                letterSpacing: '-0.5px',
                background: isDark 
                  ? `linear-gradient(135deg, ${theme.colors.blue[4]} 0%, ${theme.colors.cyan[4]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.blue[6]} 0%, ${theme.colors.cyan[6]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Welcome to Chat
            </Text>
            <Sparkles size={28} color={theme.colors.yellow[5]} fill={theme.colors.yellow[5]} />
          </Group>
          <Text size="md" c="dimmed" ta="center" maw={450} lh={1.6}>
            Start meaningful conversations with your friends and colleagues. 
            Select a chat from the sidebar or create a new one to get started.
          </Text>
        </Stack>

        {/* Feature Cards */}
        <Group gap="lg" mt="md">
          <Paper
            p="md"
            radius="lg"
            shadow="sm"
            style={{
              backgroundColor: isDark ? theme.colors.dark[6] : 'white',
              border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
              minWidth: 160,
            }}
          >
            <Stack align="center" gap="xs">
              <ThemeIcon size={48} radius="xl" variant="light" color="blue">
                <MessageCircle size={24} />
              </ThemeIcon>
              <Text size="sm" fw={600} ta="center">
                Real-time Chat
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Instant messaging
              </Text>
            </Stack>
          </Paper>

          <Paper
            p="md"
            radius="lg"
            shadow="sm"
            style={{
              backgroundColor: isDark ? theme.colors.dark[6] : 'white',
              border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
              minWidth: 160,
            }}
          >
            <Stack align="center" gap="xs">
              <ThemeIcon size={48} radius="xl" variant="light" color="cyan">
                <Users size={24} />
              </ThemeIcon>
              <Text size="sm" fw={600} ta="center">
                Group Chats
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Connect with teams
              </Text>
            </Stack>
          </Paper>
        </Group>

        {/* Call to Action */}
        <Badge 
          size="lg" 
          variant="gradient" 
          gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
          style={{ 
            padding: '12px 24px',
            fontSize: '14px',
            cursor: 'default'
          }}
        >
          💬 Ready to Chat
        </Badge>
      </Stack>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </Center>
  );
};
