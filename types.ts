export interface EditorContext {
  content: string;
  instruction?: string;
  error: string | null;
}

export type EditorEvent = 
  | { type: 'CONTINUE_WRITING'; currentText: string; instruction?: string }
  | { type: 'CANCEL' }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'ERROR'; message: string };