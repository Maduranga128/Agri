import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  Settings, 
  Play, 
  FileCheck, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  Compass, 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  Volume2, 
  VolumeX,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { quizLevels, Question, Level } from './data/questions';
import { User } from 'firebase/auth';

// Web Audio API Synthesizer for futuristic sci-fi sound effects
class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220.00, now); // A3
    osc.frequency.linearRampToValueAtTime(146.83, now + 0.25); // D3
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSweep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

const synth = new SoundSynth();

// Utility function to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function App() {
  // Navigation & Core States
  const [mode, setMode] = useState<'landing' | 'play' | 'generator'>('landing');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Game Play States
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [levelScores, setLevelScores] = useState<Record<number, number>>({});
  const [completedLevels, setCompletedLevels] = useState<Record<number, boolean>>({});
  const [streakCount, setStreakCount] = useState(0);

  // Dynamic Shuffled Options State for current question
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  // Shuffle options whenever level or question index changes
  useEffect(() => {
    if (selectedLevel) {
      setShuffledOptions(shuffleArray(selectedLevel.questions[currentQuestionIndex].options));
    } else {
      setShuffledOptions([]);
    }
  }, [selectedLevel, currentQuestionIndex]);

  // Authentication States
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Google Forms Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedFormId, setGeneratedFormId] = useState<string | null>(null);
  const [generatedFormUrl, setGeneratedFormUrl] = useState<string | null>(null);

  // Initialize Auth State on Mount
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        synth.playSweep();
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setMode('landing');
    synth.playSweep();
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    synth.enabled = newState;
    if (newState) {
      synth.playCorrect();
    }
  };

  // Play Mode Controls
  const startLevel = (level: Level) => {
    setSelectedLevel(level);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setMode('play');
    synth.playSweep();
  };

  const handleAnswerSelect = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(option);
  };

  const submitAnswer = () => {
    if (!selectedLevel || !selectedAnswer || isAnswerSubmitted) return;
    
    const currentQuestion = selectedLevel.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    setIsAnswerSubmitted(true);
    
    if (isCorrect) {
      synth.playCorrect();
      setStreakCount(prev => prev + 1);
    } else {
      synth.playWrong();
      setStreakCount(0);
    }
  };

  const nextQuestion = () => {
    if (!selectedLevel) return;
    
    const currentQuestion = selectedLevel.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    // Update score of current level
    const pointsAwarded = isCorrect ? 2 : 0;
    setLevelScores(prev => ({
      ...prev,
      [selectedLevel.id]: (prev[selectedLevel.id] || 0) + pointsAwarded
    }));

    if (currentQuestionIndex < selectedLevel.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      // Completed level
      setCompletedLevels(prev => ({
        ...prev,
        [selectedLevel.id]: true
      }));
      setMode('landing');
      setSelectedLevel(null);
      synth.playSweep();
    }
  };

  // Google Forms API Quiz Generator
  const generateGoogleFormQuiz = async () => {
    if (!user || !accessToken) {
      await handleLogin();
      return;
    }

    const confirmed = window.confirm(
      "ඔබගේ Google Drive ගිණුම තුළ මෙම පැන විසදුම් ප්‍රශ්න පනහ (50) ඇතුළත් සත්‍ය Google Form ප්‍රශ්නාවලියක් නිර්මාණය කිරීමට ඔබට අවශ්‍යද?"
    );
    if (!confirmed) return;

    setIsGenerating(true);
    setGeneratedFormId(null);
    setGeneratedFormUrl(null);
    setLogs([]);

    const addLog = (msg: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("🚀 Google Forms API සම්බන්ධතාවය ආරම්භ කරමින්...");
      
      // Step 1: Create the Form
      addLog("📝 නව Google Form පත්‍රිකාවක් සාදමින්...");
      const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          info: {
            title: "Grade 9 Agri-Entrepreneurship Quiz - ප්‍රායෝගික හා තාක්ෂණික කුසලතා",
            documentTitle: "Grade 9 Practical Agriculture Quiz"
          }
        })
      });

      if (!createRes.ok) {
        throw new Error(`Form creation failed: ${createRes.statusText}`);
      }

      const form = await createRes.json();
      const formId = form.formId;
      addLog(`✅ Google Form එක සාර්ථකව සාදන ලදී! (ID: ${formId})`);

      // Step 2: Configure as Quiz & Batch Add Levels + Questions
      addLog("⚙️ ප්‍රශ්න පත්‍රිකාව 'Quiz' එකක් ලෙස සැකසුම් කරමින්...");
      
      // We will group updates into a single batch update to be lightning fast and compliant
      const requests: any[] = [
        // Make it a graded quiz
        {
          updateSettings: {
            settings: {
              quizSettings: {
                isQuiz: true
              }
            },
            updateMask: "quizSettings.isQuiz"
          }
        }
      ];

      // Formulate all the items
      let itemIndex = 0;
      quizLevels.forEach((level) => {
        // Add Section Header for each Level
        requests.push({
          createItem: {
            item: {
              title: level.title,
              description: level.description,
              pageBreakItem: {}
            },
            location: {
              index: itemIndex++
            }
          }
        });

        // Add 10 questions for this level
        level.questions.forEach((q) => {
          requests.push({
            createItem: {
              item: {
                title: q.question,
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: shuffleArray(q.options).map(opt => ({ value: opt }))
                    },
                    grading: {
                      pointValue: 2, // 2 points per question -> total 100 points
                      correctAnswers: {
                        answers: [
                          { value: q.correctAnswer }
                        ]
                      }
                    }
                  }
                }
              },
              location: {
                index: itemIndex++
              }
            }
          });
        });
      });

      addLog(`⚡ ප්‍රශ්න 50 ක් සහ මට්ටම් 5 ක වගන්ති ඇතුළත් කරමින්...`);
      
      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!batchRes.ok) {
        const errorData = await batchRes.json();
        console.error("Batch update error:", errorData);
        throw new Error(`Batch questions update failed: ${batchRes.statusText}`);
      }

      addLog("🎨 අනාගතවාදී තේමාවන් සහ සබැඳි සැකසුම් සම්පූර්ණ කරමින්...");
      addLog("🎉 ප්‍රශ්න පනහෙන් යුත් සම්පූර්ණ Google Form ප්‍රශ්නාවලිය සාර්ථකව නිම කරන ලදී!");
      
      setGeneratedFormId(formId);
      setGeneratedFormUrl(form.responderUri);
      synth.playCorrect();

    } catch (err: any) {
      console.error(err);
      addLog(`❌ දෝෂයක් සිදු විය: ${err.message || err}`);
      synth.playWrong();
    } finally {
      setIsGenerating(false);
    }
  };

  const getLevelStatusText = (level: Level) => {
    if (completedLevels[level.id]) {
      return `සම්පූර්ණයි (${levelScores[level.id] || 0}/20 ලකුණු)`;
    }
    return "තවම ආරම්භ කර නැත";
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Dynamic Cosmic Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60 z-0"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Global Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('landing')}>
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Sprout className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2">
                AGRI-ENTREPRENEUR 3000
              </h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Grade 9 Tech-Skills Quiz Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button 
              id="sound-toggle"
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              title={soundEnabled ? "Disable Sounds" : "Enable Sounds"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Google Authentication */}
            {user ? (
              <div id="user-profile" className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 pl-3 pr-1.5 py-1.5 rounded-xl">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-300">{user.displayName || "Agri Student"}</p>
                  <p className="text-[10px] font-mono text-slate-500">{user.email}</p>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-lg border border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold flex items-center justify-center text-xs">
                    {user.displayName?.[0] || "A"}
                  </div>
                )}
                <button 
                  id="sign-out-btn"
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors ml-1"
                  title="Sign out of Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                id="sign-in-btn"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button font-display"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">{isLoggingIn ? "ලොග් වෙමින්..." : "Sign in with Google"}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* Landing Mode */}
          {mode === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              {/* Majestic Headline Hero Banner */}
              <div id="hero-banner" className="text-center max-w-3xl mx-auto space-y-6 pt-6">
                <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full text-xs text-emerald-300 font-mono tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  පළමු පාඩම: කෘෂි ව්‍යවසායකත්වය ඇසුරෙන් සරල ප්‍රශ්න 50 ක්
                </div>
                <h2 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white leading-tight">
                  ගෘහස්ථ ව්‍යවසායකත්වය <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400">
                    අනාගතවාදී පැන විසදුම
                  </span>
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                  9 වන ශ්‍රේණියේ ප්‍රායෝගික හා තාක්ෂණික කුසලතා විෂය මාලාවේ 1 වන පාඩම ඇසුරින් සරල ප්‍රශ්න 50ක් සකසා ඇත. මට්ටම් 5කින් යුත් මෙම ප්‍රශ්නාවලිය මෙතැනින් සෙල්ලම් කරන්න, නැතහොත් සෘජුවම ඔබගේ Google Drive එක තුළ සුන්දර Google Form එකක් සාදා ගන්න!
                </p>
                
                {/* Global Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button 
                    id="gen-form-hero-btn"
                    onClick={() => {
                      if (!user) {
                        handleLogin();
                      } else {
                        generateGoogleFormQuiz();
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold font-display rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 group active:scale-98"
                  >
                    <FileCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Google Form එකක් සාදන්න
                  </button>
                  <button 
                    id="explain-learn-btn"
                    onClick={() => {
                      // Scroll down smoothly to level grid
                      document.getElementById('levels-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-6 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Compass className="w-5 h-5 text-emerald-400" />
                    ප්‍රශ්නාවලිය ක්‍රීඩා කරන්න
                  </button>
                </div>
              </div>

              {/* Levels Grid Section */}
              <div id="levels-section" className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-400" />
                      ක්‍රීඩා මට්ටම් 5 (Quiz Levels)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">Choose a level to start practicing</p>
                  </div>
                  {streakCount > 0 && (
                    <div className="bg-amber-950/40 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono text-sm animate-bounce">
                      <Flame className="w-4 h-4 fill-amber-500" />
                      STREAK: {streakCount}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizLevels.map((level) => {
                    const isCompleted = completedLevels[level.id];
                    const score = levelScores[level.id] || 0;
                    
                    return (
                      <div 
                        key={level.id}
                        id={`level-card-${level.id}`}
                        className={`group bg-slate-900/40 border transition-all rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden ${
                          isCompleted 
                            ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                            : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono tracking-widest px-2.5 py-1 bg-slate-800 rounded-full text-slate-400 uppercase">
                              Level 0{level.id}
                            </span>
                            <div className={`p-2 rounded-xl ${
                              isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/60 text-slate-500'
                            }`}>
                              {level.id === 1 && <Compass className="w-5 h-5" />}
                              {level.id === 2 && <Sprout className="w-5 h-5" />}
                              {level.id === 3 && <ShieldCheck className="w-5 h-5" />}
                              {level.id === 4 && <Flame className="w-5 h-5" />}
                              {level.id === 5 && <TrendingUp className="w-5 h-5" />}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="text-lg font-bold font-display text-white group-hover:text-emerald-400 transition-colors">
                              {level.title}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {level.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-900/60 mt-6 flex items-center justify-between">
                          <div className="text-[11px] font-mono">
                            <span className="text-slate-500">තත්ත්වය: </span>
                            <span className={isCompleted ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                              {getLevelStatusText(level)}
                            </span>
                          </div>
                          
                          <button 
                            id={`play-level-btn-${level.id}`}
                            onClick={() => startLevel(level)}
                            className={`p-2 rounded-xl transition-all ${
                              isCompleted 
                                ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950' 
                                : 'bg-slate-800 text-slate-300 group-hover:bg-emerald-500 group-hover:text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Futuristic Generator Terminal Panel */}
              <div id="forms-terminal" className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-cyan-500"></div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase">
                    <Terminal className="w-3 h-3" />
                    Google Cloud Automation
                  </div>
                  <h3 className="text-2xl font-bold font-display text-white">Google Form Creator</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    ප්‍රශ්න 50 කින් යුත් graded quiz (ලකුණු ලබා දෙන) Google Form එකක් සාදන්න. මට්ටම් පහ එකිනෙකින් වෙන් කිරීම සඳහා page breaks භාවිතා කරයි. සිසුන්ට වර්ණවත් හා ලස්සන අනාගතවාදී අත්දැකීමක් මේ තුළින් හිමි වේ.
                  </p>
                  
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Graded Quiz settings (නිවැරදි පිළිතුර සැකසීම)
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Section breaks per level (ප්‍රශ්න 10 බැගින් කොටස් 5 කට වෙන් කිරීම)
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Unicode Sinhala fonts used (නිවැරදි සිංහල යුනිකෝඩ් අක්ෂර රටා)
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-center">
                  <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                    
                    {!isGenerating && !generatedFormId && (
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Google Drive එකට සකසන්න</p>
                          <p className="text-xs text-slate-500">Click below to generate form</p>
                        </div>
                        <button 
                          id="gen-form-main-btn"
                          onClick={() => {
                            if (!user) {
                              handleLogin();
                            } else {
                              generateGoogleFormQuiz();
                            }
                          }}
                          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          {!user ? "Google සමඟ ලොග් වන්න" : "Google Form එකක් සාදන්න"}
                        </button>
                      </div>
                    )}

                    {isGenerating && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            සාදමින් පවතී...
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Forms API v1</span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                          {logs.map((log, idx) => (
                            <p key={idx}>{log}</p>
                          ))}
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 animate-pulse w-2/3 rounded-full"></div>
                        </div>
                      </div>
                    )}

                    {generatedFormId && (
                      <div className="space-y-4 text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Form එක සූදානම්!</p>
                          <p className="text-xs text-slate-500">ප්‍රශ්න 50 ම සාර්ථකව නිමා කරන ලදී</p>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            id="open-form-link"
                            href={generatedFormUrl || `https://docs.google.com/forms/d/${generatedFormId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-slate-200"
                          >
                            ප්‍රශ්නාවලිය බලන්න
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button 
                            id="reset-form-generation-btn"
                            onClick={() => {
                              setGeneratedFormId(null);
                              setGeneratedFormUrl(null);
                              setLogs([]);
                            }}
                            className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                          >
                            නැවත සාදන්න
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quiz Play Mode */}
          {mode === 'play' && selectedLevel && (
            <motion.div 
              key="play"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              {/* Quiz Mode Header */}
              <div className="flex items-center justify-between bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5">
                <button 
                  id="quit-quiz-btn"
                  onClick={() => {
                    setMode('landing');
                    setSelectedLevel(null);
                    synth.playSweep();
                  }}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  පිටවෙන්න
                </button>
                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 uppercase">
                    Level 0{selectedLevel.id}
                  </span>
                  <h3 className="text-sm font-bold font-display text-white mt-1">{selectedLevel.title}</h3>
                </div>
              </div>

              {/* Progress and Streak indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>ප්‍රශ්නය {currentQuestionIndex + 1} / {selectedLevel.questions.length}</span>
                  <span className="text-emerald-400 font-semibold">ලකුණු: {levelScores[selectedLevel.id] || 0} / 20</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentQuestionIndex + 1) / selectedLevel.questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Card */}
              <div id="quiz-question-card" className="bg-slate-900/60 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/30 px-2.5 py-1 rounded-md">
                    <Database className="w-3.5 h-3.5" />
                    Curriculum Content Verified
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold font-display text-white leading-snug">
                    {selectedLevel.questions[currentQuestionIndex].question}
                  </h4>
                </div>

                {/* Option selection */}
                <div className="grid grid-cols-1 gap-3.5 pt-2">
                  {shuffledOptions.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === selectedLevel.questions[currentQuestionIndex].correctAnswer;
                    
                    let optionStyle = "border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900 hover:border-slate-700";
                    if (selectedAnswer === option) {
                      optionStyle = "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-neon-cyan";
                    }
                    if (isAnswerSubmitted) {
                      if (option === selectedLevel.questions[currentQuestionIndex].correctAnswer) {
                        optionStyle = "bg-emerald-950/40 border-emerald-500/80 text-emerald-300 shadow-neon-green";
                      } else if (selectedAnswer === option) {
                        optionStyle = "bg-red-950/40 border-red-500/80 text-red-300";
                      } else {
                        optionStyle = "opacity-50 pointer-events-none";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        id={`option-btn-${idx}`}
                        disabled={isAnswerSubmitted}
                        onClick={() => setSelectedAnswer(option)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 text-sm sm:text-base ${optionStyle}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-semibold shrink-0 group-hover:bg-slate-700">
                            {idx + 1}
                          </span>
                          {option}
                        </span>
                        
                        {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {isAnswerSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Submit / Next Actions */}
                <div className="pt-4 flex justify-end">
                  {!isAnswerSubmitted ? (
                    <button
                      id="submit-answer-btn"
                      disabled={!selectedAnswer}
                      onClick={submitAnswer}
                      className={`px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        selectedAnswer 
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-neon-green active:scale-98 cursor-pointer' 
                          : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      පිළිතුර තහවුරු කරන්න
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      id="next-question-btn"
                      onClick={nextQuestion}
                      className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-neon-cyan active:scale-98"
                    >
                      {currentQuestionIndex < selectedLevel.questions.length - 1 ? "ඊළඟ ප්‍රශ්නය" : "මට්ටම අවසන් කරන්න"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Explanation Card */}
                {isAnswerSubmitted && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border mt-4 text-xs sm:text-sm leading-relaxed ${
                      selectedAnswer === selectedLevel.questions[currentQuestionIndex].correctAnswer
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      විවරණය (Explanation):
                    </p>
                    {selectedLevel.questions[currentQuestionIndex].explanation}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Futuristic Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 backdrop-blur-sm py-6 text-center text-xs text-slate-500 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© {new Date().getFullYear()} Agri-Entrepreneur 3000 quiz generator. Grade 9 Technical Skills curriculum companion.</p>
          <p className="font-mono text-[10px] text-slate-600">Built using React 19 & Google Workspace Forms API v1 • Enabled with permission from the app's users</p>
        </div>
      </footer>

    </div>
  );
}
