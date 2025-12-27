
import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, GameMode, GameResultSummary } from '../types';
import { getRecordBadges, getGlobalRecords, getPlayerDynamicMedals, getLeaderboard, getCurrentSeasonId } from '../services/storageService';
import { COSMETICS_MAP } from '../constants';

interface Props {
  entries: LeaderboardEntry[];
  currentEntryId?: string; 
  onHome: () => void;
  onPlayAgain: () => void;
  forcedMode?: GameMode; 
  initialTab?: GameMode;
  lastGameResult?: GameResultSummary;
  onViewPlayerProfile: (username: string) => void;
}

const MatchReport: React.FC<{ result: GameResultSummary }> = ({ result }) => {
    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    const formatDiff = (diff: number | null) => {
        if (diff === null) return <span className="text-gray-500 text-xs">--</span>;
        const sign = diff > 0 ? '+' : '';
        const sec = (diff / 1000).toFixed(3);
        const color = diff <= 0 ? 'text-green-400' : 'text-red-400';
        return <span className={`${color} font-mono font-bold text-sm`}>{sign}{sec}s</span>;
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border border-gray-700 animate-fade-in-down">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest font-bold text-center mb-4">Informe de Partida</h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Main Time & Rank */}
                <div className="text-center md:text-left">
                    <div className="text-5xl font-mono font-black text-white mb-2 tabular-nums tracking-tighter">
                        {formatTime(result.timeMs)}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                         <div className="bg-gray-800 px-3 py-1 rounded-lg border border-gray-600">
                             <span className="text-gray-400 text-xs mr-2">POSICIÓN</span>
                             <span className="text-blue-300 font-bold">#{result.rank}</span>
                         </div>
                         {(result.rank > 100 && result.percentile) && (
                             <div className="bg-gray-800 px-3 py-1 rounded-lg border border-gray-600">
                                <span className="text-gray-400 text-xs mr-2">TOP</span>
                                <span className="text-purple-300 font-bold">{result.percentile}%</span>
                             </div>
                         )}
                    </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full md:w-auto bg-gray-800/50 p-4 rounded-xl">
                     {(result.diffs.wr !== null || result.badges.includes('WR')) && (
                     <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 font-bold uppercase">Mundial (WR)</span>
                         <div className="flex items-center gap-2">
                             {result.badges.includes('WR') ? <span className="text-yellow-400 text-xs font-bold">¡NUEVO!</span> : formatDiff(result.diffs.wr)}
                         </div>
                     </div>
                     )}
                     
                     {(result.diffs.nr !== null || result.badges.includes('NR')) && (
                     <div className="flex flex-col text-right">
                         <span className="text-[10px] text-gray-500 font-bold uppercase">Nacional (NR)</span>
                         <div className="flex items-center justify-end gap-2">
                            {result.badges.includes('NR') ? <span className="text-blue-400 text-xs font-bold">¡NUEVO!</span> : formatDiff(result.diffs.nr)}
                         </div>
                     </div>
                     )}

                     <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 font-bold uppercase">Personal (PB)</span>
                         <div className="flex items-center gap-2">
                            {result.badges.includes('PB') ? <span className="text-green-400 text-xs font-bold">¡NUEVO!</span> : formatDiff(result.diffs.pb)}
                         </div>
                     </div>
                     <div className="flex flex-col text-right">
                         <span className="text-[10px] text-gray-500 font-bold uppercase">Temporada (SB)</span>
                         <div className="flex items-center justify-end gap-2">
                             {result.badges.includes('SB') ? <span className="text-purple-400 text-xs font-bold">¡NUEVO!</span> : formatDiff(result.diffs.sb)}
                         </div>
                     </div>
                </div>
            </div>
        </div>
    )
}

