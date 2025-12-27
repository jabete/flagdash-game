
import { User, LeagueTier, WeeklyLeagueState, GameMode, AchievementEntry } from "../types";
import { getLeaderboard } from "./storageService";
import { updateUserStats } from "./authService";

// Helper to get Week ID starting on Saturday
// We calculate the timestamp of the most recent Saturday and use that as ID
const getSaturdayWeekId = (date: Date): string => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const day = target.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  // Calculate difference to get back to previous (or today's) Saturday
  // If Today is Sat (6), diff is 0.
  // If Today is Sun (0), diff is 1.
  // If Today is Fri (5), diff is 6.
  const diff = (day + 1) % 7;
  
  target.setDate(target.getDate() - diff);
  
  // Return YYYY-MM-DD of the Saturday
  return `${target.getFullYear()}-${(target.getMonth() + 1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;
};

// Tiers ordered by progression (Saturday is day 1)
export const TIER_PROGRESSION = [
  'Qualifying', // Day 1 (Saturday)
  LeagueTier.BRONZE, // Day 2 (Sunday)
  LeagueTier.SILVER, // Day 3 (Monday)
  LeagueTier.GOLD, // Day 4 (Tuesday)
  LeagueTier.PLATINUM, // Day 5 (Wednesday)
  LeagueTier.DIAMOND, // Day 6 (Thursday)
  LeagueTier.MASTER, // Day 7 (Friday)
];

export const CUTOFFS: { [key: string]: number } = {
  'Qualifying': 0.8,
  [LeagueTier.BRONZE]: 0.7,
  [LeagueTier.SILVER]: 0.6,
  [LeagueTier.GOLD]: 0.5,
  [LeagueTier.PLATINUM]: 0.4,
  [LeagueTier.DIAMOND]: 0.3,
  [LeagueTier.MASTER]: 1.0,
};

export const checkWeeklyProgress = (user: User): User => {
  const now = new Date();
  const madridNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const currentWeekId = getSaturdayWeekId(madridNow);
  
  const jsDay = madridNow.getDay(); // 0=Sun, 1=Mon... 6=Sat
  
  // Map JS Day to League Day (1-7), starting Saturday.
  // Sat(6) -> 1
  // Sun(0) -> 2
  // ...
  // Fri(5) -> 7
  const currentDay = ((jsDay + 1) % 7) + 1;

  // Initial State
  let state: WeeklyLeagueState = user.weeklyState || {
    currentTier: 'Qualifying',
    bestTimeMs: null,
    isEliminated: false,
    lastUpdatedDay: 0,
    weekId: currentWeekId
  };

  // 1. Check New Week -> Reset
  if (state.weekId !== currentWeekId) {
    let newMedals = [...(user.medals || [])];
    const newAchievements = [...(user.achievements || [])];
    
    // Logic for awarding medals for the PREVIOUS week if they survived to the end or were in Master
    if (!state.isEliminated && state.bestTimeMs !== null) {
      newMedals.push(`${state.currentTier}_${state.weekId}`);
      
      // Log Achievement for History
      const winAchievement: AchievementEntry = {
          id: crypto.randomUUID(),
          type: 'LEAGUE_WIN',
          timestamp: Date.now(),
          detail: state.currentTier,
          mode: GameMode.WEEKLY_LEAGUE
      };
      newAchievements.push(winAchievement);
    }

    state = {
      currentTier: 'Qualifying',
      bestTimeMs: null,
      isEliminated: false,
      lastUpdatedDay: currentDay,
      weekId: currentWeekId
    };
    
    const updateResult = updateUserStats(user.username, { weeklyState: state, medals: newMedals, achievements: newAchievements });
    return updateResult ? updateResult.user : user;
  }

  // 2. Check Daily Progression
  if (state.lastUpdatedDay < currentDay) {
    if (state.isEliminated) {
        state.lastUpdatedDay = currentDay;
        const updateResult = updateUserStats(user.username, { weeklyState: state });
        return updateResult ? updateResult.user : user;
    }

    // Logic: Did they survive yesterday?
    // Gap check: If current is Day 3 (Mon) and last update was Day 1 (Sat), they missed Sun -> Eliminated.
    if (currentDay - state.lastUpdatedDay > 1 && state.lastUpdatedDay !== 0) {
        state.isEliminated = true;
    } else {
         if (state.bestTimeMs === null && state.lastUpdatedDay > 0) {
             state.isEliminated = true;
         } else {
             // Calculate Cutoff
             const leaderboard = getLeaderboard()
                .filter(e => e.mode === GameMode.WEEKLY_LEAGUE && e.timestamp > (Date.now() - 604800000));
             
             leaderboard.sort((a, b) => a.timeMs - b.timeMs);
             
             const myRank = leaderboard.findIndex(e => e.username === user.username);
             const totalPlayers = leaderboard.length || 1;
             const myPercentile = 1 - (myRank / totalPlayers); 
             
             const requiredPercentile = CUTOFFS[state.currentTier] || 0.5;
             const passed = totalPlayers < 5 ? true : (myPercentile >= (1 - requiredPercentile));

             if (passed) {
                 // Promote
                 const nextTierIndex = Math.min(currentDay - 1, TIER_PROGRESSION.length - 1);
                 state.currentTier = TIER_PROGRESSION[nextTierIndex] as LeagueTier | 'Qualifying';
                 state.bestTimeMs = null; 
             } else {
                 state.isEliminated = true;
             }
         }
    }
    
    state.lastUpdatedDay = currentDay;
    const updateResult = updateUserStats(user.username, { weeklyState: state });
    return updateResult ? updateResult.user : user;
  }

  return user;
};
