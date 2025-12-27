
import React from 'react';

interface MedalProps {
  type: string;
  size?: 'sm' | 'md' | 'lg'; // sm: leaderboard, md: history, lg: profile case
  className?: string;
}

export const Medal: React.FC<MedalProps> = ({ type, size = 'md', className = '' }) => {
  
  // Size mapping
  const sizeClasses = {
      sm: 'w-5 h-5 text-[6px]',
      md: 'w-10 h-10 text-[8px]',
      lg: 'w-14 h-14 text-[9px]'
  };

  const iconSizes = {
      sm: 'text-[10px]',
      md: 'text-lg',
      lg: 'text-xl'
  }

  const baseClass = `relative flex items-center justify-center transform hover:scale-105 transition-transform cursor-help ${sizeClasses[size]} ${className}`;

  // 1. World Record Medals (Gold Coin Style)
  if (type.startsWith('MEDAL_WR')) {
      const modeType = type.split('_')[2]; // '5', '10', '20'
      return (
          <div className={`${baseClass} rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-yellow-500/30 shadow-md border border-yellow-200`} title={`Récord Mundial ${modeType} Banderas`}>
              <div className="absolute inset-[10%] rounded-full border border-yellow-600/50"></div>
              <div className={`${iconSizes[size]} drop-shadow-md filter`}>🌍</div>
              {size !== 'sm' && (
                <div className="absolute -bottom-1 bg-yellow-900 text-yellow-100 font-black px-1 py-0 rounded-[2px] border border-yellow-500 shadow-sm leading-none">
                    WR {modeType}
                </div>
              )}
          </div>
      );
  }

  // 2. Daily Win Medal (Green Octagon/Badge Style)
  if (type === 'MEDAL_DAILY_WIN') {
      return (
          <div className={`${baseClass}`} title="Ganador Desafío Diario">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-800 rotate-45 rounded-[20%] shadow-md border border-emerald-300"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-800 rounded-[20%] shadow-md border border-emerald-300"></div>
              <div className={`relative z-10 ${iconSizes[size]} drop-shadow-md`}>🏆</div>
              {size !== 'sm' && (
                  <div className="absolute -bottom-1.5 z-20 bg-emerald-950 text-emerald-300 font-bold px-1 py-0 rounded-full border border-emerald-500 uppercase tracking-tighter leading-none">
                      Diario
                  </div>
              )}
          </div>
      );
  }

  // 3. Thematic Win Medal (Pink/Purple Badge Style)
  if (type === 'MEDAL_THEMATIC_WIN') {
      return (
            <div className={`${baseClass}`} title="Ganador Desafío Temático">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 border border-pink-300 shadow-md shadow-pink-500/30"></div>
              <div className={`relative z-10 ${iconSizes[size]}`}>🎭</div>
              {size !== 'sm' && (
                  <div className="absolute -bottom-1 z-20 bg-purple-950 text-pink-300 font-bold px-1 py-0 rounded-full border border-pink-500 uppercase tracking-tighter leading-none">
                      Tema
                  </div>
              )}
          </div>
      );
  }

  // 4. League Medals (Metallic Gradients based on Tier)
  const isMaster = type.includes('MASTER');
  const isDiamond = type.includes('DIAMOND');
  const isPlatinum = type.includes('PLATINUM');
  const isGold = type.includes('GOLD');
  const isSilver = type.includes('SILVER');
  const isBronze = type.includes('BRONZE');

  let gradient = 'from-gray-700 to-gray-900'; 
  let border = 'border-gray-600';
  let icon = '🎗️';
  let label = 'Liga';
  let title = 'Medalla de Liga';

  if (isMaster) {
      gradient = 'from-red-500 via-red-700 to-red-900';
      border = 'border-red-400';
      icon = '👑';
      label = 'M';
      title = 'Liga Master';
  } else if (isDiamond) {
      gradient = 'from-cyan-300 via-blue-500 to-purple-600';
      border = 'border-cyan-300';
      icon = '💎';
      label = 'D';
      title = 'Liga Diamante';
  } else if (isPlatinum) {
      gradient = 'from-slate-200 via-cyan-400 to-slate-500';
      border = 'border-cyan-200';
      icon = '💠';
      label = 'P';
      title = 'Liga Platino';
  } else if (isGold) {
      gradient = 'from-yellow-200 via-yellow-500 to-yellow-700';
      border = 'border-yellow-200';
      icon = '🥇';
      label = 'G';
      title = 'Liga Oro';
  } else if (isSilver) {
      gradient = 'from-gray-200 via-gray-400 to-gray-600';
      border = 'border-gray-300';
      icon = '🥈';
      label = 'S';
      title = 'Liga Plata';
  } else if (isBronze) {
      gradient = 'from-orange-300 via-orange-500 to-orange-800';
      border = 'border-orange-300';
      icon = '🥉';
      label = 'B';
      title = 'Liga Bronce';
  }

  return (
      <div className={`${baseClass} flex-col`} title={title}>
          <div className={`absolute inset-0 bg-gradient-to-b ${gradient} rounded-b-full rounded-t-sm shadow-md border-x border-b ${border}`}></div>
          <div className={`relative z-10 ${iconSizes[size]} -mt-1`}>{icon}</div>
          {size !== 'sm' && <div className="relative z-10 font-black text-white/90 uppercase mt-0.5 leading-none">{label}</div>}
          <div className="absolute -top-[10%] w-full h-[10%] bg-gray-800/50 rounded-full blur-[1px]"></div>
      </div>
  );
};
