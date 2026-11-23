import type React from 'react';

/**
 * Props for a pop-up's dark background: clicking the background itself (not the box on it)
 * closes the pop-up. A press that starts inside the box and ends on the background, such as
 * selecting text and letting go outside, does not close it.
 *
 *   <div className="fixed inset-0 …" {...closeOnBackdrop(onClose)}>
 */
export const closeOnBackdrop = (close: () => void) => ({
  onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
    // Remembered on the element itself, so a re-render between press and release keeps it
    event.currentTarget.dataset.pressedBackdrop = event.target === event.currentTarget ? '1' : '';
  },
  onClick: (event: React.MouseEvent<HTMLElement>) => {
    const pressedHere = event.currentTarget.dataset.pressedBackdrop === '1';
    event.currentTarget.dataset.pressedBackdrop = '';
    if (pressedHere && event.target === event.currentTarget) close();
  },
});
