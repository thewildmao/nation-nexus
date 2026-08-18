import { comboCall, comboHeat } from "../game/combo.js";
import { awardBreakdown, guideGames, guideModel } from "../game/score-copy.js";
import { STREAK_STEP, streakBonus } from "../game/run.js";
import { el } from "./dom.js";
import { fillLockup } from "./identity.js";
import { playLaunch } from "./sfx.js";

function elWith(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function rich(parts) {
  const node = document.createElement("span");
  parts.forEach((part) => {
    if (part.b) node.append(elWith("strong", null, part.t));
    else node.append(document.createTextNode(part.t));
  });
  return node;
}

function section(title, lead) {
  const wrap = elWith("section", "guide-section");
  wrap.append(elWith("h3", null, title));
  if (lead) wrap.append(elWith("p", null, lead));
  return wrap;
}

function rows(items) {
  const list = elWith("div", "guide-rows");
  items.forEach((item) => {
    const row = elWith("div", "guide-row");
    row.append(elWith("span", null, item.label));
    row.append(elWith("strong", null, item.value));
    list.append(row);
  });
  return list;
}

function picker(selected) {
  const games = elWith("div", "guide-games");
  guideGames().forEach((game) => {
    const card = elWith("a", "guide-game" + (game.mode === selected ? " is-on" : ""));
    card.href = game.href;
    const mark = elWith("div", "game-lockup is-guide");
    fillLockup(mark, game.mode);
    card.append(mark);
    card.append(elWith("p", null, game.blurb));
    games.append(card);
  });
  return games;
}

function miniScore() {
  const wrap = elWith("div", "guide-score");
  const box = elWith("div", "score-box");
  const cells = [
    { label: "Time", value: "1:24", help: "How long this run has been going." },
    { label: "Points", value: "220", help: "Total for this run only." },
    { label: "Set", value: "3/182", help: "Countries asked so far / the pool." },
    { label: "Streak", value: "Next +20", help: "Bonus on the next hit. Miss → 0." },
  ];
  cells.forEach((cell, i) => {
    const stat = elWith("div", "stat" + (i === 3 ? " streak" : ""));
    stat.append(elWith("span", "stat-label", cell.label));
    stat.append(elWith("span", "stat-value", cell.value));
    stat.append(elWith("span", "guide-stat-help", cell.help));
    box.append(stat);
  });
  wrap.append(box);
  return wrap;
}

function pips(streak) {
  const row = elWith("span", "streak-pips");
  const filled = Math.max(0, Math.min(5, streak));
  for (let i = 0; i < 5; i += 1) {
    const pip = document.createElement("i");
    if (i < filled) pip.className = "is-on";
    row.append(pip);
  }
  return row;
}

function sampleScore(mode, { streak, points, fire, broke, flare }) {
  const wrap = elWith("div", "guide-fire-sample");
  const heat = comboHeat(broke ? 0 : streak);
  const call = comboCall(broke ? 0 : streak);
  if (flare) {
    const flareHeat = flare.broke ? comboHeat(5) : heat;
    const pop = elWith(
      "div",
      "streak-flare is-show" +
        (flare.max ? " is-max" : "") +
        (flare.broke ? " is-broke" : "") +
        (flareHeat >= 7 ? " is-god" : "") +
        (flareHeat ? ` is-heat-${flareHeat}` : "")
    );
    pop.append(elWith("span", "streak-flare-flames"));
    pop.append(elWith("span", "streak-flare-kicker", flare.kicker));
    pop.append(elWith("span", "streak-flare-pts", flare.pts));
    wrap.append(pop);
  }
  const box = elWith("div", "score-box");
  const mods = [];
  if (broke) mods.push("is-broke");
  else {
    if (call.tier === "hot") mods.push("is-hot");
    if (call.tier === "fire" || call.tier === "god") mods.push("is-fire");
    if (call.tier === "god") mods.push("is-god");
    if (heat) mods.push(`is-heat-${heat}`);
    if (fire && !mods.includes("is-fire")) mods.push("is-fire");
  }
  const streakStat = elWith("div", ["stat", "streak", ...mods].join(" "));
  const label = fire || call.tier === "fire" || call.tier === "god" ? "FIRE" : streak >= 2 ? "Hot" : "Streak";
  const next = streak === 0 ? `Next +${STREAK_STEP}` : `+${streakBonus(streak + 1)}`;
  streakStat.append(elWith("span", "stat-label", label));
  streakStat.append(pips(streak));
  streakStat.append(elWith("span", "stat-value", broke ? "Next +20" : next));
  const cells = [
    ["Time", "1:24"],
    ["Points", String(points)],
    ["Set", "3/182"],
  ];
  cells.forEach(([lab, val]) => {
    const stat = elWith("div", "stat");
    stat.append(elWith("span", "stat-label", lab));
    stat.append(elWith("span", "stat-value", val));
    box.append(stat);
  });
  box.append(streakStat);
  wrap.append(box);
  return wrap;
}

function fireGallery(mode) {
  const first = awardBreakdown({ mode, streak: 1 });
  const hot = awardBreakdown({ mode, streak: 3 });
  const fire = awardBreakdown({ mode, streak: 5 });
  const wrap = elWith("div", "guide-fire");
  const samples = [
    {
      node: sampleScore(mode, { streak: 0, points: 0 }),
      cap: ["Waiting to start. Next hit is just the base: ", String(first.total), "."],
    },
    {
      node: sampleScore(mode, {
        streak: 3,
        points: hot.total,
        flare: { kicker: "HOT STREAK", pts: `+${hot.bonus}` },
      }),
      cap: ["3 in a row: ", String(hot.afterHint), " + ", String(hot.bonus), " = ", String(hot.total), "."],
    },
    {
      node: sampleScore(mode, {
        streak: 5,
        points: fire.total,
        fire: true,
        flare: { kicker: "ON FIRE", pts: `+${fire.bonus}`, max: true },
      }),
      cap: ["5 in a row: ", String(fire.afterHint), " + ", String(fire.bonus), " = ", String(fire.total), "."],
    },
    {
      node: sampleScore(mode, {
        streak: 0,
        points: fire.total,
        broke: true,
        flare: { kicker: "FIRE OUT", pts: `−${fire.bonus}`, broke: true, max: true },
      }),
      cap: ["A miss after a fire streak: ", "0", " this click, you lose the ", String(fire.bonus), " bonus."],
    },
  ];
  samples.forEach((item) => {
    const cap = elWith("p", "guide-fire-cap");
    item.cap.forEach((bit, i) => {
      if (i % 2 === 1) cap.append(elWith("strong", null, bit));
      else cap.append(document.createTextNode(bit));
    });
    item.node.append(cap);
    wrap.append(item.node);
  });
  return wrap;
}

export function renderGuide(boardMode) {
  if (!el.guideBody) return;
  const model = guideModel(boardMode);
  const root = el.guideBody;
  root.innerHTML = "";

  root.append(
    elWith(
      "p",
      "guide-intro",
      model
        ? "This page is only this game. Pick another logo to switch."
        : "Pick a game for how it plays, how the score bar works, and how points add up."
    )
  );
  root.append(picker(boardMode));
  if (!model) return;

  const play = section("How you play");
  const list = document.createElement("ol");
  list.className = "guide-steps";
  model.steps.forEach((parts) => {
    const item = document.createElement("li");
    item.append(rich(parts));
    list.append(item);
  });
  play.append(list);
  const go = elWith("a", "btn-glass is-ok guide-play", "Play this game");
  go.href = model.playHref;
  go.addEventListener("click", () => requestAnimationFrame(() => playLaunch(model.mode)));
  play.append(go);
  root.append(play);

  const score = section(
    "The score bar",
    "Same four cells as in the game. They belong to this run, not the career scoreboard."
  );
  score.append(miniScore());
  root.append(score);

  const scoring = section("A correct answer", model.scoringLead);
  scoring.append(rows(model.scoringRows));
  scoring.append(elWith("p", "guide-note", model.streakLead));
  root.append(scoring);

  const fire = section(
    "Streaks and fire",
    "A hit grows the fire. A miss puts it out and you see how much bonus you lost."
  );
  fire.append(fireGallery(model.mode));
  root.append(fire);

  const repeats = section(
    "Ask a country again",
    "This is a setting for this game only. It does not change the base, except Only misses, which adds the miss-clear bonus."
  );
  const blocks = elWith("div", "guide-repeats");
  model.repeats.forEach((item) => {
    const block = elWith("div", "guide-repeat");
    block.append(elWith("strong", null, item.title));
    block.append(elWith("p", null, item.body));
    blocks.append(block);
  });
  repeats.append(blocks);
  root.append(repeats);

  const notes = section("What resets a score");
  const ul = document.createElement("ul");
  ul.className = "guide-notes";
  model.notes.forEach((note) => {
    ul.append(elWith("li", null, note));
  });
  notes.append(ul);
  root.append(notes);
}
