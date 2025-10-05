import { Center, Stack, Loader, Text, useMantineColorScheme, useMantineTheme } from '@mantine/core';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingFallback = ({ message = 'Loading...', fullScreen = true }: LoadingFallbackProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Center
      style={{
        height: fullScreen ? '100vh' : '100%',
        width: '100%',
        backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
      }}
    >
      <Stack align="center" gap="md">
        <Loader size="lg" type="dots" color="blue" />
        <Text size="sm" c="dimmed" fw={500}>
          {message}
        </Text>
      </Stack>
    </Center>
  );
};

export const PageLoader = () => <LoadingFallback message="Loading page..." />;
export const ComponentLoader = () => <LoadingFallback message="Loading component..." fullScreen={false} />;
