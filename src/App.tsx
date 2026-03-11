import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  HelpCircle, 
  Menu,
  Zap, 
  Phone, 
  RefreshCw, 
  ChevronLeft, 
  Camera,
  Download,
  User,
  X,
  Star,
  Moon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

// استيراد بيانات الأسئلة من ملف البيانات المحلي
import { QUESTIONS, BACKUP_QUESTIONS, PRIZE_LEVELS_AR, POINTS_LEVELS, Question } from './data/questions';

// --- إعداد اتصال Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'WAITING' | 'RESULT' | 'WIN' | 'LOSE';
type SelectionState = 'NONE' | 'SELECTED' | 'CONFIRMED';

// --- Sounds ---
const SOUNDS = {
  START: 'https://github.com/zueitera-cloud/Ramadan/raw/refs/heads/main/start.mp3',
  TICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  CORRECT: 'https://github.com/zueitera-cloud/Ramadan/raw/refs/heads/main/Good.mp3',
  INCORRECT: 'https://github.com/zueitera-cloud/Ramadan/raw/refs/heads/main/Bad.mp3',
  HEARTBEAT: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
};

// --- Decorative Components ---
const Mandala = () => (
  <svg viewBox="0 0 100 100" className="w-32 h-32 text-ramadan-gold opacity-80">
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
    {[...Array(12)].map((_, i) => (
      <g key={i} transform={`rotate(${i * 30} 50 50)`}>
        <path d="M50 5 Q55 25 50 45 Q45 25 50 5" fill="currentColor" opacity="0.4" />
        <circle cx="50" cy="15" r="2" fill="currentColor" />
      </g>
    ))}
    <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const Lantern = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 100" className={`w-10 h-24 text-ramadan-gold ${className}`}>
    <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="1" />
    <path d="M10 20 L30 20 L35 40 L20 50 L5 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
    <rect x="12" y="25" width="16" height="15" fill="currentColor" opacity="0.2" />
    <path d="M5 40 L35 40 L30 80 L10 80 Z" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M10 80 L30 80 L25 95 L15 95 Z" fill="currentColor" opacity="0.4" />
  </svg>
);

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
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [aiHintText, setAiHintText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'all' | 'week' | 'month'>('all');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [clickTracker, setClickTracker] = useState<{ [name: string]: number }>({});
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const gameRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Toast Helper ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Randomize Questions ---
  const fetchQuestions = () => {
    const randomized: Question[] = [];
    for (let i = 1; i <= 16; i++) {
      const pool = QUESTIONS.filter(q => q.difficulty === i);
      if (pool.length > 0) {
        const randomQ = pool[Math.floor(Math.random() * pool.length)];
        randomized.push(randomQ);
      }
    }
    if (randomized.length > 0) {
      setCurrentQuestions(randomized);
      setIsLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchLeaderboard('all');
  }, []);

  const currentQuestion = currentQuestions[currentLevel] || QUESTIONS[0];

  // --- Supabase Leaderboard Logic ---
  const fetchLeaderboard = async (type: 'all' | 'week' | 'month' = leaderboardType) => {
    setIsLeaderboardLoading(true);
    try {
      let query = supabase.from('leaderboard').select('username,
