import { useEffect, useRef } from 'react';
import { ScrollArea, Stack, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';

interface MessagesAreaProps {
  messages: any[];
  currentUserId?: string;
  formatMessageTime: (date: string | Date) => string;
}

export const MessagesArea = ({
  messages,
  currentUserId,
  formatMessageTime,
}: MessagesAreaProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const shouldClusterMessage = (currentMsg: any, prevMsg: any | null): boolean => {
    if (!prevMsg || prevMsg.messageType === 'system') {
      return false;
    }

    const prevSenderId = typeof prevMsg.senderId === 'string' 
      ? prevMsg.senderId 
      : prevMsg.senderId?.id;
    
    const currentSenderId = typeof currentMsg.senderId === 'string' 
      ? currentMsg.senderId 
      : currentMsg.senderId?.id;
    
    const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    
    return prevSenderId === currentSenderId && timeDiff < 120000; // 2 minutes
  };

  return (
    <ScrollArea 
      style={{ 
        flex: 1, 
        minHeight: 0,
        backgroundImage: isDark
          ? `
            linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%),
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.02) 10px, rgba(255,255,255,.02) 20px)
          `
          : `
            linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%),
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)
          `,
        backgroundBlendMode: 'overlay',
      }} 
      p="md"
      styles={{
        viewport: {
          paddingBottom: '20px',
          '& > div': {
            display: 'block !important',
          }
        }
      }}
    >
      <Stack gap="sm">
        {messages.map((msg, index) => {
          if (msg.messageType === 'system') {
            return (
              <SystemMessage
                key={msg._id}
                content={msg.content}
                systemMessageType={msg.systemMessageType}
                createdAt={msg.createdAt}
                formatMessageTime={formatMessageTime}
              />
            );
          }

          const isOwn = typeof msg.senderId === 'string' 
            ? msg.senderId === currentUserId 
            : msg.senderId?.id === currentUserId;

          const prevMsg = index > 0 ? messages[index - 1] : null;
          const isClusteredMessage = shouldClusterMessage(msg, prevMsg);

          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={isOwn}
              isClusteredMessage={isClusteredMessage}
              currentUserId={currentUserId}
              formatMessageTime={formatMessageTime}
            />
          );
        })}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </Stack>
    </ScrollArea>
  );
};
