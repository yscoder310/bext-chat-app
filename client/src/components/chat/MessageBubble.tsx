import { Group, Avatar, Paper, Text, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { getAvatarColor } from '../../utils/avatarColor';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  isClusteredMessage: boolean;
  currentUserId?: string;
  formatMessageTime: (date: string | Date) => string;
}

export const MessageBubble = ({
  message,
  isOwn,
  isClusteredMessage,
  formatMessageTime,
}: MessageBubbleProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const senderUsername = typeof message.senderId === 'string' ? 'User' : message.senderId.username;
  const senderInitial = typeof message.senderId === 'string' ? 'U' : message.senderId.username[0].toUpperCase();

  return (
    <Group
      justify={isOwn ? 'flex-end' : 'flex-start'}
      align="flex-start"
      gap="xs"
      wrap="nowrap"
      style={{ 
        width: '100%',
        marginTop: isClusteredMessage ? '2px' : undefined,
      }}
    >
      {!isOwn && (
        isClusteredMessage ? (
          <div style={{ width: 36, flexShrink: 0 }} />
        ) : (
          <Avatar 
            size={36} 
            radius="xl" 
            color={getAvatarColor(senderUsername)}
            style={{
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {senderInitial}
          </Avatar>
        )
      )}
      <Paper
        p="xs"
        px="sm"
        radius="md"
        shadow="sm"
        style={{
          backgroundColor: isOwn 
            ? theme.colors.blue[6] 
            : (isDark ? theme.colors.dark[6] : 'white'),
          color: isOwn ? 'white' : (isDark ? theme.colors.gray[0] : 'black'),
          maxWidth: '65%',
          border: isOwn 
            ? 'none' 
            : `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          wordBreak: 'break-word',
          marginLeft: isOwn ? 'auto' : '0',
          marginRight: isOwn ? '0' : 'auto',
          boxShadow: isOwn 
            ? '0 4px 12px rgba(34, 139, 230, 0.25)' 
            : (isDark 
              ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.08)'),
          position: 'relative',
        }}
      >
        {!isOwn && !isClusteredMessage && typeof message.senderId !== 'string' && (
          <Text 
            size="xs" 
            fw={600} 
            c={isDark ? theme.colors.blue[4] : theme.colors.blue[6]}
            mb={4}
            style={{
              letterSpacing: '0.3px',
            }}
          >
            {message.senderId.username}
          </Text>
        )}
        <Text 
          size="sm" 
          style={{ 
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
            letterSpacing: '0.2px',
          }}
        >
          {message.content}
        </Text>
        <Group gap={4} mt={6} justify={isOwn ? 'flex-end' : 'flex-start'}>
          <Text 
            size="xs" 
            c={isOwn ? 'rgba(255,255,255,0.85)' : 'dimmed'} 
            fw={500}
            style={{ 
              fontSize: '10px',
              letterSpacing: '0.3px',
            }}
          >
            {formatMessageTime(message.createdAt)}
          </Text>
          {isOwn && (
            <svg 
              width="14" 
              height="10" 
              viewBox="0 0 16 11" 
              fill="none"
              style={{ opacity: 0.85 }}
            >
              <path 
                d="M11.071.653a.75.75 0 0 1 1.058 0l3.854 3.854a.75.75 0 0 1 0 1.058l-3.854 3.854a.75.75 0 1 1-1.058-1.058l2.576-2.576H.75a.75.75 0 0 1 0-1.5h12.897L10.571 1.71A.75.75 0 0 1 11.071.653Z" 
                fill="rgba(255,255,255,0.85)"
              />
              <path 
                d="M5.071.653a.75.75 0 0 1 1.058 0l3.854 3.854a.75.75 0 0 1 0 1.058l-3.854 3.854a.75.75 0 1 1-1.058-1.058l2.576-2.576H.75a.75.75 0 0 1 0-1.5h6.897L5.571 1.71A.75.75 0 0 1 5.071.653Z" 
                fill="rgba(255,255,255,0.85)"
              />
            </svg>
          )}
        </Group>
      </Paper>
      {isOwn && <div style={{ width: 36, flexShrink: 0 }} />}
    </Group>
  );
};
