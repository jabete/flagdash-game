import React from 'react';
import { ACHIEVEMENTS, COSMETICS_MAP } from '../constants';
import { User } from '../types';
import { Medal } from './Medal';

interface Props {
  onClose: () => void;
  user?: User;
}

export const AchievementsGuide: React.FC<Props> = ({ onClose, user }) => {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 px-4 py-8 animate-fade-in">
      <div className="w-full max-w-4xl">
        <button 
          onClick={onClose}
          className="mb-6 text-gray-500 hover:text-white flex items-center gap-2 transition"
        >
          ← Volver al Menú
        </button>
        
        <h1 className="text-3xl font-extrabold text-white mb-2">Misiones & Recompensas</h1>
        <p className="text-gray-400 mb-8">Completa objetivos para desbloquear cosméticos exclusivos.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Medals Section (Static Guide) */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-fit">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>🏅</span> Medallas de Honor
                </h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                        <Medal type="MEDAL_WR_10" size="md" />
                        <div>
                            <h3 className="font-bold text-yellow-400 text-sm">Récord Mundial (WR)</h3>
                            <p className="text-xs text-gray-400">Consigue el mejor tiempo global en cualquier modo.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                        <Medal type="MEDAL_DAILY_WIN" size="md" />
                        <div>
                            <h3 className="font-bold text-emerald-400 text-sm">Ganador Diario</h3>
                            <p className="text-xs text-gray-400">Termina el día con el mejor tiempo en el Desafío Diario.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                        <Medal type="MEDAL_THEMATIC_WIN" size="md" />
                        <div>
                            <h3 className="font-bold text-pink-400 text-sm">Ganador Temático</h3>
                            <p className="text-xs text-gray-400">Termina el día con el mejor tiempo en el Desafío Temático.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                        <div className="flex -space-x-2">
                            <Medal type="GOLD" size="sm" />
                            <Medal type="DIAMOND" size="sm" />
                            <Medal type="MASTER" size="sm" />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-400 text-sm">Medallas de Liga</h3>
                            <p className="text-xs text-gray-400">Sobrevive en la Liga Semanal. El rango depende de tu división final.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Missions Section */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎯</span> Misiones Activas
                    </h2>
                    {user && (
                         <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                             {user.unlockedCosmetics?.length || 0} / {ACHIEVEMENTS.length}
                         </span>
                    )}
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {ACHIEVEMENTS.map(ach => {
                        const css = COSMETICS_MAP[ach.rewardId]?.css || '';
                        const unlocked = user?.unlockedCosmetics?.includes(ach.rewardId);
                        
                        // Calculate Progress
                        let progress: { current: number; target: number; label?: string } = { current: 0, target: 1, label: '' };
                        if (user && ach.getProgress) {
                            progress = ach.getProgress(user);
                        }
                        
                        // Clamp current to target for visual bar (so it doesn't overflow)
                        const visualCurrent = Math.min(progress.current, progress.target);
                        const percent = (visualCurrent / progress.target) * 100;
                        
                        // Force full bar if unlocked
                        const displayPercent = unlocked ? 100 : percent;

                        return (
                            <div key={ach.id} className={`p-4 rounded-xl border transition-all ${unlocked ? 'bg-green-900/10 border-green-500/30' : 'bg-gray-900/50 border-gray-700/50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className={`font-bold text-sm ${unlocked ? 'text-green-400' : 'text-white'}`}>
                                            {ach.title}
                                            {unlocked && <span className="ml-2 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">COMPLETADO</span>}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">{ach.description}</p>
                                    </div>
                                    
                                    {/* Reward Preview */}
                                    <div className="flex flex-col items-end gap-1">
                                         <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                            ach.rewardType === 'FRAME' ? 'bg-orange-900/30 text-orange-300 border-orange-500/30' :
                                            ach.rewardType === 'BANNER' ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' :
                                            'bg-purple-900/30 text-purple-300 border-purple-500/30'
                                        }`}>
                                            {ach.rewardType === 'FRAME' ? 'Marco' : ach.rewardType === 'BANNER' ? 'Banner' : 'Estilo'}
                                        </span>
                                        {/* Small Visual Preview */}
                                        <div className="mt-1">
                                            {ach.rewardType === 'NAME_STYLE' ? (
                                                <span className={`text-xs font-bold ${css}`}>Nombre</span>
                                            ) : ach.rewardType === 'FRAME' ? (
                                                <div className={`w-6 h-6 rounded-full bg-gray-700 ${css}`}></div>
                                            ) : (
                                                <div className={`h-4 w-10 rounded ${css}`}></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">
                                        <span>Progreso</span>
                                        <span className={unlocked ? 'text-green-400 font-bold' : 'text-white'}>
                                            {unlocked ? '¡Reclamado!' : `${progress.current} / ${progress.target} ${progress.label || ''}`}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
                                        <div 
                                            className={`h-full transition-all duration-700 ${unlocked ? 'bg-green-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${displayPercent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};