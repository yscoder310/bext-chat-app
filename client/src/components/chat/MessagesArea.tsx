import { useEffect, useRef, useState } from 'react';
import { ScrollArea, Stack, useMantineColorScheme, useMantineTheme, Center, Loader, Text, Transition, Group } from '@mantine/core';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { ArrowDown } from 'lucide-react';

interface MessagesAreaProps {
  messages: any[];
  currentUserId?: string;
  formatMessageTime: (date: string | Date) => string;
  conversationId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const MessagesArea = ({
  messages,
  currentUserId,
  formatMessageTime,
  conversationId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: MessagesAreaProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const previousMessageCountRef = useRef<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Check if user is near bottom of scroll area
  const checkIfNearBottom = () => {
    const viewport = viewportRef.current;
    if (!viewport) return true;

    const threshold = 150; // pixels from bottom
    const scrollTop = viewport.scrollTop;
    const scrollHeight = viewport.scrollHeight;
    const clientHeight = viewport.clientHeight;
    
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    return distanceFromBottom < threshold;
  };

  // Handle conversation changes - always scroll to bottom on new conversation
  useEffect(() => {
    const isNewConversation = previousConversationIdRef.current !== conversationId;
    
    if (isNewConversation) {
      // New conversation selected - scroll to bottom immediately
      setIsFirstLoad(true);
      setIsNearBottom(true);
      setShowScrollButton(false);
      previousConversationIdRef.current = conversationId;
      previousMessageCountRef.current = 0;
      setTimeout(() => scrollToBottom('auto'), 0);
    }
  }, [conversationId]);

  // Handle first load - scroll to bottom once
  useEffect(() => {
    if (isFirstLoad && messages.length > 0 && !isLoadingMore) {
      setTimeout(() => {
        scrollToBottom('auto');
        setIsFirstLoad(false);
        previousMessageCountRef.current = messages.length;
      }, 0);
    }
  }, [messages.length, isFirstLoad, isLoadingMore]);

  // Handle new messages - only scroll if user is near bottom
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Skip if first load or loading more messages
    if (isFirstLoad || isLoadingMore || previousCount === 0) {
      previousMessageCountRef.current = currentCount;
      return;
    }

    // If message count increased
    if (currentCount > previousCount) {
      if (isNearBottom) {
        // User is at bottom - auto scroll
        setTimeout(() => scrollToBottom('smooth'), 50);
        setShowScrollButton(false);
      } else {
        // User is scrolled up - show button
        setShowScrollButton(true);
      }
    }

    previousMessageCountRef.current = currentCount;
  }, [messages.length, isNearBottom, isFirstLoad, isLoadingMore]);

  // Handle scroll event for loading more messages AND tracking scroll position
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const scrollTop = viewport.scrollTop;
      
      // Check if near bottom
      const nearBottom = checkIfNearBottom();
      setIsNearBottom(nearBottom);
      
      // Hide scroll button if near bottom
      if (nearBottom) {
        setShowScrollButton(false);
      }
      
      // If scrolled near the top, load more messages
      if (scrollTop < 100 && !isLoadingMore && hasMore && onLoadMore) {
        previousScrollHeightRef.current = viewport.scrollHeight;
        onLoadMore();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [onLoadMore, hasMore, isLoadingMore]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    if (!isLoadingMore && previousScrollHeightRef.current > 0 && viewportRef.current) {
      const viewport = viewportRef.current;
      const newScrollHeight = viewport.scrollHeight;
      const scrollDifference = newScrollHeight - previousScrollHeightRef.current;
      
      // Maintain scroll position by adjusting for the new content height
      viewport.scrollTop = scrollDifference;
      previousScrollHeightRef.current = 0;
    }
  }, [isLoadingMore]);

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
    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <ScrollArea 
        ref={scrollAreaRef}
        viewportRef={viewportRef}
        style={{ 
          flex: 1, 
          height: '100%',
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
          {isLoadingMore && (
            <Center py="sm">
              <Loader size="sm" />
            </Center>
          )}
          
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

      {/* Floating Scroll to Bottom Button */}
      <Transition mounted={showScrollButton} transition="slide-up" duration={200}>
        {(styles) => (
          <div
            style={{
              ...styles,
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              zIndex: 10,
            }}
          >
            <Group
              gap="xs"
              style={{
                background: isDark
                  ? `linear-gradient(135deg, ${theme.colors.blue[6]} 0%, ${theme.colors.cyan[6]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.blue[5]} 0%, ${theme.colors.cyan[5]} 100%)`,
                padding: '10px 16px',
                borderRadius: '28px',
                boxShadow: isDark 
                  ? '0 6px 20px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 6px 20px rgba(37, 99, 235, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isDark 
                  ? `2px solid ${theme.colors.blue[4]}`
                  : `2px solid ${theme.colors.blue[3]}`,
              }}
              onClick={() => {
                scrollToBottom('smooth');
                setShowScrollButton(false);
                setIsNearBottom(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 8px 24px rgba(37, 99, 235, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4)'
                  : '0 8px 24px rgba(37, 99, 235, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 6px 20px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 6px 20px rgba(37, 99, 235, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Text size="sm" fw={600} c="white" style={{ userSelect: 'none' }}>
                New messages
              </Text>
              <ArrowDown size={18} strokeWidth={2.5} color="white" />
            </Group>
          </div>
        )}
      </Transition>
    </div>
  );
};
