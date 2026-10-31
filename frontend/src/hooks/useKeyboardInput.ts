import { useEffect, useRef } from 'react';
import { keyboardAction } from '../keypad';
import type { CalculatorController } from './useCalculator';

/**
 * Connects keyboard shortcuts to the calculator controller. The latest
 * controller is kept in a ref so the listener is installed only once.
 */
export function useKeyboardInput(controller: CalculatorController) {
  const latestController = useRef(controller);
  latestController.current = controller;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const current = latestController.current;
      if (current.loading) return;

      const target = event.target;
      const targetIsControl =
        target instanceof Element &&
        target.closest('button, a, input, select, textarea') !== null;
      const action = keyboardAction(event.key, targetIsControl);
      if (action === null) return;

      event.preventDefault();
      current.perform(action);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
