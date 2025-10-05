/**
 * Plays a notification sound using Web Audio API
 * This creates a simple, pleasant notification tone without needing an audio file
 */
export const playNotificationSound = () => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure the sound - a pleasant two-tone notification
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // First tone at 800Hz
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Second tone at 600Hz
    
    // Configure volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick attack
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3); // Fade out
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};
