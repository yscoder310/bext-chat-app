/**
 * Generate consistent avatar color based on a name/string
 * Same name will always return the same color
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'red', 'pink', 'grape', 'violet', 'indigo', 
    'blue', 'cyan', 'teal', 'green', 'lime', 
    'yellow', 'orange'
  ];
  
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
