

import { User, LeagueTier, AchievementEntry, GameMode } from "../types";
import { XP_BASE_DIVISOR, ACHIEVEMENTS } from "../constants";
import { getCurrentSeasonId, getYesterdayWinners } from "./storageService";

const USERS_STORAGE_KEY = 'flagdash_users_v1';
const SESSION_KEY = 'flagdash_current_user';

interface UserDatabase {
  [username: string]: User;
}

export const getUser = (username: string): User | null => {
  const users = getUsers();
  return users[username] || null;
};

const getUsers = (): UserDatabase => {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Exponential Leveling System
export const calculateLevel = (xp: number): number => {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / XP_BASE_DIVISOR)) + 1;
};

// New Helper: Check if I won yesterday and add achievement if missing
const checkDailyWinAchievement = (user: User): User => {
    const winners = getYesterdayWinners();
    let updated = false;
    let achievements = [...(user.achievements || [])];

    // Check Standard
    if (winners.standard === user.username) {
        const hasIt = achievements.some(a => 
            a.type === 'DAILY_WIN' && 
            a.detail === 'Standard' && 
            (Date.now() - a.timestamp) < 48 * 60 * 60 * 1000
        );

        if (!hasIt) {
            achievements.push({
                id: crypto.randomUUID(),
                type: 'DAILY_WIN',
                detail: 'Standard',
                timestamp: Date.now(),
                mode: GameMode.DAILY_STANDARD
            });
            updated = true;
        }
    }

    // Check Thematic
    if (winners.thematic === user.username) {
        const hasIt = achievements.some(a => 
            a.type === 'DAILY_WIN' && 
            a.detail === 'Thematic' && 
            (Date.now() - a.timestamp) < 48 * 60 * 60 * 1000
        );

        if (!hasIt) {
            achievements.push({
                id: crypto.randomUUID(),
                type: 'DAILY_WIN',
                detail: 'Thematic',
                timestamp: Date.now(),
                mode: GameMode.DAILY_THEMATIC
            });
            updated = true;
        }
    }

    if (updated) {
        const result = updateUserStats(user.username, { achievements });
        return result ? result.user : user;
    }
    return user;
};


export const registerUser = (user: Omit<User, 'totalGames' | 'xp' | 'level' | 'medals' | 'achievements' | 'records' | 'unlockedCosmetics' | 'equippedCosmetics' | 'currentStreak' | 'lastPlayedDate'>): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users[user.username]) {
    return { success: false, message: "El nombre de usuario ya existe." };
  }

  // Init stats
  const newUser: User = {
    ...user,
    totalGames: 0,
    xp: 0,
    level: 1,
    medals: [],
    achievements: [],
    records: {},
    unlockedCosmetics: [],
    equippedCosmetics: {},
    currentStreak: 0,
    lastPlayedDate: ''
  };

  users[user.username] = newUser;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return { success: true, message: "Usuario registrado con éxito." };
};

export const loginUser = (username: string, password: string): { success: boolean; user?: User; message: string } => {
  const users = getUsers();
  const user = users[username];

  if (user && user.password === password) {
    const { password: _, ...safeUser } = user;
    // Check for yesterday's wins
    const processedUser = checkDailyWinAchievement(safeUser as User);
    // Ensure cosmetics arrays exist for legacy users
    if (!processedUser.unlockedCosmetics) processedUser.unlockedCosmetics = [];
    if (!processedUser.equippedCosmetics) processedUser.equippedCosmetics = {};
    
    return { success: true, user: processedUser, message: "Login correcto." };
  }

  return { success: false, message: "Usuario o contraseña incorrectos." };
};

export const saveSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = (): User | null => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    const user = data ? JSON.parse(data) : null;
    if (user) {
         const processed = checkDailyWinAchievement(user);
         if (!processed.unlockedCosmetics) processed.unlockedCosmetics = [];
         if (!processed.equippedCosmetics) processed.equippedCosmetics = {};
         return processed;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const updateUserStats = (username: string, updates: Partial<User>, newTimeMs?: number, mode?: string): { user: User, badges: string[] } | null => {
  const users = getUsers();
  if (!users[username]) return null;

  const currentUser = users[username];
  const newBadges: string[] = [];

  // Merge simple updates
  users[username] = { ...currentUser, ...updates };
  
  // Handle PB and SB logic if a time is provided
  if (newTimeMs !== undefined && mode) {
      const currentSeason = getCurrentSeasonId();
      if (!users[username].records) users[username].records = {};
      // @ts-ignore
      if (!users[username].records[mode]) {
          // @ts-ignore
          users[username].records[mode] = { pb: null, sb: null, seasonId: currentSeason };
      }
      // @ts-ignore
      const modeRecords = users[username].records[mode];

      if (modeRecords.pb === null || newTimeMs < modeRecords.pb) {
          modeRecords.pb = newTimeMs;
          newBadges.push('PB');
      }

      if (modeRecords.seasonId !== currentSeason) {
          modeRecords.sb = newTimeMs; 
          modeRecords.seasonId = currentSeason;
          newBadges.push('SB');
      } else {
          if (modeRecords.sb === null || newTimeMs < modeRecords.sb) {
              modeRecords.sb = newTimeMs;
              newBadges.push('SB');
          }
      }
  }

  if (updates.xp !== undefined) {
      const newLevel = calculateLevel(users[username].xp);
      users[username].level = newLevel;
  }
  
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  
  const currentSession = getSession();
  if (currentSession && currentSession.username === username) {
    saveSession(users[username]);
  }

  return { user: users[username], badges: newBadges };
};

export const checkAchievements = (user: User, lastGame?: { mode: GameMode, timeMs: number, rank?: number }): User => {
    let unlocked = [...(user.unlockedCosmetics || [])];
    let changed = false;

    ACHIEVEMENTS.forEach(ach => {
        // Only check if not already unlocked
        if (!unlocked.includes(ach.rewardId)) {
            if (ach.check(user, lastGame)) {
                unlocked.push(ach.rewardId);
                changed = true;
                // Optional: Notify user
                console.log(`Unlocked cosmetic: ${ach.title}`);
            }
        }
    });

    if (changed) {
        const result = updateUserStats(user.username, { unlockedCosmetics: unlocked });
        return result ? result.user : user;
    }
    return user;
}