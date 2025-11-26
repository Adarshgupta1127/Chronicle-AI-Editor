import React, { useState, useRef, useEffect } from 'react';
import Editor from './components/Editor';
import { Moon, Sun } from 'lucide-react';

// --- THEME TOGGLE COMPONENT ---
interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button 
      onClick={toggleTheme}
      className={`relative w-20 h-10 rounded-full p-1 transition-all duration-500 ease-out shadow-inner flex items-center 
        ${theme === 'dark' 
          ? 'bg-slate-900/80 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' 
          : 'bg-slate-300 border border-black/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
        }`}
      aria-label="Toggle Theme"
    >
      <div 
        className={`absolute w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${theme === 'dark' 
            ? 'translate-x-0 bg-slate-800 text-indigo-300' 
            : 'translate-x-10 bg-white text-orange-400'
          }`}
      >
        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </div>
    </button>
  );
};

// --- SPOTLIGHT TITLE COMPONENT ---
const SpotlightTitle = ({ theme }: { theme: 'light' | 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLHeadingElement>(null);
  const [opacity, setOpacity] = useState(0);
  
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    let frameId: number;
    const animate = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.08;
      pos.current.y += (mouse.current.y - pos.current.y) * 0.08;

      if (overlayRef.current) {
        const mask = `radial-gradient(350px circle at ${pos.current.x}px ${pos.current.y}px, black 0%, transparent 100%)`;
        overlayRef.current.style.maskImage = mask;
        overlayRef.current.style.webkitMaskImage = mask;
      }
      
      frameId = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      if (container) container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative inline-block mb-12 p-8 text-center"
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
    >
      <h1 className={`text-5xl md:text-8xl font-black tracking-tighter select-none transition-colors duration-700 leading-tight
        ${theme === 'dark' ? 'text-white/10' : 'text-slate-900/15'}`}>
        Chronicle AI Editor
      </h1>
      <h1 
        ref={overlayRef}
        className={`absolute inset-0 top-8 left-0 text-5xl md:text-8xl font-black tracking-tighter select-none pointer-events-none transition-opacity duration-500 leading-tight
          ${theme === 'dark' 
            ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]' 
            : 'text-slate-900 drop-shadow-[0_0_30px_rgba(0,0,0,0.1)]'}`}
        style={{ opacity: opacity }}
      >
        Chronicle AI Editor
      </h1>
    </div>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans transition-colors duration-700
      ${theme === 'dark' ? 'bg-[#050505] selection:bg-indigo-500/30' : 'bg-[#e2e8f0] selection:bg-indigo-500/20'}`}>
      
      {/* Background System */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {theme === 'dark' ? (
          // Midnight Nebula (Dark Mode) - Enhanced Visuals
          <>
            <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-violet-900/20 rounded-full blur-[120px] animate-drift" />
            <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[100px] animate-drift delay-1000" />
            <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-indigo-950/30 rounded-full blur-[150px] animate-drift delay-2000" />
            {/* Starlight Texture Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-90" />
          </>
        ) : (
          // Morning Mist (Light Mode) - Reduced Brightness
          <>
             <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-slate-300/40 rounded-full blur-[120px] animate-drift" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-200/40 rounded-full blur-[120px] animate-drift delay-1000" />
             <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-200/30 rounded-full blur-[100px] animate-drift delay-2000" />
             <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/20 to-slate-50/50" />
          </>
        )}
      </div>

      <main className={`relative z-10 w-full px-4 md:px-8 lg:px-16 py-12 ${theme}`}>
        <div className="max-w-[1200px] mx-auto flex flex-col items-center">
          
          <div className="w-full flex justify-end mb-4">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          <SpotlightTitle theme={theme} />
          
          <div className="w-full max-w-4xl">
            <Editor theme={theme} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;