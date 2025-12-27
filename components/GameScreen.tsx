
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Player, QuizQuestion, GameMode } from '../types';
import { generateQuiz } from '../services/geminiService';
import { PENALTY_MS, getQuestionsCount } from '../constants';

interface Props {
  player: Player;
  mode: GameMode;
  onFinish: (finalTimeMs: number) => void;
  onCancel: () => void;
}

export const GameScreen: React.FC<Props> = ({ player, mode, onFinish, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(0);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [shake, setShake] = useState(false);
  const [isWrong, setIsWrong] = useState<number | null>(null); 

  const timerRef = useRef<number | null>(null);
  const totalQuestions = getQuestionsCount(mode);

  // Load quiz on mount based on mode
  useEffect(() => {
    const load = async () => {
      try {
        const data = await generateQuiz(mode);
        setQuestions(data);
        setLoading(false);
        const start = Date.now();
        setStartTime(start);
        setNow(start);
      } catch (e) {
        console.error(e);
      }
    };
    load();

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [mode]);

  const updateTimer = useCallback(() => {
    setNow(Date.now());
    timerRef.current = requestAnimationFrame(updateTimer);
  }, []);

  useEffect(() => {
    if (!loading && startTime) {
      timerRef.current = requestAnimationFrame(updateTimer);
    }
  }, [loading, startTime, updateTimer]);

  const handleOptionClick = (code: string, index: number) => {
    if (isWrong !== null) return; 

    const currentQ = questions[currentIndex];
    const isCorrect = code === currentQ.correctCode;

    if (isCorrect) {
      if (currentIndex + 1 >= questions.length) {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        const finalTime = (Date.now() - (startTime || 0)) + penaltyTime;
        onFinish(finalTime);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      setPenaltyTime(prev => prev + PENALTY_MS);
      setShake(true);
      setIsWrong(index);
      setTimeout(() => {
        setShake(false);
        setIsWrong(null);
      }, 500);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-xl animate-pulse">
           {mode === GameMode.DAILY_STANDARD ? 'Sincronizando Desafío Diario...' : 'Generando partida...'}
        </p>
      </div>
    );
  }

  const elapsedTime = startTime ? now - startTime + penaltyTime : 0;
  const currentQuestion = questions[currentIndex];

  const getModeLabel = () => {
      switch(mode) {
          case GameMode.COMPETITIVE_5: return 'RÁPIDO (5)';
          case GameMode.COMPETITIVE: return 'CLÁSICO (10)';
          case GameMode.COMPETITIVE_20: return 'RESISTENCIA (20)';
          case GameMode.DAILY_STANDARD: return 'DIARIO';
          case GameMode.DAILY_THEMATIC: return 'TEMÁTICO';
          case GameMode.WEEKLY_LEAGUE: return 'LIGA SEMANAL';
          case GameMode.NATIONS_LEAGUE: return 'LIGA NACIONES';
          default: return 'JUEGO';
      }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-gray-800 shadow-md z-10">
        <div className="flex items-center space-x-2">
          <img 
             src={`https://flagcdn.com/w40/${player.countryCode}.png`} 
             alt="Player Flag" 
             className="h-6 rounded"
          />
          <span className="font-bold text-gray-200 hidden sm:inline">{player.username}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">
            {getModeLabel()}
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-mono font-bold text-yellow-400 tabular-nums">
          {formatTime(elapsedTime)}
        </div>
        <button 
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          Abandonar
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 max-w-4xl mx-auto w-full">
        
        {/* Progress */}
        <div className="w-full bg-gray-700 h-2 rounded-full mb-6 mt-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${((currentIndex) / totalQuestions) * 100}%` }}
          ></div>
        </div>

        <div className="text-gray-400 mb-2 uppercase tracking-widest text-xs font-semibold">
          Ronda {currentIndex + 1} / {totalQuestions}
        </div>

        {/* Question Text */}
        <div className={`mb-8 text-center relative transform transition-transform ${shake ? 'translate-x-[-10px]' : ''} ${shake ? 'text-red-500' : ''}`}>
           <h2 className="text-3xl md:text-5xl font-extrabold text-white">
             {currentQuestion.targetCountryName}
           </h2>
           <p className="text-gray-400 mt-2 text-lg">Selecciona la bandera correcta</p>
           
           {shake && (
             <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-8 bg-red-600 text-white font-bold px-4 py-1 rounded-full animate-bounce shadow-lg">
               +5s Penalización
             </div>
           )}
        </div>

        {/* Options Grid - 8 flags */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={`${currentIndex}-${idx}`}
              onClick={() => handleOptionClick(option.code, idx)}
              className={`
                aspect-[4/3] relative rounded-xl overflow-hidden shadow-lg group border-2 bg-gray-800
                transition-all duration-200
                hover:scale-[1.05] hover:border-blue-300 hover:border-[3px] hover:z-10
                active:scale-95 active:border-blue-500
                ${isWrong === idx 
                  ? 'border-red-600 opacity-75' 
                  : 'border-gray-700'
                }
              `}
              aria-label={option.name}
            >
              <img 
                src={`https://flagcdn.com/w320/${option.code}.png`}
                alt={option.name}
                loading="eager"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all"></div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
