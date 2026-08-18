import {
  HINT_PENALTY,
  MISS_BONUS,
  PLAYABLE_MODES,
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

const GAME_BLURB = {
  map: "A country is named. Click it on the map.",
  flags: "See a flag. Pick the country, or type it.",
  capitals: "See a country. Pick its capital, or type it.",
};

export function guideGames() {
  return PLAYABLE_MODES.map((mode) => ({
    mode,
    href: `#/how/${mode}`,
    playHref: `#/${mode}`,
    blurb: GAME_BLURB[mode],
  }));
}

export function guideModel(mode) {
  if (!PLAYABLE_MODES.includes(mode)) return null;
  const choice = baseAward(mode, { answerStyle: "choices" });
  const typed = baseAward(mode, { answerStyle: "type" });
  const hinted = hintedAward(baseAward("map", {}));
  const cap = streakCapStreak();
  const lines = settingsScoreLines(mode, {});
  const first = awardBreakdown({ mode, streak: 1 });
  const hot = awardBreakdown({ mode, streak: 3 });
  const hintedHot =
    mode === "map"
      ? awardBreakdown({ mode: "map", hint: true, streak: 3 })
      : null;

  const steps =
    mode === "map"
      ? [
          [{ t: "A country is named at the top of the map." }],
          [{ t: "Click", b: true }, { t: " that country." }],
          [
            { t: "A miss is " },
            { t: "0 points", b: true },
            { t: " and the streak goes back to " },
            { t: "0", b: true },
            { t: "." },
          ],
        ]
      : mode === "flags"
        ? [
            [{ t: "A flag is shown." }],
            [
              { t: "Pick the country", b: true },
              { t: " from the list, or " },
              { t: "type its name", b: true },
              { t: "." },
            ],
            [
              { t: "A miss is " },
              { t: "0 points", b: true },
              { t: " and the streak goes back to " },
              { t: "0", b: true },
              { t: "." },
            ],
          ]
        : [
            [{ t: "A country is shown." }],
            [
              { t: "Pick its capital", b: true },
              { t: " from the list, or " },
              { t: "type the city", b: true },
              { t: "." },
            ],
            [
              { t: "A miss is " },
              { t: "0 points", b: true },
              { t: " and the streak goes back to " },
              { t: "0", b: true },
              { t: "." },
            ],
          ];

  const scoringRows = [
    {
      label: mode === "map" ? "Correct click" : "Multiple choice",
      value: String(choice),
    },
  ];
  if (mode !== "map") {
    scoringRows.push({ label: "Type the answer", value: String(typed) });
  }
  if (mode === "map") {
    scoringRows.push({
      label: "Continent hint on",
      value: `${hinted} instead of ${choice} (−${hintPercent()}%)`,
    });
  }
  scoringRows.push({
    label: "Streak (2nd hit and up)",
    value: `+${STREAK_STEP} each, max +${STREAK_MAX_BONUS}`,
  });
  scoringRows.push({
    label: "Clear a miss (Only misses)",
    value: `+${MISS_BONUS} after the rest`,
  });

  const notes = [
    "The region picker is shared. Changing regions starts a new score for all three games.",
    "Changing how you answer or how countries repeat ends this game’s current run and saves it.",
  ];
  if (mode === "map") {
    notes.splice(1, 0, "Turning the continent hint on or off ends the current map run.");
    notes.push("Exit and explore resets the map run.");
  }

  return {
    mode,
    playHref: `#/${mode}`,
    intro: GAME_BLURB[mode],
    steps,
    scoringLead:
      "Wrong answers are 0. A correct answer is the base, then the streak bonus, then a miss-clear bonus if that setting is on.",
    scoringRows,
    streakLead: `The first correct in a row is just the base. From the 2nd on, add +${STREAK_STEP} per extra hit, up to +${STREAK_MAX_BONUS} at ${cap} in a row. A miss sets the streak back to 0.`,
    example: {
      label: "Example",
      lines: [
        { label: "First correct", value: String(first.total) },
        { label: "3 in a row", value: String(hot.total) },
        ...(hintedHot
          ? [{ label: "3 in a row, hint on", value: String(hintedHot.total) }]
          : []),
      ],
    },
    repeats: [
      { title: "Never — end the set", body: lines["repeat-once"] },
      { title: "After the full set", body: lines["repeat-cycle"] },
      { title: "Anytime", body: lines["repeat-random"] },
      { title: "Only misses", body: lines["repeat-misses"] },
    ],
    notes,
  };
}
