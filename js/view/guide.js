import { guideModel } from "../game/score-copy.js";
import { el } from "./dom.js";

function elWith(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function section(title, lead) {
  const wrap = elWith("section", "guide-section");
  wrap.append(elWith("h3", null, title));
  if (lead) wrap.append(elWith("p", null, lead));
  return wrap;
}

function rows(items, className = "guide-rows") {
  const list = elWith("div", className);
  items.forEach((item) => {
    const row = elWith("div", "guide-row");
    row.append(elWith("span", null, item.label));
    row.append(elWith("strong", null, item.value));
    list.append(row);
  });
  return list;
}

export function renderGuide() {
  if (!el.guideBody) return;
  const model = guideModel();
  const root = el.guideBody;
  root.innerHTML = "";

  root.append(elWith("p", "guide-intro", model.intro));

  const play = section("The games");
  const games = elWith("div", "guide-games");
  model.games.forEach((game) => {
    const card = elWith("a", "guide-game");
    card.href = game.href;
    card.append(elWith("h4", null, game.title));
    card.append(elWith("p", null, game.blurb));
    games.append(card);
  });
  play.append(games);
  root.append(play);

  const scoring = section("Scoring", model.scoringLead);
  scoring.append(rows(model.scoringRows));
  root.append(scoring);

  const streak = section("Streaks", model.streakLead);
  const table = elWith("table", "guide-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Streak", "Bonus", "Map total"].forEach((label) => {
    headRow.append(elWith("th", null, label));
  });
  head.append(headRow);
  const body = document.createElement("tbody");
  model.ladder.forEach((row) => {
    const tr = document.createElement("tr");
    tr.append(elWith("td", null, row.label));
    tr.append(elWith("td", "num", row.bonus ? `+${row.bonus}` : "—"));
    tr.append(elWith("td", "num", String(row.total)));
    body.append(tr);
  });
  table.append(head, body);
  streak.append(table);
  streak.append(elWith("p", "guide-note", model.ladderNote));
  root.append(streak);

  const examples = section("Examples");
  examples.append(rows(model.examples));
  root.append(examples);

  const repeats = section(
    "Ask a country again",
    "This is a setting per game. It does not change the base, except Only misses which adds the miss-clear bonus."
  );
  const list = elWith("div", "guide-repeats");
  model.repeats.forEach((item) => {
    const block = elWith("div", "guide-repeat");
    block.append(elWith("strong", null, item.title));
    block.append(elWith("p", null, item.body));
    list.append(block);
  });
  repeats.append(list);
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
