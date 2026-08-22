export function comboCall(streak) {
  if (streak >= 8) return { title: "GODLIKE", tier: "god" };
  if (streak >= 7) return { title: "UNSTOPPABLE", tier: "god" };
  if (streak >= 6) return { title: "RAMPAGE", tier: "fire" };
  if (streak >= 5) return { title: "ON FIRE", tier: "fire" };
  if (streak === 4) return { title: "QUAD", tier: "hot" };
  if (streak === 3) return { title: "TRIPLE", tier: "hot" };
  if (streak === 2) return { title: "DOUBLE", tier: "hot" };
  return { title: "", tier: "" };
}

export function comboHeat(streak) {
  if (streak >= 8) return 8;
  if (streak >= 7) return 7;
  if (streak >= 6) return 6;
  if (streak >= 5) return 5;
  if (streak >= 2) return streak;
  return 0;
}

export function shoutHoldMs(heat = 0, tier = "") {
  if (heat >= 8) return 1300;
  if (tier === "fire" || tier === "god") return 1200;
  if (heat >= 4) return 1000;
  return 900;
}

export function comboBreak(lostStreak) {
  if (lostStreak >= 5) return { title: "FIRE OUT", tier: "broke" };
  if (lostStreak >= 2) return { title: "STREAK BROKEN", tier: "broke" };
  return { title: "", tier: "" };
}

export function finishCall(recap) {
  if (!recap) return { title: "", tier: "" };
  const asked = recap.asked || 0;
  const correct = recap.correct || 0;
  const pts = recap.points ? `${recap.points} PTS` : "";
  if (recap.ended === "exited") return { title: "ENDED EARLY", tier: "broke", pts };
  if (asked > 0 && correct === asked) return { title: "PERFECT", tier: "god", pts };
  if ((recap.bestStreak || 0) >= 5) return { title: "SET COMPLETE", tier: "fire", pts };
  return { title: "SET COMPLETE", tier: "hot", pts };
}
