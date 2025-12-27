
import { LeaderboardEntry, GameMode, GlobalRecords, ActivityLogEntry, NationDailyStats, NationPointsEntry } from "../types";

const STORAGE_KEY = 'flagdash_leaderboard_v1';
const RECORDS_KEY = 'flagdash_global_records_v1';
const ACTIVITY_KEY = 'flagdash_activity_log_v1';
const NATION_POINTS_KEY = 'flagdash_nation_points_v1';

// Helper to get Season ID (YYYY-MM)
export const getCurrentSeasonId = (): string => {
  const now = new Date();
  // Season resets every month
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const getLeaderboard = (mode?: GameMode, seasonId?: string): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    let entries = JSON.parse(data) as LeaderboardEntry[];
    
    // Filter by Mode if provided
    if (mode) {
      entries = entries.filter(e => e.mode === mode);
    }

    // Filter by Season if provided
    // If seasonId is undefined, we return ALL records (All-Time)
    if (seasonId) {
      entries = entries.filter(e => e.seasonId === seasonId);
    }
    
    // Sort by time ascending
    entries.sort((a, b) => a.timeMs - b.timeMs);

    return entries;
  } catch (e) {
    console.error("Error reading leaderboard", e);
    return [];
  }
};

export const getGlobalRecords = (): GlobalRecords => {
    try {
        const data = localStorage.getItem(RECORDS_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

export const getRecentActivity = (): ActivityLogEntry[] => {
    try {
        const data = localStorage.getItem(ACTIVITY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const addActivityLog = (entry: Omit<ActivityLogEntry, 'id'>) => {
    try {
        const logs = getRecentActivity();
        const newLog: ActivityLogEntry = { ...entry, id: crypto.randomUUID() };
        // Add to top
        logs.unshift(newLog);
        // Keep max 4 (Updated per request)
        const cappedLogs = logs.slice(0, 4);
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(cappedLogs));
    } catch (e) {
        console.error("Error adding activity log", e);
    }
};

// Calculate rank and percentile for a specific score
export const calculateLeaderboardStats = (
    timeMs: number, 
    mode: GameMode, 
    seasonId: string
): { rank: number, total: number, percentile: number } => {
    // We get the raw list without filtering for display limit to calculate real math
    const allEntries = getLeaderboard(mode, seasonId);
    
    // Find index of the first entry with this time
    const rank = allEntries.findIndex(e => e.timeMs === timeMs) + 1; // 1-based
    const total = allEntries.length;

    const percentile = Math.ceil((rank / total) * 100);

    return { rank: rank > 0 ? rank : total + 1, total, percentile };
};

// NEW: Updates the level of a user in ALL leaderboard entries
export const updateAllUserLeaderboardLevels = (username: string, newLevel: number) => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return;
        let entries = JSON.parse(data) as LeaderboardEntry[];
        
        let changed = false;
        entries = entries.map(e => {
            if (e.username === username && e.level !== newLevel) {
                changed = true;
                return { ...e, level: newLevel };
            }
            return e;
        });

        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        }
    } catch (e) {
        console.error("Error updating leaderboard levels", e);
    }
};

export const saveScore = (entry: LeaderboardEntry): { leaderboard: LeaderboardEntry[], brokenRecords: string[] } => {
  const currentLeaderboard = getLeaderboard(); // Get ALL entries raw (All-Time included)
  const seasonId = getCurrentSeasonId();
  
  // 1. Add Season ID to entry
  entry.seasonId = seasonId;
  
  let updatedLeaderboard = [...currentLeaderboard];

  const isCompetitiveMode = entry.mode === GameMode.COMPETITIVE || entry.mode === GameMode.COMPETITIVE_5 || entry.mode === GameMode.COMPETITIVE_20;

  if (isCompetitiveMode || entry.mode === GameMode.NATIONS_LEAGUE) {
      // LOGIC: Keep ALL times (History) for Competitive and Nations League
      updatedLeaderboard.push(entry);
  } else {
      // LOGIC FOR DAILY/LEAGUE: Keep only BEST time (Overwrite)
      const existingIndex = updatedLeaderboard.findIndex(e => 
          e.username === entry.username && 
          e.mode === entry.mode && 
          e.seasonId === entry.seasonId
      );

      if (existingIndex !== -1) {
          // If new time is better, replace. If not, discard (keep existing best).
          if (entry.timeMs < updatedLeaderboard[existingIndex].timeMs) {
              updatedLeaderboard[existingIndex] = entry; // Update with better time
          } 
          // Else: do nothing
      } else {
          updatedLeaderboard.push(entry);
      }
  }
  
  // Sort and cap size (keep larger history for Nations calculations, but safeguard)
  updatedLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
  
  // Cap at 2000 to prevent localstorage overflow, serving as the All-Time database
  const cappedLeaderboard = updatedLeaderboard.slice(0, 2000); 
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cappedLeaderboard));

  // 2. Update Global Records (WR / NR)
  // ONLY FOR COMPETITIVE MODES
  const brokenRecords: string[] = [];
  
  if (isCompetitiveMode) {
      const globalRecords = getGlobalRecords();
      
      // Ensure mode exists in records
      if (!globalRecords[entry.mode]) {
          globalRecords[entry.mode] = { wr: null, nr: {} };
      }

      const modeRecords = globalRecords[entry.mode]!;

      // Check WR
      if (!modeRecords.wr || entry.timeMs < modeRecords.wr.timeMs) {
          modeRecords.wr = { timeMs: entry.timeMs, username: entry.username, countryCode: entry.countryCode };
          brokenRecords.push('WR');
      }

      // Check NR
      const currentNR = modeRecords.nr[entry.countryCode];
      if (!currentNR || entry.timeMs < currentNR.timeMs) {
          modeRecords.nr[entry.countryCode] = { timeMs: entry.timeMs, username: entry.username };
          brokenRecords.push('NR');
      }

      localStorage.setItem(RECORDS_KEY, JSON.stringify(globalRecords));
  }

  return { leaderboard: cappedLeaderboard, brokenRecords };
};

