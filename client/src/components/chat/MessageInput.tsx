import { useState } from 'react';
import { Paper, Group, TextInput, ActionIcon, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { Send, Smile, Paperclip } from 'lucide-react';
import { getSetting } from '../UserSettingsModal';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export const MessageInput = ({
  onSendMessage,
  onTyping,
  onStopTyping,
}: MessageInputProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
    onStopTyping();
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (e.target.value.trim()) {
      onTyping();
    } else {
      onStopTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const enterToSend = getSetting('enterToSend') as boolean;
    
    if (e.key === 'Enter') {
      if (enterToSend) {
        if (!e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSend();
        }
      }
    }
  };

  return (
    <Paper 
      p="md" 
      shadow="md"
      radius={0}
      style={{
        borderTop: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : 'white',
        flexShrink: 0,
      }}
    >
      <Group gap="xs" align="flex-end">
        <ActionIcon 
          size={42} 
          variant="light" 
          color="gray"
          radius="xl"
          style={{
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Paperclip size={20} />
        </ActionIcon>
        
        <TextInput
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          radius="xl"
          size="md"
          styles={{
            input: {
              border: `2px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
              backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
              color: isDark ? theme.colors.gray[0] : 'black',
              fontSize: '14px',
              padding: '12px 18px',
              transition: 'all 0.2s ease',
              '&:focus': {
                borderColor: theme.colors.blue[6],
                backgroundColor: isDark ? theme.colors.dark[6] : 'white',
                boxShadow: `0 0 0 3px ${isDark ? 'rgba(34, 139, 230, 0.15)' : 'rgba(34, 139, 230, 0.1)'}`,
              },
              '&::placeholder': {
                color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
              },
            },
          }}
          style={{ flex: 1 }}
        />
        
        <ActionIcon 
          size={42} 
          variant="light" 
          color="gray"
          radius="xl"
          style={{
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Smile size={20} />
        </ActionIcon>
        
        <ActionIcon 
          size={42} 
          onClick={handleSend} 
          disabled={!message.trim()}
          radius="xl"
          variant="filled"
          color="blue"
          style={{
            transition: 'all 0.2s ease',
          }}
          styles={{
            root: {
              '&:disabled': {
                backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[2],
                color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
              },
              '&:not(:disabled):hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(34, 139, 230, 0.3)',
              },
            },
          }}
        >
          <Send size={20} />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
