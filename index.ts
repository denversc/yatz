import { INITIAL_STATE, reducer, calculateScore } from "./src/reducer";
import { getAIAction } from "./src/ai";
import { parseAndHandleArgs } from "./src/args";
import type { Theme } from "./src/theme";
import { type Action, type Category, type GameState, type Player, totalScoreFromScorecard, upperScoreFromScorecard, bonusScoreFromScorecard } from "./src/types";
import { CATEGORY_NAMES, CATEGORY_ICONS } from "./src/types";
import { Ansis } from "ansis";
import { createInterface as createReadlineInterface, type Interface as ReadlineInterface } from "node:readline/promises";

let state = INITIAL_STATE;

const DICE_FACES = {
  1: ["     ", "  ●  ", "     "],
  2: ["●    ", "     ", "    ●"],
  3: ["●    ", "  ●  ", "    ●"],
  4: ["●   ●", "     ", "●   ●"],
  5: ["●   ●", "  ●  ", "●   ●"],
  6: ["●   ●", "●   ●", "●   ●"],
} as const;

const SCORING_COMMANDS: Record<string, Category> = {
  "1": "ones", "on": "ones", "one": "ones", "ones": "ones",
  "2": "twos", "tw": "twos", "two": "twos", "twos": "twos",
  "3": "threes", "th": "threes", "thr": "threes", "thre": "threes", "three": "threes", "threes": "threes",
  "4": "fours", "fo": "fours", "fou": "fours", "four": "fours", "fours": "fours",
  "5": "fives", "fi": "fives", "fiv": "fives", "five": "fives", "fives": "fives",
  "6": "sixes", "si": "sixes", "six": "sixes", "sixe": "sixes", "sixes": "sixes",
  "3k": "threeOfAKind", "tk": "threeOfAKind",
  "4k": "fourOfAKind", "fk": "fourOfAKind",
  "fh": "fullHouse", "fu": "fullHouse", "ful": "fullHouse", "full": "fullHouse",
  "sm": "smallStraight", "sma": "smallStraight", "smal": "smallStraight", "small": "smallStraight",
  "lg": "largeStraight", "la": "largeStraight", "lar": "largeStraight", "larg": "largeStraight", "large": "largeStraight",
  "ya": "yahtzee", "yah": "yahtzee", "yaht": "yahtzee", "yahtz": "yahtzee", "yahtzee": "yahtzee",
  "ch": "chance", "cha": "chance", "chan": "chance", "chanc": "chance", "chance": "chance",
};

