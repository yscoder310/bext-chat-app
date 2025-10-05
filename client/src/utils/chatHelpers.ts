import { 
  format, 
  isToday, 
  isYesterday, 
  isThisWeek,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInSeconds
} from 'date-fns';

// Format message timestamp with smart formatting like WhatsApp
export const formatMessageTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const now = new Date();
  
  const seconds = differenceInSeconds(now, date);
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);

  if (seconds < 30) {
    return 'just now';
  }
  
  if (seconds < 60) {
    return `${seconds} secs ago`;
  }
  
  if (minutes < 60) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }
  
  if (isToday(date)) {
    if (hours < 12) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    return format(date, 'h:mm a');
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(date, { weekStartsOn: 0 })) {
    return format(date, 'EEEE');
  }
  
  const daysDiff = differenceInDays(now, date);
  if (daysDiff < 365) {
    return format(date, 'MMM d');
  }
  
  return format(date, 'MMM d, yyyy');
};

// Get last seen text for offline users
export const getLastSeenText = (lastSeen: string | Date | null | undefined): string | null => {
  if (!lastSeen) return null;
  
  const lastSeenDate = new Date(lastSeen);
  const diffMins = differenceInMinutes(new Date(), lastSeenDate);
  
  if (diffMins < 1) return 'Last seen just now';
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  
  const diffHours = differenceInHours(new Date(), lastSeenDate);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  
  const diffDays = differenceInDays(new Date(), lastSeenDate);
  return `Last seen ${diffDays}d ago`;
};
