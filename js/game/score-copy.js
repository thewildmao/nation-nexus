import {
  HINT_PENALTY,
  MISS_BONUS,
  STREAK_MAX_BONUS,
  STREAK_STEP,
  baseAward,
  hintedAward,
  streakBonus,
} from "./run.js";

export function hintPercent() {
  return Math.round(HINT_PENALTY * 100);
}

export function streakCapStreak() {
  if (STREAK_STEP <= 0) return 2;
  return 1 + Math.ceil(STREAK_MAX_BONUS / STREAK_STEP);
}

export function awardBreakdown({
  mode = "map",
  answerStyle = "choices",
  hint = false,
  streak = 1,
  clearingMiss = false,
} = {}) {
  const base = baseAward(mode, { answerStyle });
  const afterHint = mode === "map" && hint ? hintedAward(base) : base;
  const bonus = streakBonus(streak);
  const miss = clearingMiss ? MISS_BONUS : 0;
  return {
    base,
    afterHint,
    hintCut: base - afterHint,
    bonus,
    miss,
    total: afterHint + bonus + miss,
  };
}

export function settingsScoreLines(mode, cfg = {}) {
  const base = baseAward(mode, cfg);
  const mapBase = baseAward("map", {});
  const hinted = hintedAward(mapBase);
  return {
    streak: `Streak +${STREAK_STEP} per extra correct, max +${STREAK_MAX_BONUS}`,
    hint: `${hinted} per correct instead of ${mapBase} (−${hintPercent()}%)`,
    "repeat-cycle": `${base} per correct. Play again keeps this score.`,
    "repeat-random": `${base} per correct. Countries can repeat.`,
    "repeat-misses": `${base} per correct, +${MISS_BONUS} when you clear a miss.`,
    "repeat-once": `${base} per correct. Set ends; Play again starts a new score.`,
    "style-choices": `${baseAward(mode, { answerStyle: "choices" })} per correct`,
    "style-type": `${baseAward(mode, { answerStyle: "type" })} per correct`,
  };
}

export function guideModel() {
  const mapBase = baseAward("map", {});
  const typeBase = baseAward("flags", { answerStyle: "type" });
  const hinted = hintedAward(mapBase);
  const cap = streakCapStreak();
  const sampleStreak = Math.min(3, cap);
  const lines = settingsScoreLines("map", {});

  const ladder = [];
  for (let streak = 1; streak <= cap; streak += 1) {
    const row = awardBreakdown({ mode: "map", streak });
    ladder.push({
      label: streak === cap ? `${streak}+ in a row` : `${streak} in a row`,
      bonus: row.bonus,
      total: row.total,
    });
  }

  return {
    intro:
      "Three minigames share one region pool. Each game keeps its own score, timer, and streak.",
    games: [
      {
        href: "#/map",
        title: "Nation Needle",
        blurb: "A country is named. Click it on the map.",
      },
      {
        href: "#/flags",
        title: "Flag Master",
        blurb: "See a flag. Pick the country, or type it.",
      },
      {
        href: "#/capitals",
        title: "Capital Quest",
        blurb: "See a country. Pick its capital, or type it.",
      },
    ],
    scoringLead:
      "Wrong answers are 0. A correct answer is the base, then the streak bonus, then a miss-clear bonus if that setting is on.",
    scoringRows: [
      { label: "Map / multiple choice", value: String(mapBase) },
      { label: "Type the answer (flags & capitals)", value: String(typeBase) },
      {
        label: "Continent hint on (map)",
        value: `${hinted} instead of ${mapBase} (−${hintPercent()}%)`,
      },
      {
        label: "Clear a miss (Only misses)",
        value: `+${MISS_BONUS} after the rest`,
      },
    ],
    streakLead: `The first correct in a row is just the base. From the 2nd on, add +${STREAK_STEP} per extra hit, up to +${STREAK_MAX_BONUS} at ${cap} in a row. A miss sets the streak back to 0.`,
    ladder,
    ladderNote: `Totals below use map / multiple choice with the hint off (${mapBase} base). Type-in uses ${typeBase}. Hint uses ${hinted}.`,
    examples: [
      {
        label: "Map, no hint, first correct",
        value: String(awardBreakdown({ mode: "map", streak: 1 }).total),
      },
      {
        label: `Map, hint on, ${sampleStreak} in a row`,
        value: String(
          awardBreakdown({ mode: "map", hint: true, streak: sampleStreak }).total
        ),
      },
      {
        label: "Flags, type-in, first correct",
        value: String(
          awardBreakdown({ mode: "flags", answerStyle: "type", streak: 1 }).total
        ),
      },
      {
        label: "Map, no hint, 2 in a row, clearing a miss",
        value: String(
          awardBreakdown({ mode: "map", streak: 2, clearingMiss: true }).total
        ),
      },
    ],
    repeats: [
      { title: "Never — end the set", body: lines["repeat-once"] },
      { title: "After the full set", body: lines["repeat-cycle"] },
      { title: "Anytime", body: lines["repeat-random"] },
      { title: "Only misses", body: lines["repeat-misses"] },
    ],
    notes: [
      "The region picker is shared. Changing regions starts a new score for Nation Needle, Flag Master, and Capital Quest.",
      "Changing the hint, how you answer, or how countries repeat ends that game’s current run and saves it.",
      "Explore on the map resets the map run.",
    ],
  };
}
