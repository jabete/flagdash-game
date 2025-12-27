
import React, { useState } from 'react';
import { User, AchievementEntry, GameMode, EquippedCosmetics } from '../types';
import { updateUserStats } from '../services/authService';
import { getPlayerDynamicMedals } from '../services/storageService';
import { COSMETICS_MAP, ACHIEVEMENTS } from '../constants';
import { Medal } from './Medal';

interface Props {
  user: User;
  isMe?: boolean;
  onClose: () => void;
  onUpdateUser: (u: User) => void;
}

export const ProfileScreen: React.FC<Props> = ({ user, isMe = false, onClose, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'COSMETICS'>('STATS');

  const formatTime = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return '--:--.--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'short',
          year: 'numeric'
      });
  };

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

  const handleEquip = (type: keyof EquippedCosmetics, id: string) => {
      const newEquipped = { ...user.equippedCosmetics, [type]: id };
      const result = updateUserStats(user.username, { equippedCosmetics: newEquipped });
      if (result) onUpdateUser(result.user);
  };

  const handleUnequip = (type: keyof EquippedCosmetics) => {
      const newEquipped = { ...user.equippedCosmetics };
      delete newEquipped[type];
      const result = updateUserStats(user.username, { equippedCosmetics: newEquipped });
      if (result) onUpdateUser(result.user);
  };

  // Progress to next level
  const xpForNext = user.level * 500;
  const progress = (user.xp % 500) / 500 * 100;

  // Combine Permanent Medals (League) with Dynamic Medals (WR/Daily)
  const dynamicMedals = getPlayerDynamicMedals(user.username);
  const allMedals = [...dynamicMedals, ...(user.medals || [])];

  // Organize Achievements Logic for History Sorting
  const getSortedAchievements = () => {
      const list = [...(user.achievements || [])];
      return list.sort((a, b) => {
          // 1. Sort by Timestamp Descending
          if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
          
          // 2. Sort Order when timestamp matches: NR then WR
          const getPriority = (type: string) => {
              if (type === 'NR') return 1;
              if (type === 'WR') return 2;
              return 99;
          };
          
          return getPriority(a.type) - getPriority(b.type);
      });
  };

  const achievementsList = getSortedAchievements();
  const statsModes = [GameMode.COMPETITIVE_5, GameMode.COMPETITIVE, GameMode.COMPETITIVE_20];
  
  // Unlocked items logic
  const unlockedIds = user.unlockedCosmetics || [];
  const frames = ACHIEVEMENTS.filter(a => a.rewardType === 'FRAME' && unlockedIds.includes(a.rewardId));
  const banners = ACHIEVEMENTS.filter(a => a.rewardType === 'BANNER' && unlockedIds.includes(a.rewardId));
  const names = ACHIEVEMENTS.filter(a => a.rewardType === 'NAME_STYLE' && unlockedIds.includes(a.rewardId));

  // --- CSS Lookup Logic ---
  const bannerId = user.equippedCosmetics?.bannerId;
  const bannerClass = (bannerId && COSMETICS_MAP[bannerId]) ? COSMETICS_MAP[bannerId].css : 'bg-gradient-to-r from-blue-900 to-indigo-900';
  
  const frameId = user.equippedCosmetics?.frameId;
  const frameClass = (frameId && COSMETICS_MAP[frameId]) ? COSMETICS_MAP[frameId].css : 'border-4 border-gray-800';
  
  const nameStyleId = user.equippedCosmetics?.nameStyleId;
  const nameClass = (nameStyleId && COSMETICS_MAP[nameStyleId]) ? COSMETICS_MAP[nameStyleId].css : 'text-white';

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <button 
          onClick={onClose}
          className="mb-6 text-gray-500 hover:text-white flex items-center gap-2 transition"
        >
          ← Volver
        </button>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Banner */}
          <div className={`h-32 relative ${bannerClass}`}>
             <div className="absolute -bottom-10 left-8">
               <img 
                 src={`https://flagcdn.com/w80/${user.countryCode}.png`}
                 alt="Flag"
                 className={`h-24 w-24 object-cover rounded-full shadow-xl bg-gray-800 ${frameClass}`}
               />
             </div>
          </div>

          <div className="pt-12 px-8 pb-8">
            {/* User Info */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className={`text-3xl font-bold flex items-center gap-2 ${nameClass}`}>
                  {user.username}
                </h1>
                <p className="text-blue-400 font-semibold">Nivel {user.level}</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-white">{user.totalGames}</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">Partidas</span>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mb-6">
               <div className="flex justify-between text-xs text-gray-400 mb-1">
                 <span>XP: {user.xp}</span>
                 <span>Siguiente Nivel: {user.level * 500}</span>
               </div>
               <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                 <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
               </div>
            </div>

            {/* Tabs */}
            {isMe && (
                <div className="flex gap-4 border-b border-gray-700 mb-6">
                    <button 
                        onClick={() => setActiveTab('STATS')}
                        className={`pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'STATS' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Estadísticas
                    </button>
                    <button 
                        onClick={() => setActiveTab('COSMETICS')}
                        className={`pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'COSMETICS' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Personalizar
                    </button>
                </div>
            )}

            {activeTab === 'STATS' ? (
                <>
                    {/* Personal Stats (PB/SB) */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Mejores Tiempos</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {statsModes.map(mode => {
                                const records = user.records?.[mode];
                                return (
                                    <div key={mode} className="bg-gray-700/30 rounded-xl p-3 border border-gray-700">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">{getModeDisplayName(mode)}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-emerald-500 font-bold">PB</span>
                                                <span className="font-mono text-sm text-white font-bold">{formatTime(records?.pb)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-purple-500 font-bold">SB</span>
                                                <span className="font-mono text-sm text-gray-300">{formatTime(records?.sb)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Medals Case */}
                    <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Vitrina de Trofeos</h3>
                    {allMedals.length === 0 ? (
                        <div className="bg-gray-900/50 p-6 rounded-xl border border-dashed border-gray-700 text-center">
                            <p className="text-gray-500 text-sm italic mb-2">Vitrina vacía</p>
                            <p className="text-xs text-gray-600">Consigue medallas ganando Ligas Semanales, Desafíos Diarios o batiendo Récords Mundiales.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                        {allMedals.map((medal, idx) => (
                            <div key={idx} className="flex justify-center items-center p-2">
                                <Medal type={medal} size="lg" />
                            </div>
                        ))}
                        </div>
                    )}
                    </div>

                    {/* Achievements History */}
                    <div>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Historial de Récords y Logros</h3>
                    
                    {achievementsList.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Sin historial registrado aún.</p>
                    ) : (
                        <div className="space-y-3">
                            {achievementsList.map((ach) => {
                                let MedalIcon = <span className="text-2xl">🚩</span>;
                                let title = 'Logro';
                                let colorClass = 'text-gray-400';
                                let bgClass = 'bg-gray-800';

                                if (ach.type === 'WR') {
                                    MedalIcon = <Medal type={`MEDAL_WR_${ach.mode === GameMode.COMPETITIVE_5 ? '5' : ach.mode === GameMode.COMPETITIVE_20 ? '20' : '10'}`} size="md" />;
                                    title = 'Récord Mundial';
                                    colorClass = 'text-yellow-400';
                                    bgClass = 'bg-yellow-900/10 border-yellow-500/30';
                                } else if (ach.type === 'NR') {
                                    // Make NR slightly less flashy than WR
                                    MedalIcon = <div className="w-10 h-10 flex items-center justify-center text-xl bg-blue-900/50 rounded-full border border-blue-500 shadow-sm">🏳️</div>;
                                    title = 'Récord Nacional';
                                    colorClass = 'text-blue-400';
                                    bgClass = 'bg-blue-900/10 border-blue-500/30';
                                } else if (ach.type === 'LEAGUE_WIN') {
                                    MedalIcon = <Medal type={ach.detail || ''} size="md" />;
                                    title = 'Victoria de Liga';
                                    colorClass = 'text-purple-400';
                                    bgClass = 'bg-purple-900/10 border-purple-500/30';
                                } else if (ach.type === 'DAILY_WIN') {
                                    MedalIcon = <Medal type={`MEDAL_${ach.detail?.toUpperCase()}_WIN`} size="md" />;
                                    title = 'Ganador Diario';
                                    colorClass = 'text-emerald-400';
                                    bgClass = 'bg-emerald-900/10 border-emerald-500/30';
                                }

                                return (
                                    <div key={ach.id} className={`p-3 rounded-lg border flex items-center gap-3 ${bgClass}`}>
                                        <div className="flex-shrink-0">{MedalIcon}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <span className={`font-bold text-sm ${colorClass}`}>
                                                    {title}
                                                </span>
                                                <span className="text-xs text-gray-500">{formatDate(ach.timestamp)}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {ach.type === 'WR' || ach.type === 'NR' ? (
                                                    <>Establecido en <span className="text-gray-300 font-semibold">{getModeDisplayName(ach.mode!)}</span> con <span className="font-mono text-emerald-400">{formatTime(ach.timeMs)}</span></>
                                                ) : ach.type === 'LEAGUE_WIN' ? (
                                                    <>Completado en División <span className="font-bold text-white">{ach.detail}</span></>
                                                ) : (
                                                    <>Ganador del Desafío <span className="font-bold text-white">{ach.detail}</span></>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </div>
                </>
            ) : (
                <div className="animate-fade-in">
                    <h3 className="text-lg font-bold text-white mb-2">Marcos de Avatar</h3>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <button 
                            onClick={() => handleUnequip('frameId')}
                            className={`p-2 rounded-lg border flex flex-col items-center justify-center aspect-square ${!user.equippedCosmetics?.frameId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                        >
                             <div className="w-10 h-10 rounded-full bg-gray-600 border-4 border-gray-500"></div>
                             <p className="text-[10px] text-center mt-2 text-gray-400">Predeterminado</p>
                        </button>
                        {frames.map(f => {
                             const css = COSMETICS_MAP[f.rewardId]?.css || '';
                             return (
                                <button 
                                    key={f.id}
                                    onClick={() => handleEquip('frameId', f.rewardId)}
                                    className={`p-2 rounded-lg border flex flex-col items-center justify-center aspect-square ${user.equippedCosmetics?.frameId === f.rewardId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full bg-gray-700 ${css}`}></div>
                                    <p className="text-[10px] text-center mt-2 text-gray-400 truncate w-full">{COSMETICS_MAP[f.rewardId]?.name}</p>
                                </button>
                            );
                        })}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">Banners de Perfil</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => handleUnequip('bannerId')}
                            className={`p-2 rounded-lg border ${!user.equippedCosmetics?.bannerId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                        >
                             <div className="h-12 w-full bg-gradient-to-r from-blue-900 to-indigo-900 rounded mb-2"></div>
                             <p className="text-[10px] text-center text-gray-400">Predeterminado</p>
                        </button>
                        {banners.map(b => {
                            const css = COSMETICS_MAP[b.rewardId]?.css || '';
                            return (
                                <button 
                                    key={b.id}
                                    onClick={() => handleEquip('bannerId', b.rewardId)}
                                    className={`p-2 rounded-lg border ${user.equippedCosmetics?.bannerId === b.rewardId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                                >
                                    <div className={`h-12 w-full rounded mb-2 ${css}`}></div>
                                    <p className="text-[10px] text-center text-gray-400 truncate">{COSMETICS_MAP[b.rewardId]?.name}</p>
                                </button>
                            );
                        })}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">Estilo de Nombre</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                         <button 
                            onClick={() => handleUnequip('nameStyleId')}
                            className={`p-2 rounded-lg border ${!user.equippedCosmetics?.nameStyleId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                        >
                             <span className="text-white font-bold text-lg">Nombre Normal</span>
                             <p className="text-[10px] text-center mt-1 text-gray-400">Predeterminado</p>
                        </button>
                        {names.map(n => {
                             const css = COSMETICS_MAP[n.rewardId]?.css || '';
                             return (
                                <button 
                                    key={n.id}
                                    onClick={() => handleEquip('nameStyleId', n.rewardId)}
                                    className={`p-2 rounded-lg border ${user.equippedCosmetics?.nameStyleId === n.rewardId ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}
                                >
                                    <span className={`font-bold text-lg ${css}`}>Nombre Estilo</span>
                                    <p className="text-[10px] text-center mt-1 text-gray-400 truncate">{COSMETICS_MAP[n.rewardId]?.name}</p>
                                </button>
                            );
                        })}
                    </div>

                    {unlockedIds.length === 0 && (
                        <p className="text-center text-gray-500 text-sm italic mt-8">
                            Juega y cumple logros para desbloquear cosméticos. Consulta la Guía en el menú.
                        </p>
                    )}
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
