
import React, { useEffect, useState } from 'react';
import { User, GameMode, LeaderboardEntry, LeagueTier, ActivityLogEntry, NationDailyStats, NationPointsEntry } from '../types';
import { getLeaderboard, getCurrentSeasonId, getRecentActivity, getNationDailyStats, getNationTotalPoints } from '../services/storageService';
import { CUTOFFS } from '../services/leagueService';
import { EUROPEAN_COUNTRIES, COSMETICS_MAP } from '../constants';
import { AchievementsGuide } from './AchievementsGuide';

interface Props {
  currentUser: User | null;
  initialMode: GameMode | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onPlay: (mode: GameMode) => void;
  onViewLeaderboard: () => void;
  onViewSpecificLeaderboard: (mode: GameMode) => void;
  onLogout: () => void;
  onProfile: () => void;
}

const InstallGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    ✕
                </button>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    📲 Instalar App
                </h3>
                
                {isIOS ? (
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>Para instalar en iPhone/iPad:</p>
                        <ol className="list-decimal pl-4 space-y-2">
                            <li>Pulsa el botón <strong>Compartir</strong> <span className="text-blue-400 text-lg">⎋</span> en la barra inferior de Safari.</li>
                            <li>Desliza hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</li>
                            <li>Pulsa <strong>Añadir</strong> arriba a la derecha.</li>
                        </ol>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>Si no apareció el mensaje automático:</p>
                        <ul className="list-disc pl-4 space-y-2">
                            <li><strong>Android (Chrome):</strong> Pulsa los 3 puntos (⋮) arriba a la derecha y selecciona <em>"Instalar aplicación"</em>.</li>
                            <li><strong>PC (Chrome/Edge):</strong> Busca el icono de instalación (monitor con flecha) en la parte derecha de la barra de direcciones URL.</li>
                        </ul>
                    </div>
                )}
                
                <button 
                    onClick={onClose}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition"
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}

const DailyTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Current time in Madrid
      const madridTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
      
      const nextMidnight = new Date(madridTime);
      nextMidnight.setHours(24, 0, 0, 0);
      
      const diff = nextMidnight.getTime() - madridTime.getTime();
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-yellow-400 text-sm ml-2">
      {timeLeft}
    </span>
  );
};

const ActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

    useEffect(() => {
        // Enforce visual limit of 4 here as well
        setActivities(getRecentActivity().slice(0, 4));
    }, []);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    const formatDateShort = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    const getModeDisplayName = (mode: string) => {
        switch (mode) {
            case GameMode.COMPETITIVE_5: return '5 Banderas';
            case GameMode.COMPETITIVE: return '10 Banderas';
            case GameMode.COMPETITIVE_20: return '20 Banderas';
            case GameMode.DAILY_STANDARD: return 'Diario';
            case GameMode.DAILY_THEMATIC: return 'Temático';
            case GameMode.WEEKLY_LEAGUE: return 'Liga Semanal';
            case GameMode.NATIONS_LEAGUE: return 'Liga Naciones';
            default: return 'Clásico';
        }
    };

    if (activities.length === 0) return null;

    return (
        <div className="w-full bg-gray-900/50 rounded-xl border border-gray-800 p-4 h-full">
            <h4 className="text-gray-400 text-xs uppercase font-bold mb-3 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Actividad Reciente
            </h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {activities.map(log => (
                    <div key={log.id} className="text-sm bg-gray-800/50 p-2 rounded flex flex-col gap-1">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.type === 'WR' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'}`}>
                                    {log.type}
                                </span>
                                <span className="text-[10px] text-gray-500">{formatDateShort(log.timestamp)}</span>
                            </div>
                            <span className="font-mono text-emerald-400 font-bold">{formatTime(log.timeMs)}</span>
                         </div>
                         <div className="flex items-center gap-1 text-gray-300">
                            <img src={`https://flagcdn.com/w20/${log.countryCode}.png`} className="w-4 h-3 object-cover rounded shadow-sm" />
                            <span className="font-bold">{log.username}</span>
                            <span className="text-gray-500 text-xs">en</span>
                            <span className="text-emerald-400 font-bold text-xs capitalize">{getModeDisplayName(log.mode)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NationsLeaderboard: React.FC = () => {
    // ... (Keep existing NationsLeaderboard implementation same as previous step, just hiding it for brevity if not changed, but must include full file content in response)
    const [view, setView] = useState<'DAILY' | 'GENERAL'>('DAILY');
    const [dailyStats, setDailyStats] = useState<NationDailyStats[]>([]);
    const [pointsStats, setPointsStats] = useState<NationPointsEntry[]>([]);

    useEffect(() => {
        setDailyStats(getNationDailyStats());
        setPointsStats(getNationTotalPoints());
    }, [view]);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    const getCountryName = (code: string) => {
        const country = EUROPEAN_COUNTRIES.find(c => c.code === code);
        return country ? country.name : code.toUpperCase();
    }

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 h-full border border-gray-700/50 flex flex-col">
            <div className="flex justify-center gap-2 mb-4">
                 <button 
                   onClick={() => setView('DAILY')}
                   className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${view === 'DAILY' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                 >
                   Diaria (Top 5 Sum)
                 </button>
                 <button 
                   onClick={() => setView('GENERAL')}
                   className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${view === 'GENERAL' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                 >
                   General (Puntos)
                 </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar relative pr-2">
                {view === 'DAILY' ? (
                     dailyStats.length === 0 ? (
                        <div className="text-center text-gray-600 text-sm py-8">Ningún país ha puntuado hoy</div>
                     ) : (
                         <table className="w-full text-sm">
                             <thead className="text-xs text-gray-500 uppercase border-b border-gray-700">
                                 <tr>
                                     <th className="py-2 w-8">#</th>
                                     <th className="py-2 text-left">País</th>
                                     <th className="py-2 text-center">Reg.</th>
                                     <th className="py-2 text-right">Total</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {dailyStats.map((stat, idx) => (
                                     <tr key={stat.countryCode} className="border-b border-gray-800 last:border-0 text-gray-300">
                                         <td className="py-3 font-mono text-center text-orange-400 font-bold">{idx + 1}</td>
                                         <td className="py-3 flex items-center gap-2">
                                             <img src={`https://flagcdn.com/w20/${stat.countryCode}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm" />
                                             <span className="font-bold truncate max-w-[100px]">{getCountryName(stat.countryCode)}</span>
                                         </td>
                                         <td className="py-3 text-center">
                                             <span className={`${stat.contributingTimes < 5 ? 'text-red-400' : 'text-green-400'} font-bold`}>
                                                 {stat.contributingTimes}/5
                                             </span>
                                         </td>
                                         <td className="py-3 text-right font-mono font-bold text-white">
                                             {formatTime(stat.totalTimeMs)}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )
                ) : (
                    pointsStats.length === 0 ? (
                        <div className="text-center text-gray-600 text-sm py-8">Sin puntos acumulados</div>
                     ) : (
                         <table className="w-full text-sm">
                             <thead className="text-xs text-gray-500 uppercase border-b border-gray-700">
                                 <tr>
                                     <th className="py-2 w-8">#</th>
                                     <th className="py-2 text-left">País</th>
                                     <th className="py-2 text-right">Pts</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {pointsStats.map((entry, idx) => (
                                     <tr key={entry.countryCode} className="border-b border-gray-800 last:border-0 text-gray-300">
                                         <td className="py-3 font-mono text-center text-gray-500">{idx + 1}</td>
                                         <td className="py-3 flex items-center gap-2">
                                             <img src={`https://flagcdn.com/w20/${entry.countryCode}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm" />
                                             <span className="font-bold truncate max-w-[150px]">{getCountryName(entry.countryCode)}</span>
                                         </td>
                                         <td className="py-3 text-right font-mono font-bold text-yellow-400 text-lg">
                                             {entry.points}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )
                )}
            </div>
        </div>
    );
};

const MiniLeaderboard: React.FC<{ 
    mode: GameMode, 
    currentUserUsername?: string, 
    weeklyTier?: LeagueTier | 'Qualifying',
    cutoffPercentile?: number
}> = ({ mode, currentUserUsername, weeklyTier, cutoffPercentile }) => {
    
    // Switch to Special View for Nations League
    if (mode === GameMode.NATIONS_LEAGUE) {
        return <NationsLeaderboard />;
    }

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [cutoffIndex, setCutoffIndex] = useState<number>(-1);

    useEffect(() => {
        // Fetch Season data (or week data for league)
        const seasonId = getCurrentSeasonId();
        let data = getLeaderboard(mode, seasonId);

        if (mode === GameMode.WEEKLY_LEAGUE) {
           // For Weekly, we specifically want to calculate the cutoff based on ALL players in this mode
           const totalPlayers = data.length;
           if (cutoffPercentile && totalPlayers > 0) {
               const passing = Math.floor(totalPlayers * (cutoffPercentile));
               setCutoffIndex(passing - 1);
           }
        }
        
        // Show Top 50 for Weekly to see the line, Top 10 for Daily/Competitive
        const limit = mode === GameMode.WEEKLY_LEAGUE ? 50 : 20;
        setEntries(data.slice(0, limit));

    }, [mode, cutoffPercentile]);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 h-full border border-gray-700/50 flex flex-col">
            <h4 className="text-gray-400 text-xs uppercase font-bold mb-4 tracking-wider text-center">
                {mode === GameMode.WEEKLY_LEAGUE ? `Clasificación - ${weeklyTier}` : 'Top Mejores Tiempos (Temp. Actual)'}
            </h4>
            <div className="overflow-y-auto flex-1 custom-scrollbar relative pr-2">
                {entries.length === 0 ? (
                    <div className="text-center text-gray-600 text-sm py-8">Sin registros aún</div>
                ) : (
                    <table className="w-full text-sm">
                        <tbody>
                            {entries.map((entry, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className={`border-b border-gray-800 last:border-0 ${entry.username === currentUserUsername ? 'bg-blue-900/20 text-blue-300' : 'text-gray-300'}`}>
                                        <td className="py-3 w-8 text-center text-gray-500 font-mono">{idx + 1}</td>
                                        <td className="py-3 px-3 flex items-center gap-3">
                                            <img src={`https://flagcdn.com/w20/${entry.countryCode}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm" />
                                            <span className="truncate max-w-[120px] font-medium">{entry.username}</span>
                                        </td>
                                        <td className="py-3 text-right font-mono font-bold text-emerald-500 text-base">{formatTime(entry.timeMs)}</td>
                                    </tr>
                                    {/* Cutoff Line */}
                                    {mode === GameMode.WEEKLY_LEAGUE && idx === cutoffIndex && (
                                        <tr>
                                            <td colSpan={3} className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-px bg-red-500/50 flex-1"></div>
                                                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-900/20 px-2 py-1 rounded">Zona de Eliminación</span>
                                                    <div className="h-px bg-red-500/50 flex-1"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export const WelcomeScreen: React.FC<Props> = ({ 
  currentUser, 
  initialMode,
  onLoginClick, 
  onRegisterClick, 
  onPlay, 
  onViewLeaderboard,
  onViewSpecificLeaderboard,
  onLogout,
  onProfile
}) => {
  
  const [activeMenuMode, setActiveMenuMode] = useState<GameMode | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (initialMode) {
        setActiveMenuMode(initialMode);
    }
  }, [initialMode]);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    } else {
        // If no prompt available (iOS, Desktop already installed, etc), show guide
        setShowInstallGuide(true);
    }
  };

  // If showing guide, render it
  if (showGuide) {
      return <AchievementsGuide onClose={() => setShowGuide(false)} user={currentUser || undefined} />;
  }

  const todayStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }).split(',')[0];
  const isStandardDone = currentUser?.lastDailyStandard === todayStr;
  const isThematicDone = currentUser?.lastDailyThematic === todayStr;
  
  // Weekly Status
  const weeklyState = currentUser?.weeklyState;
  const isEliminated = weeklyState?.isEliminated;
  const currentWeeklyTier = weeklyState?.currentTier || 'Qualifying';
  const hasPlayedWeeklyToday = weeklyState?.bestTimeMs !== null && weeklyState?.bestTimeMs !== undefined;

  const handleModeClick = (mode: GameMode) => {
    setActiveMenuMode(mode);
  };

  const getDailyThemeName = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
      const day = now.getDay();
      switch(day) {
          case 1: return 'Asia';
          case 2: return 'África';
          case 3: return 'América';
          case 4: return 'Oceanía';
          case 5: return 'Caribe';
          case 6: return 'Más Poblados';
          case 0: return 'Mix Mundial';
          default: return 'Europa';
      }
  }

  const getModalTitle = () => {
      switch(activeMenuMode) {
          case GameMode.COMPETITIVE_5: return 'Modo Rápido';
          case GameMode.COMPETITIVE: return 'Modo Clásico';
          case GameMode.COMPETITIVE_20: return 'Modo Resistencia';
          case GameMode.DAILY_STANDARD: return 'Desafío Diario';
          case GameMode.DAILY_THEMATIC: return 'Modo Temático';
          case GameMode.WEEKLY_LEAGUE: return 'Liga Semanal';
          case GameMode.NATIONS_LEAGUE: return 'Liga de Naciones';
          default: return '';
      }
  }

  const getModalDescription = () => {
    switch(activeMenuMode) {
        case GameMode.COMPETITIVE_5: return '5 Banderas. Velocidad pura. Gana XP rápido.';
        case GameMode.COMPETITIVE: return '10 Banderas. El estándar competitivo.';
        case GameMode.COMPETITIVE_20: return '20 Banderas. Demuestra tu consistencia.';
        case GameMode.DAILY_STANDARD: return '10 Banderas. Un intento al día. ¿Puedes ser el más rápido?';
        case GameMode.DAILY_THEMATIC: return `Hoy toca: ${getDailyThemeName()}. Un giro especial a las reglas.`;
        case GameMode.WEEKLY_LEAGUE: return 'Sobrevive día a día. Los tiempos más lentos son eliminados.';
        case GameMode.NATIONS_LEAGUE: return 'Tu país te necesita. Suma tus tiempos para el ranking diario nacional.';
        default: return '';
    }
  }

  const isPlayDisabled = () => {
      if (activeMenuMode === GameMode.WEEKLY_LEAGUE) return isEliminated;
      return false;
  }

  const getButtonText = () => {
    if (activeMenuMode === GameMode.WEEKLY_LEAGUE && isEliminated) return 'ELIMINADO';
    if (activeMenuMode === GameMode.WEEKLY_LEAGUE && hasPlayedWeeklyToday) return 'Mejorar Tiempo Semanal';
    if (activeMenuMode === GameMode.NATIONS_LEAGUE) return 'Contribuir al País';
    
    // For Daily modes, allow retry
    if (activeMenuMode === GameMode.DAILY_STANDARD && isStandardDone) return 'Mejorar Tiempo';
    if (activeMenuMode === GameMode.DAILY_THEMATIC && isThematicDone) return 'Mejorar Tiempo';
    
    return 'JUGAR AHORA';
  }

  const getModeColor = () => {
      switch(activeMenuMode) {
          case GameMode.COMPETITIVE_5: return 'from-blue-400 to-indigo-500';
          case GameMode.COMPETITIVE: return 'from-blue-600 to-indigo-700';
          case GameMode.COMPETITIVE_20: return 'from-blue-800 to-indigo-900';
          case GameMode.WEEKLY_LEAGUE: return 'from-purple-600 to-pink-700';
          case GameMode.DAILY_STANDARD: return 'from-emerald-600 to-teal-700';
          case GameMode.DAILY_THEMATIC: return 'from-pink-600 to-rose-700';
          case GameMode.NATIONS_LEAGUE: return 'from-orange-600 to-red-700';
          default: return 'from-gray-600 to-gray-700';
      }
  }

  // Cosmetics Lookup for Profile Card
  const frameId = currentUser?.equippedCosmetics?.frameId;
  const frameClass = (frameId && COSMETICS_MAP[frameId]) ? COSMETICS_MAP[frameId].css : 'border-4 border-gray-700';
  
  const nameStyleId = currentUser?.equippedCosmetics?.nameStyleId;
  const nameClass = (nameStyleId && COSMETICS_MAP[nameStyleId]) ? COSMETICS_MAP[nameStyleId].css : 'text-white';


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4 py-8 relative">
      
      {/* Install Guide Modal */}
      {showInstallGuide && <InstallGuideModal onClose={() => setShowInstallGuide(false)} />}

      {/* Persistent Install Button (Always visible) */}
      <button 
          onClick={handleInstallClick}
          className="fixed top-4 right-4 z-40 font-bold py-2 px-4 rounded-full shadow-lg border border-white/20 hover:scale-105 transition flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
          title="Instalar Aplicación"
      >
          <span>📥</span>
          <span className="hidden sm:inline">Instalar App</span>
      </button>

      {/* Full Screen Mode Menu */}
      {activeMenuMode && (
        <div className="fixed inset-0 z-50 bg-gray-900 animate-fade-in flex flex-col">
            {/* ... (Keep inner content of modal largely same, just abbreviated for prompt limit) ... */}
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-20">
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setActiveMenuMode(null)}
                        className="text-gray-400 hover:text-white transition"
                     >
                        ← Volver
                     </button>
                     <h2 className="text-2xl font-bold text-white">{getModalTitle()}</h2>
                 </div>
                 <div className="text-sm text-gray-400 font-mono">
                     <DailyTimer />
                 </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center items-start bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${getModeColor()} opacity-10 pointer-events-none`}></div>
                    <div className="relative z-10 max-w-lg">
                        <h3 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                            {getModalDescription()}
                        </h3>
                        
                        <div className="space-y-6 mt-8">
                            {activeMenuMode === GameMode.WEEKLY_LEAGUE && !isEliminated && (
                                <div className="p-4 bg-gray-800/80 border border-gray-700 rounded-xl backdrop-blur-sm">
                                    <div className="text-purple-300 text-xs uppercase font-bold tracking-wider mb-1">Tu Estado</div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {currentWeeklyTier === 'Qualifying' ? 'Fase Clasificatoria' : `División ${currentWeeklyTier}`}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {hasPlayedWeeklyToday ? '✅ Tiempo registrado hoy' : '⚠️ No has jugado hoy'}
                                    </div>
                                </div>
                            )}

                             <button 
                                onClick={() => {
                                    if (!isPlayDisabled()) {
                                        onPlay(activeMenuMode);
                                    }
                                }}
                                disabled={isPlayDisabled()}
                                className={`
                                    group w-full py-5 px-8 rounded-2xl font-black text-xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3
                                    ${isPlayDisabled()
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                        : `bg-gradient-to-r ${getModeColor()} text-white hover:brightness-110`
                                    }
                                `}
                            >
                                <span>{getButtonText()}</span>
                                {!isPlayDisabled() && <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/2 bg-gray-900 p-6 md:p-8 flex flex-col border-l border-gray-800">
                    <MiniLeaderboard 
                        mode={activeMenuMode} 
                        currentUserUsername={currentUser?.username} 
                        weeklyTier={currentWeeklyTier}
                        cutoffPercentile={activeMenuMode === GameMode.WEEKLY_LEAGUE ? CUTOFFS[currentWeeklyTier] : undefined}
                    />
                </div>
            </div>
        </div>
      )}

      <div className="w-full max-w-6xl text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 mb-2">
          FlagDash
        </h1>
        <p className="text-gray-400 mb-8 text-xl">Liga Europea</p>
        
        {currentUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
             
             {/* Left Column (2/3): Profile & Buttons */}
             <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                 <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition" onClick={onProfile}>
                     <div className="relative">
                        <img 
                          src={`https://flagcdn.com/w80/${currentUser.countryCode}.png`}
                          alt="Flag"
                          // Apply Frame if exists
                          className={`h-16 w-16 md:h-20 md:w-20 object-cover rounded-full shadow-lg ${frameClass}`}
                        />
                     </div>
                     <div className="text-left">
                       <h2 className={`text-2xl font-bold ${nameClass}`}>{currentUser.username}</h2>
                       <div className="text-blue-400 font-bold text-sm uppercase tracking-wider">
                         Nivel {currentUser.level || 1}
                       </div>
                     </div>
                   </div>
                   <div className="flex gap-2 w-full md:w-auto">
                        {/* Guide Button */}
                        <button 
                            onClick={() => setShowGuide(true)}
                            className="flex-1 md:flex-none px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 rounded-lg text-sm font-semibold transition border border-purple-800"
                        >
                            📖 Misiones
                        </button>
                       <button 
                        onClick={onProfile}
                        className="flex-1 md:flex-none px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 rounded-lg text-sm font-semibold transition border border-blue-800"
                      >
                        👤 Perfil
                      </button>
                      <button 
                        onClick={onViewLeaderboard}
                        className="flex-1 md:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition"
                      >
                        🏆 Ranking
                      </button>
                      <button 
                        onClick={onLogout}
                        className="flex-1 md:flex-none px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-lg text-sm font-semibold transition"
                      >
                        Salir
                      </button>
                   </div>
                 </div>

                 {/* Game Modes Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Row 1: Competitive Modes - 5, 10, 20 Flags */}
                    <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3">
                         {/* 5 Flags */}
                        <button 
                            onClick={() => onPlay(GameMode.COMPETITIVE_5)}
                            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-lg transform transition hover:scale-[1.02] text-left border border-blue-400/30"
                        >
                            <h3 className="text-lg font-bold text-white leading-tight">5 Banderas</h3>
                            <p className="text-blue-100 text-xs mt-1">Modo Rápido</p>
                        </button>

                        {/* 10 Flags (Standard) */}
                        <button 
                            onClick={() => onPlay(GameMode.COMPETITIVE)}
                            className="group relative overflow-hidden bg-gradient-to-br from-blue-700 to-indigo-800 p-4 rounded-xl shadow-lg transform transition hover:scale-[1.02] text-left border border-blue-500/30"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-white leading-tight">10 Banderas</h3>
                            </div>
                            <p className="text-blue-100 text-xs mt-1">Modo Clásico</p>
                        </button>

                        {/* 20 Flags */}
                        <button 
                            onClick={() => onPlay(GameMode.COMPETITIVE_20)}
                            className="group relative overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-950 p-4 rounded-xl shadow-lg transform transition hover:scale-[1.02] text-left border border-blue-600/30"
                        >
                            <h3 className="text-lg font-bold text-white leading-tight">20 Banderas</h3>
                            <p className="text-blue-200 text-xs mt-1">Resistencia</p>
                        </button>
                    </div>

                     {/* Row 2 Left: WEEKLY LEAGUE */}
                     <button 
                      onClick={() => handleModeClick(GameMode.WEEKLY_LEAGUE)}
                      disabled={isEliminated}
                      className={`
                        col-span-1 relative overflow-hidden p-6 rounded-2xl shadow-lg transform transition text-left border
                        ${isEliminated 
                           ? 'bg-gray-800 border-red-900/50 cursor-not-allowed opacity-75' 
                           : 'bg-gradient-to-r from-purple-800 to-pink-800 hover:scale-[1.01] border-purple-500/30'
                        }
                      `}
                    >
                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                             Liga Semanal
                             {isEliminated && <span className="text-xs bg-red-600 px-2 py-1 rounded">X</span>}
                          </h3>
                          {!isEliminated && (
                             <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-1 rounded border border-yellow-500/30">
                                {currentWeeklyTier === 'Qualifying' ? 'Clasif.' : `Div. ${currentWeeklyTier}`}
                             </span>
                          )}
                        </div>
                        <p className="text-purple-100 text-xs mb-2">
                            {isEliminated ? 'Suerte la próxima semana.' : 'Competición Sábado a Sábado.'}
                        </p>
                        {!isEliminated && (
                            <div className="text-xs text-purple-300 flex flex-col gap-1">
                               <div className="flex items-center">
                                  <span className="opacity-75 mr-2">Hoy:</span>
                                  {hasPlayedWeeklyToday 
                                    ? <span className="text-green-400 font-bold">✓ Hecho</span> 
                                    : <span className="text-yellow-400 font-bold">⚠ Pendiente</span>
                                  }
                               </div>
                            </div>
                        )}
                      </div>
                    </button>

                    {/* Row 2 Right: NATIONS LEAGUE */}
                    <button 
                      onClick={() => handleModeClick(GameMode.NATIONS_LEAGUE)}
                      className="col-span-1 group relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-700 p-6 rounded-2xl shadow-lg transform transition hover:scale-[1.01] text-left border border-orange-500/30"
                    >
                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                             Liga de Naciones
                          </h3>
                          <span className="bg-orange-500/20 text-orange-200 text-xs px-2 py-1 rounded border border-orange-500/30">
                            Diario
                          </span>
                        </div>
                        <p className="text-orange-100 text-xs">Ayuda a tu país sumando tiempos. 5 mejores cuentan.</p>
                      </div>
                    </button>

                    {/* Row 3 Left: Daily Standard */}
                    <button 
                      onClick={() => handleModeClick(GameMode.DAILY_STANDARD)}
                      className={`
                        relative bg-gray-800 p-6 rounded-2xl border transition text-left hover:bg-gray-750 border-emerald-500/50 shadow-emerald-900/20 shadow-lg hover:scale-[1.02]
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-emerald-400 font-bold tracking-wider text-xs uppercase">Desafío Diario</span>
                        {isStandardDone && <span className="text-green-500 text-lg">✓</span>}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Diario</h3>
                      <p className="text-gray-400 text-xs mb-3">10 banderas fijas.</p>
                    </button>

                    {/* Row 3 Right: Daily Thematic */}
                    <button 
                      onClick={() => handleModeClick(GameMode.DAILY_THEMATIC)}
                      className={`
                        relative bg-gray-800 p-6 rounded-2xl border transition text-left hover:bg-gray-750 border-pink-500/50 shadow-pink-900/20 shadow-lg hover:scale-[1.02]
                      `}
                    >
                       <div className="flex justify-between items-start mb-2">
                        <span className="text-pink-400 font-bold tracking-wider text-xs uppercase">Especial</span>
                        {isThematicDone && <span className="text-green-500 text-lg">✓</span>}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Temático</h3>
                      <p className="text-pink-100 text-xs mb-3">
                          Hoy: <span className="font-bold">{getDailyThemeName()}</span>
                      </p>
                    </button>
                 </div>
             </div>

             {/* Right Column (1/3): Activity Feed */}
             <div className="lg:col-span-1 h-full">
                 <ActivityFeed />
             </div>
          </div>
        ) : (
          // Guest View
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-6">
              <h3 className="text-xl font-bold text-white mb-2">¡Compite en la Liga!</h3>
              <p className="text-gray-400 text-sm">Regístrate para guardar tu progreso, subir de nivel y coleccionar medallas.</p>
            </div>
            
            {/* Download Button for Guest */}
            <button 
              onClick={handleInstallClick}
              className="w-full font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white"
            >
              <span>📲</span> Descargar App
            </button>

            <button 
              onClick={onLoginClick}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg transform transition hover:scale-[1.02]"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={onRegisterClick}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg transform transition hover:scale-[1.02]"
            >
              Registrarse
            </button>
             <div className="h-64 mt-8">
                 <ActivityFeed />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
