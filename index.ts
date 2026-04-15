import { INITIAL_STATE, reducer, calculateScore, getTotalScore, getUpperScore, getBonus } from "./src/reducer";
import { getAIAction } from "./src/ai";
import { parseAndHandleArgs } from "./src/args";
import { theme } from "./src/theme";
import type { Action, Category, GameState, Player } from "./src/types";
import { CATEGORY_NAMES, CATEGORY_ICONS } from "./src/types";
import { Ansis } from "ansis";

let ansis = new Ansis();

let state = INITIAL_STATE;

const DICE_FACES = {
  1: ["     ", "  ●  ", "     "],
  2: ["●    ", "     ", "    ●"],
  3: ["●    ", "  ●  ", "    ●"],
  4: ["●   ●", "     ", "●   ●"],
  5: ["●   ●", "  ●  ", "●   ●"],
  6: ["●   ●", "●   ●", "●   ●"],
} as const;

async function printGameState(state: GameState) {
  if (state.phase === "GAME_OVER") {
    const winner = [...state.players].sort((a, b) => {
      const scoreA = getTotalScore(a.scorecard);
      const scoreB = getTotalScore(b.scorecard);
      return scoreB - scoreA;
    })[0];
    const winScore = getTotalScore(winner.scorecard);
    const info = theme.ui.dim(`${winner.name} wins!`);
    console.log(`\n${theme.ui.header(`≋≋≋≋≋≋≋≋≋≋≋≋ GAME OVER ❯ `)}${theme.ui.header(info)}${theme.ui.header(` ≋≋≋≋≋≋≋≋≋≋≋≋`)}`);
    
    if (state.players.length > 1) {
      const maxNameLen = Math.max(...state.players.map(p => p.name.length));
      const scoreLabelWidth = maxNameLen + 5;
      
      const scoresLines = state.players.map(p => {
        const total = getTotalScore(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        return { text: `${paddedName}: ${paddedScore}` };
      });

      const rankedPlayers = [...state.players]
        .map((p, i) => ({ p, score: getTotalScore(p.scorecard) }))
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
        const total = getTotalScore(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        return {
          text: `${isCurrent ? "> " : "  "}${paddedName}: ${paddedScore}`,
          isCurrent
        };
      });

      const rankedPlayers = [...state.players]
        .map((p, i) => ({ p, originalIndex: i, score: getTotalScore(p.scorecard) }))
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

    const upperSumsDisplay = state.players.map((p, i) => {
      const isCurrent = i === state.currentPlayerIndex;
      const isGameOver = state.phase === "GAME_OVER";
      const sum = getUpperScore(p.scorecard);
      let display = theme.score.sum(sum.toString());
      if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
      return display + " ".repeat(playerColumnWidth - sum.toString().length);
    }).join("");

    const bonusDisplay = state.players.map((p, i) => {
      const isCurrent = i === state.currentPlayerIndex;
      const isGameOver = state.phase === "GAME_OVER";
      const bonus = getBonus(p.scorecard);
      let display = bonus > 0 ? theme.score.value(bonus.toString()) : theme.score.sum(bonus.toString());
      if (!isCurrent && !isGameOver) display = theme.ui.dim(display);
      return display + " ".repeat(playerColumnWidth - bonus.toString().length);
    }).join("");

    const leftRows: (Category | "sum" | "bonus" | null)[] = [
      "ones", "twos", "threes", "fours", "fives", "sixes",
      null,
      "sum", "bonus"
    ];
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
      const scoreA = getTotalScore(a.scorecard);
      const scoreB = getTotalScore(b.scorecard);
      return scoreB - scoreA;
    })[0];
    const winScore = getTotalScore(winner.scorecard);
    console.log(theme.ui.current(`Winner: ${winner.name} with ${winScore} pts!`));
  }
}