export const getRecordBadges = (mode: GameMode, countryCode: string, timeMs: number): string[] => {
    // Only return badges for competitive modes
    if (mode !== GameMode.COMPETITIVE && mode !== GameMode.COMPETITIVE_5 && mode !== GameMode.COMPETITIVE_20) return [];

    const badges: string[] = [];
    const globalRecords = getGlobalRecords();
    const modeRecords = globalRecords[mode];

    if (modeRecords) {
        if (modeRecords.wr && modeRecords.wr.timeMs === timeMs) badges.push('WR');
        if (modeRecords.nr[countryCode] && modeRecords.nr[countryCode].timeMs === timeMs) badges.push('NR');
    }
    return badges;
};

// --- DYNAMIC MEDALS LOGIC (WR & DAILY) ---

export const getYesterdayWinners = (): { standard: string | null, thematic: string | null } => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        const allEntries = getLeaderboard();
        
        // Find best for Standard
        const standardEntries = allEntries
            .filter(e => e.mode === GameMode.DAILY_STANDARD && new Date(e.timestamp).toDateString() === yesterdayStr)
            .sort((a,b) => a.timeMs - b.timeMs);
            
        // Find best for Thematic
        const thematicEntries = allEntries
            .filter(e => e.mode === GameMode.DAILY_THEMATIC && new Date(e.timestamp).toDateString() === yesterdayStr)
            .sort((a,b) => a.timeMs - b.timeMs);

        return {
            standard: standardEntries.length > 0 ? standardEntries[0].username : null,
            thematic: thematicEntries.length > 0 ? thematicEntries[0].username : null
        };
    } catch {
        return { standard: null, thematic: null };
    }
}

export const getPlayerDynamicMedals = (username: string): string[] => {
    const medals: string[] = [];
    
    // 1. Check WRs
    const records = getGlobalRecords();
    if (records[GameMode.COMPETITIVE_5]?.wr?.username === username) medals.push('MEDAL_WR_5');
    if (records[GameMode.COMPETITIVE]?.wr?.username === username) medals.push('MEDAL_WR_10');
    if (records[GameMode.COMPETITIVE_20]?.wr?.username === username) medals.push('MEDAL_WR_20');

    // 2. Check Daily Wins (Yesterday)
    const winners = getYesterdayWinners();
    if (winners.standard === username) medals.push('MEDAL_DAILY_WIN');
    if (winners.thematic === username) medals.push('MEDAL_THEMATIC_WIN');

    return medals;
}

// --- NATIONS LEAGUE LOGIC ---

export const getNationDailyStats = (): NationDailyStats[] => {
    const allEntries = getLeaderboard(GameMode.NATIONS_LEAGUE);
    
    const today = new Date().toDateString();
    const todaysEntries = allEntries.filter(e => new Date(e.timestamp).toDateString() === today);

    // Group by Country
    const countryMap = new Map<string, number[]>();
    todaysEntries.forEach(e => {
        if (!countryMap.has(e.countryCode)) countryMap.set(e.countryCode, []);
        countryMap.get(e.countryCode)!.push(e.timeMs);
    });

    const stats: NationDailyStats[] = [];

    countryMap.forEach((times, code) => {
        // Sort times ascending
        times.sort((a, b) => a - b);
        
        // Take top 5
        const top5 = times.slice(0, 5);
        
        // Sum times
        const timeSum = top5.reduce((a, b) => a + b, 0);
        
        // Calculate missing
        const missingCount = 5 - top5.length;
        const penalty = missingCount * 60000; // 1 minute per missing
        
        stats.push({
            countryCode: code,
            totalTimeMs: timeSum + penalty,
            contributingTimes: top5.length,
            penaltyMs: penalty
        });
    });

    // Sort by Total Time ASC
    stats.sort((a, b) => a.totalTimeMs - b.totalTimeMs);
    return stats;
};

export const getNationTotalPoints = (): NationPointsEntry[] => {
    try {
        const data = localStorage.getItem(NATION_POINTS_KEY);
        let pointsMap: Record<string, number> = data ? JSON.parse(data) : {};

        // Convert to array
        const result: NationPointsEntry[] = Object.keys(pointsMap).map(code => ({
            countryCode: code,
            points: pointsMap[code]
        }));
        
        // Sort DESC
        result.sort((a, b) => b.points - a.points);
        return result;
    } catch {
        return [];
    }
};

export const updateNationPointsForDay = () => {
    const dailyStats = getNationDailyStats();
    if (dailyStats.length === 0) return;

    try {
        const data = localStorage.getItem(NATION_POINTS_KEY);
        let pointsMap: Record<string, number> = data ? JSON.parse(data) : {};

        dailyStats.forEach((stat, index) => {
            if (index < 10) {
                const points = 10 - index;
                pointsMap[stat.countryCode] = (pointsMap[stat.countryCode] || 0) + points;
            }
        });

        localStorage.setItem(NATION_POINTS_KEY, JSON.stringify(pointsMap));
    } catch (e) {
        console.error(e);
    }
}