export const LeaderboardScreen: React.FC<Props> = ({ entries, currentEntryId, onHome, onPlayAgain, forcedMode, initialTab, lastGameResult, onViewPlayerProfile }) => {
  const [activeTab, setActiveTab] = useState<GameMode>(forcedMode || initialTab || GameMode.COMPETITIVE);
  const [viewScope, setViewScope] = useState<'SEASON' | 'ALL_TIME'>('SEASON');
  const [displayedEntries, setDisplayedEntries] = useState<LeaderboardEntry[]>(entries);

  // Fetch Logic handles switching between props (initial/forced) and internal fetching (All Time)
  useEffect(() => {
      // If forced mode (e.g. from end screen or specific leaderboards like Weekly/Daily), rely on parent props predominantly
      // but if user switches scope, we need to fetch.
      // However, for simplicity, if forcedMode is set, we disable the scope toggle visually, so we just use entries.
      if (forcedMode) {
          setDisplayedEntries(entries);
          return;
      }

      // If in standard modes, we handle fetching based on scope
      const seasonId = viewScope === 'SEASON' ? getCurrentSeasonId() : undefined;
      // Fetch fresh data
      const data = getLeaderboard(activeTab, seasonId);
      setDisplayedEntries(data);

  }, [forcedMode, entries, activeTab, viewScope]);


  const globalRecords = getGlobalRecords();

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const formatDate = (timestamp: number) => {
      // Horizontal format: DD/MM/YYYY HH:MM
      const d = new Date(timestamp);
      return d.toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit' 
      }).replace(',', '');
  };

  const getTitle = () => {
    if (forcedMode === GameMode.DAILY_STANDARD) return "Clasificación Diario";
    if (forcedMode === GameMode.DAILY_THEMATIC) return "Clasificación Temático";
    if (forcedMode === GameMode.WEEKLY_LEAGUE) return "Clasificación Liga Semanal";
    if (forcedMode === GameMode.NATIONS_LEAGUE) return "Clasificación Liga de Naciones";
    
    // Standard Modes
    if (viewScope === 'ALL_TIME') return "Récords Históricos (All-Time)";
    return "Top 100 - Temporada Actual";
  }

  const getHomeButtonText = () => {
      if (forcedMode === GameMode.NATIONS_LEAGUE) return "Volver a Liga de Naciones";
      if (forcedMode) return "Volver al Menú";
      return "Menú Principal";
  }

  // Logic to show MatchReport for Competitive Modes
  const shouldShowReport = lastGameResult && (activeTab === GameMode.COMPETITIVE || activeTab === GameMode.COMPETITIVE_5 || activeTab === GameMode.COMPETITIVE_20);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto w-full p-4 flex-1 flex flex-col">
        
        {shouldShowReport && <MatchReport result={lastGameResult} />}

        <div className="text-center py-4 relative">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-1">
            {getTitle()}
          </h2>
          <p className="text-gray-400 text-xs">
            {forcedMode ? 'Resultados de tu Partida' : (viewScope === 'SEASON' ? 'Ranking Mensual' : 'Mejores tiempos globales')}
          </p>

          {/* Scope Toggle - Only for standard competitive modes */}
          {!forcedMode && (
              <div className="mt-4 flex justify-center">
                  <div className="bg-gray-800 p-1 rounded-lg inline-flex border border-gray-700">
                      <button
                          onClick={() => setViewScope('SEASON')}
                          className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition ${viewScope === 'SEASON' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                      >
                          Temporada
                      </button>
                      <button
                          onClick={() => setViewScope('ALL_TIME')}
                          className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition ${viewScope === 'ALL_TIME' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                      >
                          Histórico Global
                      </button>
                  </div>
              </div>
          )}
        </div>

        {/* Tabs - Only show if not in a forced specific mode */}
        {!forcedMode && (
          <div className="flex justify-center gap-2 mb-6 flex-wrap mt-2">
            <button
              onClick={() => setActiveTab(GameMode.COMPETITIVE_5)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === GameMode.COMPETITIVE_5 ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              5 Banderas
            </button>
            <button
              onClick={() => setActiveTab(GameMode.COMPETITIVE)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === GameMode.COMPETITIVE ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              10 Banderas
            </button>
            <button
              onClick={() => setActiveTab(GameMode.COMPETITIVE_20)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === GameMode.COMPETITIVE_20 ? 'bg-blue-700 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              20 Banderas
            </button>
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex-1 mb-6 flex flex-col">
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium w-full">Jugador</th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                       Aún no hay registros en esta categoría.
                     </td>
                   </tr>
                ) : (
                  displayedEntries.map((entry, index) => {
                    const badges = getRecordBadges(entry.mode, entry.countryCode, entry.timeMs);
                    
                    // Apply Name Style Class from entry data (if equipped)
                    const nameStyleClass = entry.equippedCosmetics?.nameStyleId 
                        ? COSMETICS_MAP[entry.equippedCosmetics.nameStyleId]?.css 
                        : 'text-gray-200';

                    return (
                    <tr 
                      key={entry.id} 
                      className={`
                        border-b border-gray-700/50 last:border-0 hover:bg-gray-700/50 transition
                        ${entry.id === currentEntryId ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''}
                      `}
                    >
                      <td className="px-4 py-3 font-mono text-gray-400 w-12">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={`https://flagcdn.com/w20/${entry.countryCode}.png`}
                            alt={entry.countryCode}
                            className="h-4 w-6 object-cover rounded shadow-sm"
                          />
                          <div className="flex flex-col">
                             <span 
                                onClick={() => onViewPlayerProfile(entry.username)}
                                className={`font-medium flex items-center gap-2 cursor-pointer hover:underline ${nameStyleClass}`}
                             >
                                {entry.username}
                             </span>
                             <span className="text-[10px] text-gray-500 uppercase tracking-wide flex gap-1">
                                Nivel {entry.level || 1}
                             </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell whitespace-nowrap">
                          <span className="text-xs text-gray-500 font-mono">
                              {formatDate(entry.timestamp)}
                          </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {badges.includes('WR') && (
                               <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] font-bold px-1.5 py-0.5 rounded">WR</span>
                           )}
                           {badges.includes('NR') && (
                               <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 text-[10px] font-bold px-1.5 py-0.5 rounded">NR</span>
                           )}
                           <span className="font-mono font-bold text-emerald-400 tabular-nums">
                              {formatTime(entry.timeMs)}
                           </span>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <button
            onClick={onHome}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
          >
            {getHomeButtonText()}
          </button>
          {!forcedMode && (
             <button
               onClick={onPlayAgain}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg transition"
             >
               {activeTab === GameMode.COMPETITIVE ? 'Jugar Clásico' : 'Volver a Jugar'}
             </button>
          )}
          {forcedMode && (
              <button
                onClick={onPlayAgain}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg transition"
              >
                Jugar de Nuevo
              </button>
          )}
        </div>
      </div>
    </div>
  );
};