async function printGameState(state: GameState, theme: Theme) {
  if (state.phase === "GAME_OVER") {
    const winner = [...state.players].sort((a, b) => {
      const scoreA = totalScoreFromScorecard(a.scorecard);
      const scoreB = totalScoreFromScorecard(b.scorecard);
      return scoreB - scoreA;
    })[0];
    const winScore = totalScoreFromScorecard(winner.scorecard);
    const info = theme.ui.dim(`${winner.name} wins!`);
    console.log(`\n${theme.ui.header(`≋≋≋≋≋≋≋≋≋≋≋≋ GAME OVER ❯ `)}${theme.ui.header(info)}${theme.ui.header(` ≋≋≋≋≋≋≋≋≋≋≋≋`)}`);
    
    if (state.players.length > 1) {
      const maxNameLen = Math.max(...state.players.map(p => p.name.length));
      const scoreLabelWidth = maxNameLen + 5;
      
      const scoresLines = state.players.map(p => {
        const total = totalScoreFromScorecard(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        return { text: `${paddedName}: ${paddedScore}` };
      });

      const rankedPlayers = [...state.players]
        .map((p, i) => ({ p, score: totalScoreFromScorecard(p.scorecard) }))
        .sort((a, b) => b.score - a.score);

      const rankingsLines = rankedPlayers.map(({ p, score }) => {
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = score.toString().padStart(3);
        return { text: `${paddedName}: ${paddedScore}` };
      });

      const scoresHeaderStr = "Final Scores";
      const scoresHeaderPadding = Math.max(scoreLabelWidth + 4, scoresHeaderStr.length + 4) - scoresHeaderStr.length;
      const scoresHeader = theme.ui.underline(scoresHeaderStr) + " ".repeat(scoresHeaderPadding);
      const rankingsHeader = theme.ui.underline("Final Rankings");
      console.log(`\n${scoresHeader}${rankingsHeader}`);
      for (let i = 0; i < scoresLines.length; i++) {
        const sLine = scoresLines[i].text;
        const rLine = rankingsLines[i].text;
        const linePadding = Math.max(4, scoresHeaderStr.length + 4 - sLine.length);
        console.log(`${theme.ui.fg(sLine)}${" ".repeat(linePadding)}${theme.ui.fg(rLine)}`);
      }
    }
  } else {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const turn = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
    const roll = 3 - state.rollsLeft;
    if (roll === 1) {
      const info = theme.ui.dim(`${currentPlayer.name} ⋄ Turn ${turn}`);
      console.log(`\n${theme.ui.header(`⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ YAHTZEE ❯ `)}${theme.ui.header(info)}${theme.ui.header(` ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿`)}`);
    }
    
    if (state.players.length > 1 && roll <= 1) {
      const maxNameLen = Math.max(...state.players.map(p => p.name.length));
      const scoreLabelWidth = maxNameLen + 7;

      const scoresLines = state.players.map((p, i) => {
        const isCurrent = i === state.currentPlayerIndex;
        const total = totalScoreFromScorecard(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        return {
          text: `${isCurrent ? "> " : "  "}${paddedName}: ${paddedScore}`,
          isCurrent
        };
      });

      const rankedPlayers = [...state.players]
        .map((p, i) => ({ p, originalIndex: i, score: totalScoreFromScorecard(p.scorecard) }))
        .sort((a, b) => b.score - a.score);

      const rankingsLines = rankedPlayers.map(({ p, originalIndex, score }) => {
        const isCurrent = originalIndex === state.currentPlayerIndex;
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = score.toString().padStart(3);
        return {
          text: `${isCurrent ? "> " : "  "}${paddedName}: ${paddedScore}`,
          isCurrent
        };
      });

      const scoresHeader = theme.ui.underline("Scores") + " ".repeat(scoreLabelWidth + 4 - "Scores".length);
      const rankingsHeader = theme.ui.underline("Rankings");
      console.log(`\n${scoresHeader}${rankingsHeader}`);
      for (let i = 0; i < scoresLines.length; i++) {
        const s = scoresLines[i];
        const r = rankingsLines[i];
        const sOut = s.isCurrent ? theme.ui.current(s.text) : theme.ui.fg(s.text);
        const rOut = r.isCurrent ? theme.ui.current(r.text) : theme.ui.fg(r.text);
        console.log(`${sOut}${" ".repeat(4)}${rOut}`);
      }
    }
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (state.phase !== "START") {
    console.log("");
    const CATEGORY_LABELS: Record<string, string> = {
      ones: `${CATEGORY_ICONS.ones} ${CATEGORY_NAMES.ones}`,
      twos: `${CATEGORY_ICONS.twos} ${CATEGORY_NAMES.twos}`,
      threes: `${CATEGORY_ICONS.threes} ${CATEGORY_NAMES.threes}`,
      fours: `${CATEGORY_ICONS.fours} ${CATEGORY_NAMES.fours}`,
      fives: `${CATEGORY_ICONS.fives} ${CATEGORY_NAMES.fives}`,
      sixes: `${CATEGORY_ICONS.sixes} ${CATEGORY_NAMES.sixes}`,
      sum: "∑ sum",
      bonus: "✧ bonus",
      threeOfAKind: `${CATEGORY_ICONS.threeOfAKind} ${CATEGORY_NAMES.threeOfAKind}`,
      fourOfAKind: `${CATEGORY_ICONS.fourOfAKind} ${CATEGORY_NAMES.fourOfAKind}`,
      fullHouse: `${CATEGORY_ICONS.fullHouse} ${CATEGORY_NAMES.fullHouse}`,
      smallStraight: `${CATEGORY_ICONS.smallStraight} ${CATEGORY_NAMES.smallStraight}`,
      largeStraight: `${CATEGORY_ICONS.largeStraight} ${CATEGORY_NAMES.largeStraight}`,
      yahtzee: `${CATEGORY_ICONS.yahtzee} ${CATEGORY_NAMES.yahtzee}`,
      chance: `${CATEGORY_ICONS.chance} ${CATEGORY_NAMES.chance}`,
    };

    const playerColumnWidth = 5;
    const totalScoreWidth = state.players.length * playerColumnWidth;
    const leftWidth = 11 + totalScoreWidth;
    const rightWidth = 16 + totalScoreWidth;

    const getScoreLine = (cat: Category) => {
      const potential = calculateScore(state.dice, cat);
      return state.players.map((p, i) => {
        const isCurrent = i === state.currentPlayerIndex;
        const isGameOver = state.phase === "GAME_OVER";
        let display = "";
        let rawLength = 0;

        if (p.scorecard[cat] !== null) {
          display = theme.score.value(p.scorecard[cat]!.toString());
          if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
          rawLength = p.scorecard[cat]!.toString().length;
        } else if (isCurrent && !isGameOver) {
          if (p.isAI) {
            display = "";
            rawLength = 0;
          } else {
            display = theme.score.potential(`(${potential})`);
            rawLength = `(${potential})`.length;
          }
        } else {
          display = theme.score.empty("·");
          if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
          rawLength = 1;
        }
        
        return display + " ".repeat(playerColumnWidth - rawLength);
      }).join("");
    };

    const upperCategories: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
    const hasAnyUpper = (p: Player) => upperCategories.some(cat => p.scorecard[cat] !== null);
    const anyPlayerHasUpper = state.players.some(hasAnyUpper);

    const upperSumsDisplay = state.players.map((p, i) => {
      const isCurrent = i === state.currentPlayerIndex;
      const isGameOver = state.phase === "GAME_OVER";
      if (!hasAnyUpper(p)) return " ".repeat(playerColumnWidth);
      const sum = upperScoreFromScorecard(p.scorecard);
      let display = theme.score.sum(sum.toString());
      if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
      return display + " ".repeat(playerColumnWidth - sum.toString().length);
    }).join("");

    const bonusDisplay = state.players.map((p, i) => {
      const isCurrent = i === state.currentPlayerIndex;
      const isGameOver = state.phase === "GAME_OVER";
      if (!hasAnyUpper(p)) return " ".repeat(playerColumnWidth);
      const bonus = bonusScoreFromScorecard(p.scorecard);
      let display = bonus > 0 ? theme.score.value(bonus.toString()) : theme.score.sum(bonus.toString());
      if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
      return display + " ".repeat(playerColumnWidth - bonus.toString().length);
    }).join("");

    const leftRows: (Category | "sum" | "bonus" | null)[] = [
      "ones", "twos", "threes", "fours", "fives", "sixes"
    ];
    if (anyPlayerHasUpper) {
      leftRows.push(null, "sum", "bonus");
    }
    const rightRows: (Category | null)[] = [
      "threeOfAKind", "fourOfAKind",
      null,
      "fullHouse", "smallStraight", "largeStraight", "yahtzee",
      null,
      "chance"
    ];

    const getStyledLabel = (key: string, width: number) => {
      const label = CATEGORY_LABELS[key] || key;
      const isGameOver = state.phase === "GAME_OVER";
      const isAvailable = key !== "sum" && key !== "bonus" && currentPlayer.scorecard[key as Category] === null;
      if (!isAvailable) {
        return (key === "sum" || key === "bonus" || isGameOver)
          ? theme.score.label(label.padEnd(width))
          : theme.ui.dim(theme.score.label(label.padEnd(width)));
      }
      const firstSpace = label.indexOf(" ");
      if (firstSpace === -1) return theme.ui.bold(theme.score.label(label.padEnd(width)));
      const icon = label.slice(0, firstSpace);
      const text = label.slice(firstSpace + 1);
      return theme.score.label(icon) + " " + theme.ui.bold(theme.score.label(text.padEnd(width - icon.length - 1)));
    };

    console.log(theme.ui.border(`┌─${"─".repeat(leftWidth)}─┬─${"─".repeat(rightWidth)}─┐`));

    if (state.players.length > 1) {
      const playerHeader = state.players.map((p, i) => {
        const abbr = p.name.includes(" ")
          ? p.name.split(/\s+/).map(w => w.slice(0, 2)).join("")
          : p.name.slice(0, 3);
        const isCurrent = i === state.currentPlayerIndex && state.phase !== "GAME_OVER";
        const display = abbr.padEnd(playerColumnWidth);
        return isCurrent ? theme.ui.current(display) : theme.ui.dim(display);
      }).join("");

      const leftHeader = " ".repeat(9) + "  " + playerHeader;
      const rightHeader = " ".repeat(14) + "  " + playerHeader;
      console.log(theme.ui.border(`│ ${leftHeader} │ ${rightHeader} │`));
      console.log(theme.ui.border(`├─${"─".repeat(leftWidth)}─┼─${"─".repeat(rightWidth)}─┤`));
    }

    const maxLength = Math.max(leftRows.length, rightRows.length);
    for (let i = 0; i < maxLength; i++) {
      let line = theme.ui.border("│ ");

      // Left Column
      const leftItem = leftRows[i];
      if (leftItem === null || i >= leftRows.length) {
        line += " ".repeat(leftWidth);
      } else {
        const styledLabel = getStyledLabel(leftItem, 9);
        if (leftItem === "sum") {
          line += `${styledLabel}: ${upperSumsDisplay}`;
        } else if (leftItem === "bonus") {
          line += `${styledLabel}: ${bonusDisplay}`;
        } else {
          const display = getScoreLine(leftItem as Category);
          line += `${styledLabel}: ${display}`;
        }
      }

      line += theme.ui.border(" │ ");

      // Right Column
      const rightItem = rightRows[i];
      if (rightItem === null || i >= rightRows.length) {
        line += " ".repeat(rightWidth);
      } else {
        const styledLabel = getStyledLabel(rightItem, 14);
        const display = getScoreLine(rightItem);
        line += `${styledLabel}: ${display}`;
      }
      line += theme.ui.border(" │");
      console.log(line);
    }
    console.log(theme.ui.border(`└─${"─".repeat(leftWidth)}─┴─${"─".repeat(rightWidth)}─┘`));
    console.log("");
  }

  if (state.phase === "GAME_OVER") {
    const winner = [...state.players].sort((a, b) => {
      const scoreA = totalScoreFromScorecard(a.scorecard);
      const scoreB = totalScoreFromScorecard(b.scorecard);
      return scoreB - scoreA;
    })[0];
    const winScore = totalScoreFromScorecard(winner.scorecard);
    console.log(theme.ui.current(`Winner: ${winner.name} with ${winScore} pts!`));
  }
}

function getGradientText(text: string, startHex: string, endHex: string, ansis: Ansis): string {
  const startR = parseInt(startHex.slice(1, 3), 16);
  const startG = parseInt(startHex.slice(3, 5), 16);
  const startB = parseInt(startHex.slice(5, 7), 16);

  const endR = parseInt(endHex.slice(1, 3), 16);
  const endG = parseInt(endHex.slice(3, 5), 16);
  const endB = parseInt(endHex.slice(5, 7), 16);

  return text.split("").map((char, i) => {
    const ratio = i / (text.length - 1 || 1);
    const r = Math.round(startR + (endR - startR) * ratio);
    const g = Math.round(startG + (endG - startG) * ratio);
    const b = Math.round(startB + (endB - startB) * ratio);
    const color = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return ansis.hex(color).bold(char);
  }).join("");
}

function getLoopColor(i: number, total: number, startHex: string, midHex: string): string {
  const ratio = i / total;
  const t = ratio < 0.5 ? ratio * 2 : (1 - ratio) * 2;
  
  const startR = parseInt(startHex.slice(1, 3), 16);
  const startG = parseInt(startHex.slice(3, 5), 16);
  const startB = parseInt(startHex.slice(5, 7), 16);

  const endR = parseInt(midHex.slice(1, 3), 16);
  const endG = parseInt(midHex.slice(3, 5), 16);
  const endB = parseInt(midHex.slice(5, 7), 16);

  const r = Math.round(startR + (endR - startR) * t);
  const g = Math.round(startG + (endG - startG) * t);
  const b = Math.round(startB + (endB - startB) * t);
  
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

async function safePrompt(rl: ReadlineInterface, message: string): Promise<string> {
  const onClose = () => {
    console.error("\nERROR: end of input reached unexpectedly");
    process.exit(1);
  };

  rl.addListener("close", onClose);
  try {
    return await rl.question(message);
  } finally {
    rl.removeListener("close", onClose);
  }
}

function printRollMessage(state: GameState, playerName: string, theme: Theme) {
  const keptIndices = state.kept.map((k, i) => k ? i : -1).filter(i => i !== -1);
  const numKept = keptIndices.length;
  const numRolled = 5 - numKept;

  if (numKept === 0) {
    console.log(`${playerName} re-rolled ${theme.ui.italic(theme.ui.bold(`all of the dice`))}`);
  } else {
    const keptValues = keptIndices.map(i => state.dice[i]);
    const rolledDiceWord = numRolled === 1 ? "die" : "dice";
    const keptDiceWord = numKept === 1 ? "die" : "dice";
    console.log(`${playerName} re-rolled ${theme.ui.italic(theme.ui.bold(`${numRolled} ${rolledDiceWord}`))}, kept ${theme.ui.italic(theme.ui.bold(`${numKept} ${keptDiceWord}`))}: [${theme.ui.italic(theme.ui.bold(keptValues.join(" ")))}]`);
  }
}

async function main() {
  const theme = parseAndHandleArgs();
  const ansis = new Ansis(theme.level);
  const rl = createReadlineInterface({ input: process.stdin, output: process.stdout, tabSize: 2 });

  // Setup players
  const welcomeText = " WELCOME TO YAHTZEE ";
  const gradientText = getGradientText(welcomeText, theme.ui.gradient.header.start, theme.ui.gradient.header.end, ansis);
  const width = welcomeText.length;
  const L = 2 * width + 6;
  const start = theme.ui.gradient.border.start;
  const end = theme.ui.gradient.border.end;

  // Top row
  let top = ansis.hex(getLoopColor(0, L, start, end))("▛");
  for (let i = 0; i < width; i++) {
    top += ansis.hex(getLoopColor(i + 1, L, start, end))("▀");
  }
  top += ansis.hex(getLoopColor(width + 1, L, start, end))("▜");
  console.log(top);

  // Middle row
  const left = ansis.hex(getLoopColor(2 * width + 5, L, start, end))("▌");
  const right = ansis.hex(getLoopColor(width + 2, L, start, end))("▐");
  console.log(left + gradientText + right);

  // Bottom row
  let bot = ansis.hex(getLoopColor(2 * width + 4, L, start, end))("▙");
  for (let i = 0; i < width; i++) {
    bot += ansis.hex(getLoopColor(2 * width + 3 - i, L, start, end))("▄");
  }
  bot += ansis.hex(getLoopColor(width + 3, L, start, end))("▟");
  console.log(bot);

  const playerNames: { name: string; isAI: boolean }[] = [];

  while (true) {
    const input = (await safePrompt(rl, "Enter the players (? for help): ")).toLowerCase().trim();

    if (input === "?") {
      console.log("\nEnter a string where each character represents a player:");
      console.log("  'h' : Human player");
      console.log("  'a' : AI player");
      console.log("Example: 'hha' creates two human players and one AI player.");
      console.log("Whitespace is ignored.\n");
      continue;
    }

    const cleanedInput = input.replace(/\s/g, "");
    if (cleanedInput.length === 0) {
      console.log(theme.ui.error("Error: Player string cannot be empty."));
      continue;
    }

    let isValid = true;
    const tempPlayers: { name: string; isAI: boolean }[] = [];
    let humanCount = 0;
    let aiCount = 0;

    for (const char of cleanedInput) {
      if (char === "h") {
        humanCount++;
        tempPlayers.push({ name: `Human ${humanCount}`, isAI: false });
      } else if (char === "a") {
        aiCount++;
        tempPlayers.push({ name: `AI ${aiCount}`, isAI: true });
      } else {
        isValid = false;
        break;
      }
    }

    if (!isValid) {
      console.log(theme.ui.error("Error: Invalid input. Only 'h', 'a', and whitespace are allowed."));
      continue;
    }

    if (humanCount === 1) {
      const human = tempPlayers.find(p => !p.isAI);
      if (human) human.name = "Human";
    }
    if (aiCount === 1) {
      const ai = tempPlayers.find(p => p.isAI);
      if (ai) ai.name = "AI";
    }

    playerNames.push(...tempPlayers);
    break;
  }

  state = reducer(state, { type: "START_GAME", playerNames });

  while (state.phase !== "GAME_OVER") {
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (currentPlayer.isAI) {
      await printGameState(state, theme);
      while (state.players[state.currentPlayerIndex] === currentPlayer && state.phase !== "GAME_OVER") {
        const turnNum = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
        const rollNum = 3 - state.rollsLeft;
        if (rollNum === 1) {
          console.log(`${theme.ui.fg(currentPlayer.name)}, Turn ${turnNum}:`);
        }

        // Draw visual dice
        const diceRows = ["", "", "", "", ""];
        state.dice.forEach((d, i) => {
          const isKept = state.kept[i];
          const t = isKept ? theme.dice.kept : theme.dice.default;
          const face = DICE_FACES[d as keyof typeof DICE_FACES];
          diceRows[0] += t(isKept ? " ╭◜KEEP◝─╮ " : " ╭───────╮ ") + " ";
          diceRows[1] += t(` │ ${face[0]} │ `) + " ";
          diceRows[2] += t(` │ ${face[1]} │ `) + " ";
          diceRows[3] += t(` │ ${face[2]} │ `) + " ";
          diceRows[4] += t(` ╰───────╯ `) + " ";
        });
        diceRows.forEach(row => console.log(row));

        let action = getAIAction(state);
        while (action.type === "TOGGLE_KEEPER" || action.type === "CLEAR_KEEPERS") {
          state = reducer(state, action);
          action = getAIAction(state);
        }

        if (action.type === "SCORE_CATEGORY") {
          const points = calculateScore(state.dice, action.category);
          const rollsUsed = 3 - state.rollsLeft;
          console.log(`${currentPlayer.name} scored ${theme.ui.italic(theme.ui.bold(`${points} points`))} in ${CATEGORY_ICONS[action.category]} ${theme.ui.italic(theme.ui.bold(CATEGORY_NAMES[action.category]))} after ${rollsUsed} roll${rollsUsed > 1 ? "s" : ""}`);
        } else if (action.type === "ROLL_DICE") {
          printRollMessage(state, currentPlayer.name, theme);
        }

        state = reducer(state, action);
      }
    } else {
      await printGameState(state, theme);
      const rollNum = 3 - state.rollsLeft;
      
      // Draw visual dice
      const diceRows = ["", "", "", "", ""]; // top, mid, bot, labels
      state.dice.forEach((d, i) => {
        const isKept = state.kept[i];
        const t = isKept ? theme.dice.kept : theme.dice.default;
        const face = DICE_FACES[d as keyof typeof DICE_FACES];
        
        diceRows[0] += t(isKept ? " ╭◜KEEP◝─╮ " : " ╭───────╮ ") + " ";
        diceRows[1] += t(` │ ${face[0]} │ `) + " ";
        diceRows[2] += t(` │ ${face[1]} │ `) + " ";
        diceRows[3] += t(` │ ${face[2]} │ `) + " ";
        diceRows[4] += t(` ╰───────╯ `) + " ";

      });

      const turnNum = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
      while (true) {
        console.log(`${theme.ui.current(currentPlayer.name)}, Turn ${turnNum}, Roll ${rollNum}:`);
        diceRows.forEach(row => console.log(row));
        const promptText = ` > `;
        const rawInput = (await safePrompt(rl, promptText)).trim();
        const input = rawInput.toLowerCase();

        if (input === "?") {
          console.log(`\n${theme.ui.header("Commands:")}`);
          if (state.phase === "ROLLING") {
            console.log("  rr      : roll all (clears keepers)");
            console.log("  r, ENTER: roll (keeps current keepers)");
            console.log("  k[1-5]  : toggle specified dice and roll (e.g. k125)");
            console.log("  k![1-5] : keep ONLY specified dice and roll (e.g. k!125)");
            console.log("  k[a-g]  : toggle using home row (a=1, s=2, d=3, f=4, g=5)");
            console.log("  [a-g]   : shortcut for k[a-g] (e.g. asf)");
            console.log("  [A-G]   : shortcut for k![a-g] (e.g. ASF)");
            console.log("  d[1-5]  : discard specified dice and roll (keeps others)");
          }
          console.log("  s[cat]  : score in category (e.g. s1, sfh, syahtzee)");
          console.log("  [cat]   : score (non-numeric categories only, e.g. fh, ya)");
          console.log("            Shortcuts: s1-s6, 3k, 4k, fh, sm, lg, ya, ch");
          console.log("  q       : quit (with confirmation)");
          console.log("  q!      : quit immediately");
          console.log("");
          continue;
        }

        if (input === "q") {
          const confirmQuit = (await safePrompt(rl, "Do you really want to quit (y/n)? ")).toLowerCase().trim() || "n";
          if (confirmQuit === "y") {
            process.exit(0);
          }
          continue;
        }

        if (input === "q!") {
          process.exit(0);
        }

        if (input === "rr" && state.phase === "ROLLING") {
          state = reducer(state, { type: "CLEAR_KEEPERS" });
          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if ((input === "r" || input === "") && state.phase === "ROLLING") {
          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (input.startsWith("k!") && state.phase === "ROLLING") {
          const content = input.slice(2).replace(/\s/g, "");
          const mapping: Record<string, number> = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };

          if (content.length === 0) {
            console.log(theme.ui.error("Error: Please specify dice to keep (e.g., k!123 or k!asd)."));
            continue;
          }

          let hasInvalidChar = false;
          const keepIndices = new Set<number>();
          for (const char of content) {
            if (!(char in mapping)) {
              hasInvalidChar = true;
              break;
            }
            keepIndices.add(mapping[char]);
          }

          if (hasInvalidChar) {
            console.log(theme.ui.error("Error: Invalid dice index. Use 1-5 or a,s,d,f,g."));
            continue;
          }

          state = reducer(state, { type: "CLEAR_KEEPERS" });
          for (const index of keepIndices) {
            state = reducer(state, { type: "TOGGLE_KEEPER", index });
          }

          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (input.startsWith("k") && state.phase === "ROLLING") {
          const content = input.slice(1).replace(/\s/g, "");
          const mapping: Record<string, number> = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };
          
          if (content.length === 0) {
            console.log(theme.ui.error("Error: Please specify dice to keep (e.g., k123 or kasd)."));
            continue;
          }

          let hasInvalidChar = false;
          for (const char of content) {
            if (!(char in mapping)) {
              hasInvalidChar = true;
              break;
            }
          }

          if (hasInvalidChar) {
            console.log(theme.ui.error("Error: Invalid dice index. Use 1-5 or a,s,d,f,g."));
            continue;
          }

          for (const char of content) {
            state = reducer(state, { type: "TOGGLE_KEEPER", index: mapping[char] });
          }

          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (/^[asdfg]+$/.test(rawInput) && state.phase === "ROLLING") {
          const mapping: Record<string, number> = {
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };
          for (const char of rawInput) {
            state = reducer(state, { type: "TOGGLE_KEEPER", index: mapping[char] });
          }
          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (/^[ASDFG]+$/.test(rawInput) && state.phase === "ROLLING") {
          const mapping: Record<string, number> = {
            'A': 0, 'S': 1, 'D': 2, 'F': 3, 'G': 4
          };
          state = reducer(state, { type: "CLEAR_KEEPERS" });
          for (const char of rawInput) {
            state = reducer(state, { type: "TOGGLE_KEEPER", index: mapping[char] });
          }
          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (rawInput.startsWith("K") && state.phase === "ROLLING") {
          const content = input.slice(1).replace(/\s/g, "");
          const mapping: Record<string, number> = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };

          if (content.length === 0) {
            console.log(theme.ui.error("Error: Please specify dice to discard (e.g., K123 or Kasd)."));
            continue;
          }

          let hasInvalidChar = false;
          const discardIndices = new Set<number>();
          for (const char of content) {
            if (!(char in mapping)) {
              hasInvalidChar = true;
              break;
            }
            discardIndices.add(mapping[char]);
          }

          if (hasInvalidChar) {
            console.log(theme.ui.error("Error: Invalid dice index. Use 1-5 or a,s,d,f,g."));
            continue;
          }

          state = reducer(state, { type: "CLEAR_KEEPERS" });
          for (let i = 0; i < 5; i++) {
            if (!discardIndices.has(i)) {
              state = reducer(state, { type: "TOGGLE_KEEPER", index: i });
            }
          }

          printRollMessage(state, currentPlayer.name, theme);
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (/^[1-6]$/.test(input)) {
          console.log(theme.ui.error(`Error: Lone number "${input}" is ambiguous. Use "k${input}" to toggle, "k!${input}" to keep only, or "s${input}" to score.`));
          continue;
        } else if (input.startsWith("s") || SCORING_COMMANDS[input] || (state.phase === "SCORING" && input !== "")) {
          let categoryInput = (SCORING_COMMANDS[input] || input).toLowerCase();

          let actualCategory = (Object.keys(currentPlayer.scorecard) as Category[]).find(
            cat => cat.toLowerCase() === categoryInput
          );

          if (!actualCategory && input.startsWith("s") && input.length > 1) {
            const stripped = input.slice(1).trim();
            categoryInput = (SCORING_COMMANDS[stripped] || stripped).toLowerCase();
            actualCategory = (Object.keys(currentPlayer.scorecard) as Category[]).find(
              cat => cat.toLowerCase() === categoryInput
            );
          }
          
          if (!actualCategory) {
            const validCategories = Object.keys(currentPlayer.scorecard);
            console.log(theme.ui.error(`Error: Invalid category. Use one of: ${validCategories.join(", ")}`));
            continue;
          }
          
          if (currentPlayer.scorecard[actualCategory] !== null) {
            console.log(theme.ui.error("Error: Category already scored."));
            continue;
          }

          const points = calculateScore(state.dice, actualCategory);
          const rollsUsed = 3 - state.rollsLeft;
          console.log(`${currentPlayer.name} scored ${theme.ui.italic(theme.ui.bold(`${points} points`))} in ${CATEGORY_ICONS[actualCategory]} ${theme.ui.italic(theme.ui.bold(CATEGORY_NAMES[actualCategory]))} after ${rollsUsed} roll${rollsUsed > 1 ? "s" : ""}`);

          state = reducer(state, { type: "SCORE_CATEGORY", category: actualCategory });
          break;
        } else {
          console.log(theme.ui.error("Error: Invalid command."));
          continue;
        }
      }
    }
  }

  await printGameState(state, theme);
  process.exit(0);
}

main();
