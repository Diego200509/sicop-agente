function parsePositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export type ChatGeneralConfig = {
  maxTasks: number;
  maxDesc: number;
  maxAnalysis: number;
  matchingPool: number;
  focusMaxDesc: number;
  focusMaxAnalysis: number;
  focusMaxPdf: number;
};

export function getChatGeneralConfig(): ChatGeneralConfig {
  return {
    maxTasks: parsePositiveInt(process.env.CHAT_GENERAL_MAX_TASKS, 30, 3, 100),
    maxDesc: parsePositiveInt(process.env.CHAT_GENERAL_MAX_DESC, 1200, 200, 8000),
    maxAnalysis: parsePositiveInt(process.env.CHAT_GENERAL_MAX_ANALYSIS, 900, 200, 12000),
    matchingPool: parsePositiveInt(process.env.CHAT_GENERAL_MATCHING_POOL, 150, 20, 500),
    focusMaxDesc: parsePositiveInt(process.env.CHAT_GENERAL_FOCUS_MAX_DESC, 2500, 500, 12000),
    focusMaxAnalysis: parsePositiveInt(process.env.CHAT_GENERAL_FOCUS_MAX_ANALYSIS, 2000, 400, 16000),
    focusMaxPdf: parsePositiveInt(process.env.CHAT_GENERAL_FOCUS_MAX_PDF, 500, 0, 4000),
  };
}
