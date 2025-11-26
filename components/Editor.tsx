
import React, { useEffect, useRef, useState } from 'react';
import { useActor } from '@xstate/react';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { exampleSetup } from 'prosemirror-example-setup';
import { toggleMark } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';
import { undo, redo, history } from 'prosemirror-history';
import { editorMachine } from '../machines/editorMachine';
import { streamContinuation } from '../services/geminiService';
import { 
  Loader2, Command, Plus, 
  List, ListOrdered, Undo2, Redo2, Image as ImageIcon, Brain 
} from 'lucide-react';

// --- SCHEMA DEFINITION ---
// Extending basic schema with lists and images
const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");
const mySchema = new Schema({
  nodes: nodes.update("image", {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null }
    },
    group: "inline",
    draggable: true,
    parseDOM: [{
      tag: "img[src]",
      getAttrs: (dom: any) => ({
        src: dom.getAttribute("src"),
        title: dom.getAttribute("title"),
        alt: dom.getAttribute("alt")
      })
    }],
    toDOM: (node: any) => ["img", node.attrs]
  }),
  marks: basicSchema.spec.marks
});

interface EditorProps {
  theme: 'light' | 'dark';
}

const Editor: React.FC<EditorProps> = ({ theme }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [state, send] = useActor(editorMachine);
  const [isReady, setIsReady] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textQueueRef = useRef<string>("");
  const isProcessingQueue = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toolbar State
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: DOMParser.fromSchema(mySchema).parse(document.createElement('div')),
      plugins: [
        history(),
        ...exampleSetup({ schema: mySchema, menuBar: false, history: false }) 
      ]
    });

    const view = new EditorView(editorRef.current, {
      state: startState,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        
        // Update Toolbar State
        updateToolbarState(newState);
      },
      attributes: {
        class: 'focus:outline-none h-full text-lg leading-relaxed font-light tracking-wide outline-none' 
      }
    });

    viewRef.current = view;
    setIsReady(true);
    updateToolbarState(view.state);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  const updateToolbarState = (editorState: EditorState) => {
    if (!editorState) return;
    setCanUndo(undo(editorState));
    setCanRedo(redo(editorState));
  };

  // Optimized Text Queue for Faster Rendering
  useEffect(() => {
    let animationFrameId: number;
    const processQueue = () => {
      if (!viewRef.current) return;
      
      if (textQueueRef.current.length > 0) {
        const queueLength = textQueueRef.current.length;
        let chunkSize = 1;

        // Aggressive adaptive typing speed
        // If queue builds up, flush it extremely fast to keep up with generation
        if (queueLength > 200) chunkSize = 50;
        else if (queueLength > 100) chunkSize = 25;
        else if (queueLength > 50) chunkSize = 10;
        else if (queueLength > 10) chunkSize = 4;
        else chunkSize = 2;

        const chunk = textQueueRef.current.slice(0, chunkSize);
        textQueueRef.current = textQueueRef.current.slice(chunkSize);
        
        const transaction = viewRef.current.state.tr.insertText(chunk);
        transaction.scrollIntoView();
        viewRef.current.dispatch(transaction);
        
        animationFrameId = requestAnimationFrame(processQueue);
      } else {
        isProcessingQueue.current = false;
      }
    };

    const triggerProcessing = () => {
      if (!isProcessingQueue.current) {
        isProcessingQueue.current = true;
        processQueue();
      }
    };
    (viewRef.current as any).triggerTyping = triggerProcessing;
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    let active = true;
    const runGeneration = async () => {
      if (state.matches('generating') && viewRef.current) {
        const currentText = viewRef.current.state.doc.textContent;
        const instruction = state.context.instruction;
        
        if (!isExpanded) setIsExpanded(true);
        
        const endPos = viewRef.current.state.doc.content.size;
        const resolvedPos = viewRef.current.state.doc.resolve(endPos);
        const tr = viewRef.current.state.tr.setSelection(TextSelection.near(resolvedPos));
        viewRef.current.dispatch(tr);
        viewRef.current.focus();

        try {
          await streamContinuation(currentText, instruction, (chunk) => {
            if (!active) return;
            textQueueRef.current += chunk;
            if (viewRef.current && (viewRef.current as any).triggerTyping) {
              (viewRef.current as any).triggerTyping();
            }
          });
          if (active) send({ type: 'GENERATION_COMPLETE' });
        } catch (err: any) {
          if (active) send({ type: 'ERROR', message: err.message || 'Failed to generate text' });
        }
      }
    };
    runGeneration();
    return () => { active = false; };
  }, [state.value, send, state.context.instruction]); 

  const clearEditor = () => {
    if (!viewRef.current) return;
    const state = viewRef.current.state;
    const tr = state.tr.delete(0, state.doc.content.size);
    viewRef.current.dispatch(tr);
    textQueueRef.current = "";
  };

  const handleStartGeneration = () => {
    if (!viewRef.current) return;
    if (!isExpanded) {
      clearEditor();
      setIsExpanded(true);
    }
    const currentEditorText = isExpanded ? viewRef.current.state.doc.textContent : "";
    send({ 
      type: 'CONTINUE_WRITING', 
      currentText: currentEditorText, 
      instruction: promptText || undefined 
    });
    // Optional: Keep input focused if preferred, but usually blurring to show generation is nice.
    // We'll leave focus on editor logic inside the effect.
  };

  const handleNewChat = () => {
    if (state.matches('generating')) {
      send({ type: 'CANCEL' });
    }
    clearEditor();
    setPromptText("");
    setIsExpanded(false);
    textQueueRef.current = "";
    if (inputRef.current) inputRef.current.focus();
  };

  // --- TOOLBAR COMMANDS ---
  const toggleBold = () => {
    if (viewRef.current) {
      toggleMark(mySchema.marks.strong)(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    }
  };

  const toggleItalic = () => {
    if (viewRef.current) {
      toggleMark(mySchema.marks.em)(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    }
  };

  const wrapBulletList = () => {
    if (viewRef.current) {
      wrapInList(mySchema.nodes.bullet_list)(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    }
  };

  const wrapOrderedList = () => {
    if (viewRef.current) {
      wrapInList(mySchema.nodes.ordered_list)(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    }
  };
  
  const handleUndo = () => {
     if (viewRef.current) {
        undo(viewRef.current.state, viewRef.current.dispatch);
        viewRef.current.focus();
     }
  };

  const handleRedo = () => {
     if (viewRef.current) {
        redo(viewRef.current.state, viewRef.current.dispatch);
        viewRef.current.focus();
     }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && viewRef.current) {
       const reader = new FileReader();
       reader.onload = (event) => {
          const src = event.target?.result;
          if (typeof src === 'string' && viewRef.current) {
             const { state } = viewRef.current;
             const { tr } = state;
             const imageNode = mySchema.nodes.image.create({ src });
             const transaction = tr.replaceSelectionWith(imageNode);
             viewRef.current.dispatch(transaction);
          }
       };
       reader.readAsDataURL(file);
    }
  };

  const isGenerating = state.matches('generating');

  // Theme Styles
  const controlSurfaceStyle = theme === 'dark'
    ? 'bg-white/[0.02] border-white/[0.08] border-t-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-[20px]' 
    : 'bg-white/60 border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.05)]';

  const inputTextStyle = theme === 'dark' 
    ? 'text-white placeholder-white/30' 
    : 'text-slate-800 placeholder-slate-400';

  const newChatButtonStyle = theme === 'dark'
    ? 'bg-white/[0.05] border-white/10 hover:bg-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
    : 'bg-white/80 border-black/5 hover:bg-white hover:border-black/10 hover:shadow-md text-slate-600 hover:text-slate-900';

  const actionButtonStyle = isGenerating 
    ? 'bg-indigo-500/20 border-indigo-400/50 animate-breathe shadow-[0_0_30px_rgba(99,102,241,0.2)]'
    : theme === 'dark'
      ? 'bg-white/[0.05] border-white/10 border-t-white/20 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]'
      : 'bg-white/80 border-black/5 hover:bg-white hover:border-black/10 hover:shadow-lg text-slate-700 hover:text-indigo-600';

  const resultCardStyle = theme === 'dark'
    ? 'bg-[#0a0a0a]/60 border-white/[0.08] border-t-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(255,255,255,0.03)] backdrop-blur-[50px]' 
    : 'bg-white/40 border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.05)] backdrop-blur-[20px]';
    
  // Haptic Glass Button Styles
  const glassBtnBase = "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ease-out group overflow-hidden";
  const glassBtnRest = theme === 'dark' ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-900";
  const glassBtnHover = theme === 'dark' 
    ? "hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
    : "hover:bg-white/60 hover:shadow-sm";
  const glassBtnActive = theme === 'dark'
    ? "active:scale-95 active:shadow-inner active:bg-black/20"
    : "active:scale-95 active:shadow-inner active:bg-black/5";
    
  const toolbarBtnClass = `${glassBtnBase} ${glassBtnRest} ${glassBtnHover} ${glassBtnActive}`;

  const ToolbarDivider = () => (
      <div className={`w-[1px] h-4 mx-3 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`} />
  );

  return (
    <div className="relative w-full mx-auto flex flex-col gap-6" style={{ '--breathe-shadow': theme === 'dark' ? '0 0 25px rgba(255,255,255,0.15)' : '0 0 25px rgba(99,102,241,0.2)' } as React.CSSProperties}>
      
      {/* --- CONTROL SURFACE --- */}
      <div className={`flex flex-col md:flex-row items-center gap-4 w-full p-2 rounded-[2rem] backdrop-blur-[20px] border transition-all duration-500 ${controlSurfaceStyle}`}>
        <div className="group relative flex-1 flex items-center transition-all px-4">
          <div className={`transition-colors duration-300 ${theme === 'dark' ? 'text-white/40 group-focus-within:text-indigo-300' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
            <Command size={18} />
          </div>
          <input 
             ref={inputRef}
             type="text"
             value={promptText}
             onChange={(e) => setPromptText(e.target.value)}
             onKeyDown={(e) => {
                 if(e.key === 'Enter' && promptText.trim()) {
                     e.preventDefault();
                     handleStartGeneration();
                 }
             }}
             placeholder="Describe your story or idea..." 
             className={`w-full bg-transparent border-none outline-none text-lg font-light tracking-wide py-3 px-4 transition-colors duration-300 ${inputTextStyle}`}
          />
        </div>
        <button onClick={handleNewChat} className={`flex items-center justify-center p-3 rounded-full border transition-all duration-300 group active:scale-95 ${newChatButtonStyle}`} title="New Chat">
          <Plus size={20} className={theme === 'dark' ? 'text-white/70 group-hover:text-white' : 'text-current'} />
        </button>
        <button
          onClick={isGenerating ? () => send({ type: 'CANCEL' }) : handleStartGeneration}
          disabled={!isReady}
          className={`relative group overflow-hidden flex items-center gap-3 px-8 py-3 rounded-full border transition-all duration-500 min-w-[180px] justify-center active:scale-95 ${actionButtonStyle}`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          {isGenerating ? (
            <Loader2 className={`animate-spin ${theme === 'dark' ? 'text-indigo-200' : 'text-indigo-600'}`} size={16} />
          ) : (
             <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(129,140,248,0.8)] ${theme === 'dark' ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
          )}
          <span className={`font-medium text-sm tracking-wide transition-colors ${isGenerating ? (theme === 'dark' ? 'text-indigo-100' : 'text-indigo-800') : ''}`}>
            {isGenerating ? 'Generating...' : 'Continue Writing'}
          </span>
        </button>
      </div>

      {/* --- SPATIAL RESULT CARD --- */}
      <div className={`relative w-full transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isExpanded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
        
        <div className={`absolute -inset-1 rounded-[30px] blur-xl transition-opacity duration-1000 ${isExpanded ? 'opacity-100' : 'opacity-0'} ${theme === 'dark' ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10' : 'bg-gradient-to-r from-blue-300/30 via-indigo-300/30 to-purple-300/30'}`} />

        <div className={`relative overflow-hidden rounded-[24px] border transition-all duration-500 min-h-[300px] flex flex-col ${resultCardStyle}`}>
           
           {/* CRYSTAL TOOLBAR RIBBON */}
           <div className={`relative z-20 flex items-center px-6 py-3 border-b ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-white/40'}`}>
              
              <div className="flex items-center gap-2">
                 <button onClick={handleUndo} disabled={!canUndo} className={`${toolbarBtnClass} ${!canUndo && 'opacity-30 cursor-not-allowed'}`} title="Undo">
                    <Undo2 size={18} />
                 </button>
                 <button onClick={handleRedo} disabled={!canRedo} className={`${toolbarBtnClass} ${!canRedo && 'opacity-30 cursor-not-allowed'}`} title="Redo">
                    <Redo2 size={18} />
                 </button>
              </div>

              <ToolbarDivider />

              <div className="flex items-center gap-2">
                 <button onClick={toggleBold} className={toolbarBtnClass} title="Bold">
                    <span className="font-serif font-bold text-lg">B</span>
                 </button>
                 <button onClick={toggleItalic} className={toolbarBtnClass} title="Italic">
                    <span className="font-serif italic text-lg">I</span>
                 </button>
              </div>

              <ToolbarDivider />

              <div className="flex items-center gap-2">
                 <button onClick={wrapBulletList} className={toolbarBtnClass} title="Bullet List">
                    <List size={18} />
                 </button>
                 <button onClick={wrapOrderedList} className={toolbarBtnClass} title="Ordered List">
                    <ListOrdered size={18} />
                 </button>
              </div>

              <ToolbarDivider />

              <div className="flex items-center gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className={toolbarBtnClass} title="Insert Image">
                    <ImageIcon size={18} />
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                 />
              </div>

              <div className="flex-1" />
              
              {isGenerating && (
                 <div className={`flex items-center gap-2 text-xs font-medium tracking-widest uppercase animate-pulse ${theme === 'dark' ? 'text-indigo-300/60' : 'text-indigo-600/60'}`}>
                   <Brain size={12} />
                   <span>Thinking</span>
                 </div>
              )}
           </div>

           {/* Glass Lighting Effects */}
           <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none z-30 ${theme === 'dark' ? 'via-white/20' : 'via-white/60'}`}></div>

           {/* Content */}
           <div className="flex-1 p-8 md:p-10 relative z-10">
              <div 
                ref={editorRef} 
                className="prose prose-lg max-w-none custom-scrollbar transition-colors duration-300 h-full min-h-[200px]"
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
