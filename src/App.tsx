import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, HelpCircle, Menu, Zap, Phone, RefreshCw, 
  ChevronLeft, Camera, Download, User, X, Star, Moon 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

// استيراد بيانات الأسئلة
import { QUESTIONS, PRIZE_LEVELS_AR, POINTS_LEVELS, Question } from './data/questions';

// --- إعداد اتصال Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type GameState = 'START' | 'PLAYING' | 'RESULT' | 'WIN' | 'LOSE';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('ramadan_player_name') || '');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timer, setTimer] = useState(30);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- دالة جلب المتصدرين (المعدلة للاتصال المباشر) ---
  const fetchLeaderboard = async () => {
    setIsLeaderboardLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('username, score')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // --- دالة حفظ النتيجة تلقائياً ---
  const saveScoreToSupabase = async (scoreToSave: number) => {
    if (!playerName || playerName.trim() === "") return;

    try {
      console.log(`جاري حفظ نتيجة ${playerName}: ${scoreToSave}`);
      const { error } = await supabase
        .from('leaderboard')
        .insert([{ 
          username: playerName.trim(), 
          score: scoreToSave 
        }]);

      if (error) throw error;
      console.log("✅ تم حفظ النتيجة في Supabase!");
      fetchLeaderboard(); // تحديث القائمة بعد الحفظ
    } catch (err) {
      console.error("❌ خطأ في الحفظ:", err);
    }
  };

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    const isCorrect = index === currentQuestions[currentLevel].correctAnswer;

    setTimeout(() => {
      if (isCorrect) {
        if (currentLevel === 15) {
          setGameState('WIN');
          saveScoreToSupabase(POINTS_LEVELS[15]);
          confetti();
        } else {
          setCurrentLevel(prev => prev + 1);
          setTimer(30);
          setSelectedAnswer(null);
        }
      } else {
        setGameState('LOSE');
        const finalScore = currentLevel > 0 ? POINTS_LEVELS[currentLevel - 1] : 0;
        saveScoreToSupabase(finalScore);
      }
    }, 1000);
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    localStorage.setItem('ramadan_player_name', playerName);
    setGameState('PLAYING');
    
    const randomized: Question[] = [];
    for (let i = 1; i <= 16; i++) {
      const pool = QUESTIONS.filter(q => q.difficulty === i);
      if (pool.length > 0) {
        randomized.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }
    setCurrentQuestions(randomized);
  };

  useEffect(() => { 
    fetchLeaderboard(); 
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 flex flex-col items-center justify-center font-sans" dir="rtl">
      {gameState === 'START' && (
        <div className="text-center space-y-6">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
          <h1 className="text-3xl font-bold">مسابقة رمضان الكبرى</h1>
          <input 
            className="text-black p-3 rounded-lg w-64 text-center text-lg outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="ادخل اسمك"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={startGame} className="block w-64 bg-yellow-600 hover:bg-yellow-500 p-3 rounded-lg font-bold text-xl transition-colors">ابدأ اللعب</button>
          <button onClick={() => { setShowLeaderboard(true); fetchLeaderboard(); }} className="block w-64 bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-lg transition-colors">لوحة المتصدرين</button>
        </div>
      )}

      {gameState === 'PLAYING' && currentQuestions[currentLevel] && (
        <div className="max-w-2xl w-full space-y-8 animate-in fade-in duration-500">
          <div className="text-center text-xl text-yellow-500 font-bold">
            السؤال {currentLevel + 1} | الجائزة: {PRIZE_LEVELS_AR[currentLevel]}
          </div>
          <div className="text-2xl text-center font-bold leading-relaxed">{currentQuestions[currentLevel].question}</div>
          <div className="grid grid-cols-1 gap-4">
            {currentQuestions[currentLevel].options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleAnswer(i)} 
                disabled={selectedAnswer !== null}
                className={`p-4 rounded-xl border-2 text-right text-lg transition-all ${
                  selectedAnswer === i 
                    ? (i === currentQuestions[currentLevel].correctAnswer ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20') 
                    : 'border-white/20 hover:border-yellow-500 hover:bg-white/5'
                }`}
              >
                <span className="ml-3 text-yellow-500 font-bold">{['أ', 'ب', 'ج', 'د'][i]}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {(gameState === 'LOSE' || gameState === 'WIN') && (
        <div className="text-center space-y-6 animate-in zoom-in duration-300">
          <h2 className="text-5xl font-bold text-yellow-500">{gameState === 'WIN' ? 'ألف مبروك!' : 'للأسف انتهت اللعبة'}</h2>
          <p className="text-2xl">لقد جمعت: <span className="text-green-400 font-bold">{currentLevel > 0 ? POINTS_LEVELS[currentLevel - 1] : 0}</span> نقطة</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.reload()} className="bg-yellow-600 hover:bg-yellow-500 p-4 rounded-xl px-12 font-bold text-xl transition-all">العب مرة أخرى</button>
            <button onClick={() => { setShowLeaderboard(true); fetchLeaderboard(); }} className="bg-gray-700 hover:bg-gray-600 p-4 rounded-xl text-lg transition-all">مشاهدة المتصدرين</button>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/95 z-50 p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-[#1e293b] rounded-2xl p-6 relative shadow-2xl border border-white/10">
            <button onClick={() => setShowLeaderboard(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white"><X /></button>
            <h2 className="text-2xl font-bold text-center mb-6 text-yellow-500 flex items-center justify-center gap-2">
              <Star className="fill-yellow-500" /> لوحة المتصدرين
            </h2>
            
            <div className="space-y-3 overflow-y-auto max-h-[60vh]">
              {isLeaderboardLoading ? (
                <div className="text-center p-4">جاري تحميل البيانات...</div>
              ) : leaderboardData.length > 0 ? (
                leaderboardData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                    <span className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${idx < 3 ? 'bg-yellow-600' : 'bg-gray-600'}`}>
                        {idx + 1}
                      </span>
                      {item.username}
                    </span>
                    <span className="text-yellow-500 font-mono font-bold">{item.score.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400">لا توجد نتائج بعد، كن أول المسجلين!</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

