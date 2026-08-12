
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import UsagyuuunAvatar from './components/UsagyuuunAvatar';
import { UsagyuuunState, Message } from './types';
import { SYSTEM_INSTRUCTION, VOICE_NAME, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from './constants';
import { decode, decodeAudioData, createPcmBlob } from './services/audioHelper';

const App: React.FC = () => {
  const [usagyuState, setUsagyuState] = useState<UsagyuuunState>(UsagyuuunState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setCustomApiKey(storedKey);
    }
  }, []);

  const getApiKey = () => {
    return customApiKey || localStorage.getItem('gemini_api_key') || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  };

  // Audio Contexts & Refs
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptRef = useRef<{ input: string; output: string }>({ input: '', output: '' });
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanupAudio = useCallback(() => {
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
    inputAudioCtxRef.current = null;
    outputAudioCtxRef.current = null;
    setUsagyuState(UsagyuuunState.IDLE);
  }, []);

  const startLiveSession = async () => {
    if (isConnecting) return;
    const key = getApiKey();
    if (!key) {
      setApiKeyModalOpen(true);
      setError('Please provide a Gemini API key to chat with Usagyuuun!');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      
      // Initialize Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Session Opened');
            setIsConnected(true);
            setIsConnecting(false);
            setUsagyuState(UsagyuuunState.LISTENING);

            // Start streaming microphone
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const processor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(processor);
            processor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              setUsagyuState(UsagyuuunState.TALKING);
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setUsagyuState(UsagyuuunState.LISTENING);
                }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Transcriptions
            if (msg.serverContent?.inputTranscription) {
              transcriptRef.current.input += msg.serverContent.inputTranscription.text;
            }
            if (msg.serverContent?.outputTranscription) {
              transcriptRef.current.output += msg.serverContent.outputTranscription.text;
            }

            if (msg.serverContent?.turnComplete) {
              const { input, output } = transcriptRef.current;
              if (input || output) {
                setMessages(prev => [
                  ...prev,
                  { role: 'user', text: input || '...', timestamp: Date.now() },
                  { role: 'model', text: output || '🐰 (Excited vibrations)', timestamp: Date.now() + 1 }
                ]);
                transcriptRef.current = { input: '', output: '' };
                setUsagyuState(UsagyuuunState.EXCITED);
                setTimeout(() => setUsagyuState(UsagyuuunState.LISTENING), 1500);
              }
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setUsagyuState(UsagyuuunState.LISTENING);
            }
          },
          onerror: (err) => {
            console.error('Session Error:', err);
            setError('Something went wrong! Usagyuuun is confused!');
            stopSession();
          },
          onclose: () => {
            console.log('Session Closed');
            stopSession();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to Usagyuuun');
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    cleanupAudio();
    setIsConnected(false);
    setIsConnecting(false);
  };

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setApiKeyModalOpen(false);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen usagyuun-gradient overflow-hidden">
      {/* Header */}
      <header className="bg-white/40 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-pink-200/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-400 shadow-sm overflow-hidden">
            <span className="text-2xl">🐰</span>
          </div>
          <h1 className="text-2xl font-black text-pink-600 tracking-tight italic">
            USAGYUUUN <span className="text-pink-400">VTUBER</span>
          </h1>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setApiKeyModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-pink-50 text-pink-700 font-bold rounded-xl border border-pink-200 transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <i className="fa-solid fa-key text-pink-500"></i> API Key
          </button>
          <button 
            onClick={() => setUsagyuState(UsagyuuunState.EXCITED)}
            className="hidden md:block px-4 py-2 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            CARROT? 🥕
          </button>
        </div>
      </header>

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-pink-200 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-xl">
                  🔑
                </div>
                <h3 className="text-xl font-black text-pink-700">Gemini API Key</h3>
              </div>
              <button 
                onClick={() => setApiKeyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Enter your Gemini API key for the Live Audio API session. Your key is securely stored in your browser's local storage and never sent anywhere else.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                defaultValue={customApiKey}
                id="apiKeyInput"
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:outline-none text-gray-800 font-mono text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setApiKeyModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = (document.getElementById('apiKeyInput') as HTMLInputElement)?.value;
                  saveApiKey(input || '');
                }}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-sm shadow-md"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Experience */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden">
        
        {/* VTuber Viewport */}
        <div className="flex-[2] relative bg-white/30 backdrop-blur rounded-[2.5rem] border-4 border-white/50 shadow-2xl flex items-center justify-center overflow-hidden min-h-[300px]">
          <UsagyuuunAvatar state={usagyuState} />
          
          {/* Status Indicator */}
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-black/10 rounded-full backdrop-blur-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-10 flex flex-col items-center gap-4 w-full">
            {error && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold animate-bounce shadow-lg">
                {error}
              </div>
            )}
            
            <button
              onClick={isConnected ? stopSession : startLiveSession}
              disabled={isConnecting}
              className={`
                group flex items-center gap-3 px-10 py-5 rounded-full text-2xl font-black transition-all shadow-xl
                ${isConnected 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white animate-pulse hover:animate-none'
                }
                disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 active:scale-95
              `}
            >
              <i className={`fa-solid ${isConnected ? 'fa-phone-slash' : 'fa-microphone'} text-3xl`}></i>
              <span>{isConnecting ? 'WAKING UP...' : isConnected ? 'SHHH!' : 'HI USAGYUUUN!'}</span>
            </button>
            
            <p className="text-pink-800/60 font-medium text-sm bg-white/40 px-3 py-1 rounded-full">
              {isConnected ? 'He is listening... Say something funny!' : 'Click to start high-energy rabbit chat!'}
            </p>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 flex flex-col bg-white/60 backdrop-blur rounded-[2.5rem] border-4 border-white/50 shadow-xl overflow-hidden max-h-[40vh] md:max-h-full">
          <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between shrink-0">
            <h3 className="font-black text-pink-600 uppercase tracking-widest text-sm">Action Logs</h3>
            <span className="text-xs text-pink-400 font-bold">{messages.length} Events</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
                <i className="fa-solid fa-bolt text-4xl text-pink-300"></i>
                <p className="text-pink-800 font-bold">No noise yet! Start the stream to see what Usagyuuun has to say!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm border-2 ${
                    msg.role === 'user' 
                      ? 'bg-pink-500 text-white border-pink-400 rounded-tr-none' 
                      : 'bg-white text-pink-700 border-pink-100 rounded-tl-none font-medium'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-pink-300 font-bold mt-1 uppercase">
                    {msg.role === 'user' ? 'You' : 'Usagyuuun'}
                  </span>
                </div>
              ))
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Footer Branding */}
          <div className="p-4 bg-pink-100/30 text-center shrink-0">
             <p className="text-[10px] text-pink-400 font-black tracking-widest uppercase">
               Powered by Gemini Live API • 🐰 2024
             </p>
          </div>
        </div>
      </main>

      {/* Decorative Floating Elements */}
      <div className="fixed -bottom-10 -left-10 w-40 h-40 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 -right-10 w-32 h-32 bg-yellow-200/30 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
};

export default App;
