
import { QuizQuestion, GameMode, Country } from "../types";
import { 
    EUROPEAN_COUNTRIES, 
    ASIAN_COUNTRIES,
    AFRICAN_COUNTRIES,
    AMERICAN_COUNTRIES,
    OCEANIA_COUNTRIES,
    CARIBBEAN_COUNTRIES,
    POPULOUS_COUNTRIES,
    ALL_WORLD_COUNTRIES,
    getQuestionsCount 
} from "../constants";

// Linear Congruential Generator for seeded random numbers
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a number between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const getDailySeed = (isThematic: boolean = false): number => {
  // Get current date string in Spain timezone
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const dateObj = new Date(dateStr);
  
  // Create a numeric seed from YYYYMMDD
  const seedBase = dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate();
  
  // Offset for thematic to ensure it's different
  return isThematic ? seedBase + 99999 : seedBase;
};

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
const getThematicPoolForDay = (dayIndex: number): Country[] => {
    switch(dayIndex) {
        case 1: return ASIAN_COUNTRIES; // Monday: Asia
        case 2: return AFRICAN_COUNTRIES; // Tuesday: Africa
        case 3: return AMERICAN_COUNTRIES; // Wednesday: Americas
        case 4: return OCEANIA_COUNTRIES; // Thursday: Oceania
        case 5: return CARIBBEAN_COUNTRIES; // Friday: Caribbean
        case 6: return POPULOUS_COUNTRIES; // Saturday: High Population
        case 0: return ALL_WORLD_COUNTRIES; // Sunday: World Mix
        default: return EUROPEAN_COUNTRIES;
    }
}

export const generateQuiz = async (mode: GameMode): Promise<QuizQuestion[]> => {
  let rng: { next: () => number };
  let pool: Country[] = [];

  if (mode === GameMode.DAILY_STANDARD) {
    rng = new SeededRNG(getDailySeed(false));
    pool = [...EUROPEAN_COUNTRIES];
  } else if (mode === GameMode.DAILY_THEMATIC) {
    rng = new SeededRNG(getDailySeed(true));
    // Determine day of week in Madrid
    const dateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" });
    const dayIndex = new Date(dateStr).getDay();
    pool = [...getThematicPoolForDay(dayIndex)];
  } else {
    // Competitive / Weekly / Nations -> Always Europe
    rng = { next: () => Math.random() };
    pool = [...EUROPEAN_COUNTRIES];
  }

  // Shuffle using the specific RNG to select WHICH countries form the quiz
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick number of questions based on mode
  const count = getQuestionsCount(mode);
  // Ensure we don't request more than available
  const safeCount = Math.min(count, pool.length);
  const targets = pool.slice(0, safeCount);

  // Pool for distractors: depends on mode. 
  const distractorPool = mode === GameMode.DAILY_THEMATIC ? pool : EUROPEAN_COUNTRIES;

  const questions = targets.map(target => {
    // Select 7 distractors
    const distractors = distractorPool
      .filter(c => c.code !== target.code)
      .sort(() => 0.5 - rng.next())
      .slice(0, 7);
    
    // Combine and shuffle options
    const options = [target, ...distractors]
      .sort(() => 0.5 - rng.next());

    return {
      targetCountryName: target.name,
      correctCode: target.code,
      options: options.map(o => ({ name: o.name, code: o.code }))
    };
  });

  // Final Shuffle of the Questions Order
  // The content is fixed for Daily per seed, but the ORDER they appear will now be random
  // preventing players from memorizing "First is France, Second is Spain..."
  return questions.sort(() => Math.random() - 0.5);
};
