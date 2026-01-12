/**
 * NEON VINYL: GHOST GROOVES - Event Runner Context
 *
 * Provides GSAP animation control to all game components.
 * Allows Cell components to register their sprites for animation.
 */
import React, { createContext, useContext } from 'react';
import useEventRunner from '../hooks/useEventRunner';

// Create context
const EventRunnerContext = createContext(null);

/**
 * Event Runner Provider
 * Wraps game components to provide animation capabilities
 */
export const EventRunnerProvider = ({ children }) => {
  const eventRunner = useEventRunner();

  return (
    <EventRunnerContext.Provider value={eventRunner}>
      {children}
    </EventRunnerContext.Provider>
  );
};

/**
 * Hook to access Event Runner from components
 */
export const useEventRunnerContext = () => {
  const context = useContext(EventRunnerContext);
  if (!context) {
    throw new Error('useEventRunnerContext must be used within EventRunnerProvider');
  }
  return context;
};

export default EventRunnerContext;
