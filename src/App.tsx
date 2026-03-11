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
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- دالة حفظ النتيجة تلقائياً (هذا هو الجزء المفقود سابقاً) ---
  const saveScoreToSupabase = async (scoreToSave: number) => {
    if (!playerName || playerName.trim() === "") return;

    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert([{ 
          username: playerName.trim(), 
          score: scoreToSave 
        }]);

      if (error) throw error;
      console.log("✅ Score saved!");
      fetchLeaderboard(); 
    } catch (err) {
      console.error("❌ Error saving:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('username, score')
        .order('score', { ascending: false })
        .limit(10);
      if (!error) setLeaderboardData(data || []);
    } catch (err) {
      console.error(err);
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
        saveScoreToSupabase(finalScore); // حفظ النتيجة تلقائياً عند الخسارة
      }
    }, 1000);
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    localStorage.setItem('ramadan_player_name', playerName);
    setGameState('PLAYING');
    
    // خلط الأسئلة
    const randomized: Question[] = [];
    for (let i = 1; i <= 16; i++) {
      const pool = QUESTIONS.filter(q => q.difficulty === i);
      randomized.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    setCurrentQuestions(randomized);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 flex flex-col items-center justify-center">
      {gameState === 'START' && (
        <div className="text-center space-y-6">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
          <h1 className="text-3xl font-bold">مسابقة رمضان</h1>
          <input 
            className="text-black p-3 rounded-lg w-64 text-center"
            placeholder="ادخل اسمك"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={startGame} className="block w-64 bg-yellow-600 p-3 rounded-lg font-bold">ابدأ</button>
          <button onClick={() => setShowLeaderboard(true)} className="block w-64 bg-gray-700 p-3 rounded-lg">الأوائل</button>
        </div>
      )}

      {gameState === 'PLAYING' && currentQuestions[currentLevel] && (
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center text-xl text-yellow-500">سؤال {currentLevel + 1}</div>
          <div className="text-2xl text-center font-bold">{currentQuestions[currentLevel].question}</div>
          <div className="grid grid-cols-1 gap-4">
            {currentQuestions[currentLevel].options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)} className={`p-4 rounded-xl border-2 ${selectedAnswer === i ? 'border-yellow-500 bg-yellow-500/20' : 'border-white/20 hover:border-white'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {(gameState === 'LOSE' || gameState === 'WIN') && (
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold">{gameState === 'WIN' ? 'بطل!' : 'انتهت اللعبة'}</h2>
          <p className="text-2xl">نقاطك: {currentLevel > 0 ? POINTS_LEVELS[currentLevel - 1] : 0}</p>
          <button onClick={() => window.location.reload()} className="bg-yellow-600 p-4 rounded-xl px-12">مرة أخرى</button>
          <button onClick={() => setShowLeaderboard(true)} className="block w-full bg-gray-700 p-4 rounded-xl">عرض لوحة الأوائل</button>
        </div>
      )}

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black z-50 p-8">
          <button onClick={() => setShowLeaderboard(false)} className="absolute top-4 right-4"><X /></button>
          <h2 className="text-3xl font-bold text-center mb-8">لوحة المتصدرين</h2>
          <div className="max-w-md mx-auto space-y-2">
            {leaderboardData.map((item, idx) => (
              <div key={idx} className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span>{idx + 1}. {item.username}</span>
                <span className="text-yellow-500 font-bold">{item.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