function getGradientText(text: string, startHex: string, endHex: string): string {
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
function safePrompt(message: string): string {
  const result = prompt(message);
  if (result === null) {
    console.error("\nError: End of input reached.");
    process.exit(1);
  }
  return result;
}

async function main() {
  parseAndHandleArgs();
  ansis = new Ansis(theme.level);

  // Setup players
  const welcomeText = " WELCOME TO YAHTZEE ";
  const gradientText = getGradientText(welcomeText, theme.ui.gradient.header.start, theme.ui.gradient.header.end);
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
    const input = safePrompt("Enter the players (? for help):").toLowerCase().trim();

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

    playerNames.push(...tempPlayers);
    break;
  }

  state = reducer(state, { type: "START_GAME", playerNames });

  while (state.phase !== "GAME_OVER") {
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (currentPlayer.isAI) {
      await printGameState(state);
      while (state.players[state.currentPlayerIndex] === currentPlayer && state.phase !== "GAME_OVER") {
        const turnNum = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
        const rollNum = 3 - state.rollsLeft;
        console.log(`${theme.ui.fg(currentPlayer.name)}, Turn ${turnNum}, Roll ${rollNum}:`);

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
        }

        state = reducer(state, action);
      }
    } else {
      await printGameState(state);
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
        const promptText = ` >`;
        const rawInput = safePrompt(promptText).trim();
        const input = rawInput.toLowerCase();

        if (input === "?") {
          console.log(`\n${theme.ui.header("Commands:")}`);
          if (state.phase === "ROLLING") {
            console.log("  a       : roll all (clears keepers)");
            console.log("  r, ENTER: roll (keeps current keepers)");
            console.log("  k[1-5]  : toggle specified dice and roll (e.g. k125)");
            console.log("  K[1-5]  : keep ONLY specified dice and roll (e.g. K125)");
            console.log("  k[a-g]  : toggle using home row (a=1, s=2, d=3, f=4, g=5)");
            console.log("  d[1-5]  : discard specified dice and roll (keeps others)");
            console.log("  s[cat]  : score in category (e.g. sfh, s 1)");
            console.log("            Shortcuts: 1-6, 3k, 4k, fh, ss, ls, y, c");
          } else {
            console.log("  [cat]   : score in category (e.g. fh, 1)");
            console.log("            Shortcuts: 1-6, 3k, 4k, fh, ss, ls, y, c");
            console.log("  s[cat]  : same as above");
          }
          console.log("  q       : quit (with confirmation)");
          console.log("  q!      : quit immediately");
          console.log("");
          continue;
        }

        if (input === "q") {
          const confirmQuit = safePrompt("Do you really want to quit (y/n)?").toLowerCase().trim() || "n";
          if (confirmQuit === "y") {
            process.exit(0);
          }
          continue;
        }

        if (input === "q!") {
          process.exit(0);
        }

        if (input === "a" && state.phase === "ROLLING") {
          state = reducer(state, { type: "CLEAR_KEEPERS" });
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if ((input === "r" || input === "") && state.phase === "ROLLING") {
          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (rawInput.startsWith("K") && state.phase === "ROLLING") {
          const content = input.slice(1).replace(/\s/g, "");
          const mapping: Record<string, number> = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };

          if (content.length === 0) {
            console.log(theme.ui.error("Error: Please specify dice to keep (e.g., K123 or Kasd)."));
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

          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (input.startsWith("d") && state.phase === "ROLLING") {
          const content = input.slice(1).replace(/\s/g, "");
          const mapping: Record<string, number> = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4
          };

          if (content.length === 0) {
            console.log(theme.ui.error("Error: Please specify dice to discard (e.g., d123 or dasd)."));
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

          state = reducer(state, { type: "ROLL_DICE" });
          break;
        } else if (input.startsWith("s") || (state.phase === "SCORING" && input !== "")) {
          const shortcuts: Record<string, Category> = {
            "1": "ones", "2": "twos", "3": "threes", "4": "fours", "5": "fives", "6": "sixes",
            "3k": "threeOfAKind", "4k": "fourOfAKind", "fh": "fullHouse",
            "ss": "smallStraight", "ls": "largeStraight", "y": "yahtzee", "c": "chance"
          };

          let rawInput = input;
          if (input.startsWith("s") && input.length > 1) {
            const afterS = input.slice(1).replace(/\s/g, "");
            if (shortcuts[afterS] || (Object.keys(currentPlayer.scorecard) as Category[]).some(c => c.toLowerCase() === afterS)) {
              rawInput = afterS;
            }
          }
          
          const categoryInput = (shortcuts[rawInput] || rawInput).toLowerCase();

          const actualCategory = (Object.keys(currentPlayer.scorecard) as Category[]).find(
            cat => cat.toLowerCase() === categoryInput
          );
          
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

  await printGameState(state);
}

main();
