import { setup, assign } from 'xstate';
import { EditorContext, EditorEvent } from '../types';

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  actions: {
    setError: assign({
      error: ({ event }) => (event.type === 'ERROR' ? event.message : null),
    }),
    clearError: assign({
      error: () => null,
    }),
    setInstruction: assign({
      instruction: ({ event }) => (event.type === 'CONTINUE_WRITING' ? event.instruction : undefined),
    }),
  },
}).createMachine({
  id: 'editor',
  initial: 'idle',
  context: {
    content: '',
    error: null,
    instruction: undefined,
  },
  states: {
    idle: {
      on: {
        CONTINUE_WRITING: {
          target: 'generating',
          actions: ['clearError', 'setInstruction'],
        },
      },
    },
    generating: {
      on: {
        CANCEL: 'idle',
        GENERATION_COMPLETE: 'success',
        ERROR: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    success: {
      after: {
        2000: 'idle',
      },
      on: {
        CONTINUE_WRITING: 'generating',
      },
    },
    error: {
      on: {
        CONTINUE_WRITING: 'generating',
        CANCEL: 'idle',
      },
    },
  },
});