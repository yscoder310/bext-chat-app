import { Transition } from '@mantine/core';
import { useEffect, useState } from 'react';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeIn = ({ children, delay = 0, duration = 300 }: FadeInProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Transition
      mounted={mounted}
      transition="fade"
      duration={duration}
      timingFunction="ease"
    >
      {(styles) => <div style={styles}>{children}</div>}
    </Transition>
  );
};

interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const SlideIn = ({ children, delay = 0, duration = 300, direction = 'up' }: SlideInProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transitionMap = {
    up: 'slide-up' as const,
    down: 'slide-down' as const,
    left: 'slide-left' as const,
    right: 'slide-right' as const,
  };

  return (
    <Transition
      mounted={mounted}
      transition={transitionMap[direction]}
      duration={duration}
      timingFunction="ease"
    >
      {(styles) => <div style={styles}>{children}</div>}
    </Transition>
  );
};
