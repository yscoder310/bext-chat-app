import { Paper, Center, Box, Group, Text, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { UserPlus, UserMinus, Crown, Users, UserCheck } from 'lucide-react';

interface SystemMessageProps {
  content: string;
  systemMessageType?: string;
  createdAt: string | Date;
  formatMessageTime: (date: string | Date) => string;
}

export const SystemMessage = ({
  content,
  systemMessageType,
  createdAt,
  formatMessageTime,
}: SystemMessageProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  // Determine icon based on system message type
  let icon = null;
  let iconColor = '#868e96';
  
  switch (systemMessageType) {
    case 'member-added':
      icon = <UserPlus size={14} />;
      iconColor = '#40c057';
      break;
    case 'member-left':
    case 'member-removed':
      icon = <UserMinus size={14} />;
      iconColor = '#fa5252';
      break;
    case 'admin-promoted':
      icon = <Crown size={14} />;
      iconColor = '#fab005';
      break;
    case 'group-created':
      icon = <Users size={14} />;
      iconColor = '#228be6';
      break;
    default:
      icon = <UserCheck size={14} />;
  }

  return (
    <Center my="xs">
      <Paper
        p="xs"
        px="md"
        radius="xl"
        style={{
          backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
          border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          maxWidth: '80%',
        }}
      >
        <Group gap="xs" justify="center">
          <Box style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Text
            size="xs"
            c="dimmed"
            ta="center"
            style={{
              fontStyle: 'italic',
              letterSpacing: '0.2px',
            }}
          >
            {content}
          </Text>
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontSize: '9px',
              opacity: 0.7,
            }}
          >
            {formatMessageTime(createdAt)}
          </Text>
        </Group>
      </Paper>
    </Center>
  );
};
