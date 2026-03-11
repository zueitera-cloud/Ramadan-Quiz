import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, HelpCircle, Menu, Zap, Phone, RefreshCw, 
  ChevronLeft, Camera, Download, User, X, Star, Moon 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

// استيراد بيانات الأسئلة من ملف البيانات المحلي
import { QUESTIONS, PRIZE_LEVELS_AR, POINTS_LEVELS, Question } from './data/questions';

// --- إعداد اتصال Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'WAITING' | 'RESULT' | 'WIN' | 'LOSE';
type SelectionState = 'NONE' | 'SELECTED' | 'CONFIRMED';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('ramadan_player_name') || '');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>('NONE');
  const [timer, setTimer] = useState(30);
  const [lifelines, setLifelines] = useState({
    fiftyFifty: true,
    aiHint: true,
    call: true,
    switch: true,
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- دالة حفظ النتيجة في Supabase (التعديل الرئيسي) ---
  const saveScoreToSupabase = async (finalScore: number) => {
    if (!playerName || playerName.trim() === "") return;

    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert([{ 
          username: playerName, 
          score: finalScore 
        }]);

      if (error) throw error;
      console.log("تم حفظ النتيجة بنجاح!");
      fetchLeaderboard(); // تحديث القائمة فوراً بعد الحفظ
    } catch (error) {
      console.error("خطأ في حفظ النتيجة:", error);
    }
  };

  // --- دالة جلب المتصدرين ---
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
      console.error("خطأ في جلب البيانات:", error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // --- منطق الإجابة ونهاية اللعبة ---
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setSelectionState('CONFIRMED');

    const isCorrect = index === currentQuestions[currentLevel].correctAnswer;

    setTimeout(() => {
      if (isCorrect) {
        if (currentLevel === 15) {
          setGameState('WIN');
          saveScoreToSupabase(POINTS_LEVELS[15]); // حفظ عند الفوز النهائي
          confetti();
        } else {
          setCurrentLevel(prev => prev + 1);
          setTimer(30);
          setSelectedAnswer(null);
          setSelectionState('NONE');
        }
      } else {
        setGameState('LOSE');
        // حفظ النقاط التي وصل إليها اللاعب عند الخسارة
        const pointsEarned = currentLevel > 0 ? POINTS_LEVELS[currentLevel - 1] : 0;
        saveScoreToSupabase(pointsEarned);
      }
    }, 1500);
  };

  // --- بدء اللعبة وحفظ الاسم ---
  const startGame = () => {
    if (!playerName.trim()) {
      showToast("يرجى إدخال اسمك أولاً", "error");
      return;
    }
    localStorage.setItem('ramadan_player_name', playerName);
    setGameState('PLAYING');
    fetchQuestions();
  };

  // --- Randomize Questions ---
  const fetchQuestions = () => {
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-ramadan-dark text-white font-noto overflow-hidden">
      {/* واجهة البداية */}
      {gameState === 'START' && (
        <div className="flex flex-col items-center justify-center h-screen space-y-8 p-4">
          <Trophy className="w-20 h-20 text-ramadan-gold animate-bounce" />
          <h1 className="text-4xl font-bold text-center">مسابقة رمضان الكبرى</h1>
          <div className="w-full max-w-sm space-y-4">
            <input 
              type="text" 
              placeholder="أدخل اسمك هنا..." 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/10 border-2 border-ramadan-gold/30 text-center text-xl focus:border-ramadan-gold outline-none transition-all"
            />
            <button 
              onClick={startGame}
              className="w-full p-4 bg-ramadan-gold text-ramadan-dark font-bold text-2xl rounded-xl hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-500/20"
            >
              ابدأ التحدي
            </button>
            <button 
              onClick={() => setShowLeaderboard(true)}
              className="w-full p-4 bg-white/5 border border-white/10 text-xl rounded-xl hover:bg-white/10 transition-all"
            >
              لائحة المتصدرين
            </button>
          </div>
        </div>
      )}

      {/* واجهة اللعب (الأسئلة) */}
      {gameState === 'PLAYING' && currentQuestions.length > 0 && (
        <div className="p-4 max-w-4xl mx-auto h-screen flex flex-col justify-center">
          <div className="text-center mb-8">
            <p className="text-ramadan-gold text-xl mb-2">السؤال {currentLevel + 1} على {PRIZE_LEVELS_AR[currentLevel]}</p>
            <h2 className="text-2xl md:text-3xl font-bold leading-relaxed">
              {currentQuestions[currentLevel].question}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestions[currentLevel].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={selectionState !== 'NONE'}
                className={`p-6 text-right text-xl rounded-2xl border-2 transition-all ${
                  selectedAnswer === index 
                    ? 'border-ramadan-gold bg-ramadan-gold/20' 
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <span className="text-ramadan-gold ml-4 font-bold">{['أ', 'ب', 'ج', 'د'][index]}:</span>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* شاشة الخسارة / النتيجة */}
      {(gameState === 'LOSE' || gameState === 'WIN') && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50">
          <Trophy className={`w-24 h-24 mb-6 ${gameState === 'WIN' ? 'text-ramadan-gold' : 'text-gray-500'}`} />
          <h2 className="text-4xl font-bold mb-2">{gameState === 'WIN' ? 'ألف مبروك!' : 'هارد لك!'}</h2>
          <p className="text-2xl mb-8 opacity-80">لقد حصلت على {currentLevel > 0 ? POINTS_LEVELS[currentLevel - 1] : 0} نقطة</p>
          <button 
            onClick={() => window.location.reload()}
            className="p-4 bg-ramadan-gold text-ramadan-dark font-bold text-xl rounded-xl w-full max-w-xs"
          >
            العب مرة أخرى
          </button>
        </div>
      )}

      {/* لائحة الأوائل (Overlay) */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ramadan-dark z-[60] p-6 overflow-y-auto"
          >
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-ramadan-gold flex items-center gap-3">
                  <Trophy /> لائحة الأوائل
                </h2>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 bg-white/5 rounded-full"><X /></button>
              </div>

              <div className="space-y-3">
                {isLeaderboardLoading ? (
                  <p className="text-center opacity-50">جاري التحميل...</p>
                ) : leaderboardData.length > 0 ? (
                  leaderboardData.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-4 bg-white/5 border border-white/10 rounded-xl items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-ramadan-gold font-bold">#{idx + 1}</span>
                        <span className="text-xl">{item.username}</span>
                      </div>
                      <span className="text-ramadan-gold font-mono font-bold">{item.score.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center opacity-50">لا يوجد نتائج بعد</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl z-[100] ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
