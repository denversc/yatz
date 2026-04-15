import { INITIAL_STATE, reducer, calculateScore } from "./src/reducer";
import { getAIAction } from "./src/ai";
import { parseAndHandleArgs } from "./src/args";
import { theme } from "./src/theme";
import type { Action, Category, GameState, Player } from "./src/types";

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
  console.log(`\n${theme.ui.header("=== YAHTZEE ===")}`);
  state.players.forEach((p, i) => {
    const isCurrent = i === state.currentPlayerIndex;
    const total = Object.values(p.scorecard).reduce((a, b) => (a || 0) + (b || 0), 0);
    const line = `${isCurrent ? "> " : "  "}${p.name}${p.isAI ? " (AI)" : ""}: ${total} pts`;
    console.log(isCurrent ? theme.ui.current(line) : theme.ui.fg(line));
  });

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (state.phase !== "START" && state.phase !== "GAME_OVER") {
    console.log("");
    const leftCategories: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
    const rightCategories: Category[] = ["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance"];

    const playerColumnWidth = 8; // Increased for color padding safety
    const totalScoreWidth = state.players.length * playerColumnWidth;
    const leftWidth = 9 + totalScoreWidth;
    const rightWidth = 16 + totalScoreWidth;

    const getScoreLine = (cat: Category) => {
      const potential = calculateScore(state.dice, cat);
      return state.players.map((p, i) => {
        let display = "";
        if (p.scorecard[cat] !== null) {
          display = theme.score.value(p.scorecard[cat]!.toString());
        } else {
          display = i === state.currentPlayerIndex 
            ? theme.score.potential(`(${potential})`) 
            : theme.score.empty("·");
        }
        // Manual padding because ANSI strings have invisible length
        const rawLength = p.scorecard[cat] !== null 
          ? p.scorecard[cat]!.toString().length 
          : (i === state.currentPlayerIndex ? `(${potential})`.length : 1);
        
        return display + " ".repeat(playerColumnWidth - rawLength);
      }).join("");
    };

    const upperSumsDisplay = state.players.map(p => {
      const sum = leftCategories.reduce((acc, cat) => acc + (p.scorecard[cat] || 0), 0);
      const display = theme.score.sum(sum.toString());
      return display + " ".repeat(playerColumnWidth - sum.toString().length);
    }).join("");

    console.log(theme.ui.border(`┌─${"─".repeat(leftWidth)}─┬─${"─".repeat(rightWidth)}─┐`));

    const maxLength = Math.max(leftCategories.length + 1, rightCategories.length);
    for (let i = 0; i < maxLength; i++) {
      let line = theme.ui.border("│ ");

      // Left Column
      if (i < leftCategories.length) {
        const leftCat = leftCategories[i];
        const display = getScoreLine(leftCat);
        line += `${theme.score.label(leftCat.padEnd(7))}: ${display}`;
      } else if (i === leftCategories.length) {
        line += `${theme.score.label("sum".padEnd(7))}: ${upperSumsDisplay}`;
      } else {
        line += " ".repeat(leftWidth);
      }

      line += theme.ui.border(" │ ");

      // Right Column
      const rightCat = rightCategories[i];
      if (rightCat) {
        const display = getScoreLine(rightCat);
        line += `${theme.score.label(rightCat.padEnd(14))}: ${display}`;
      } else {
        line += " ".repeat(rightWidth);
      }
      line += theme.ui.border(" │");
      console.log(line);
    }
    console.log(theme.ui.border(`└─${"─".repeat(leftWidth)}─┴─${"─".repeat(rightWidth)}─┘`));
    console.log("");
  }

  if (state.phase === "GAME_OVER") {
    console.log(`\n${theme.ui.header("=== GAME OVER ===")}`);
    const winner = [...state.players].sort((a, b) => {
      const scoreA = Object.values(a.scorecard).reduce((s, v) => (s || 0) + (v || 0), 0);
      const scoreB = Object.values(b.scorecard).reduce((s, v) => (s || 0) + (v || 0), 0);
      return (scoreB || 0) - (scoreA || 0);
    })[0];
    const winScore = Object.values(winner.scorecard).reduce((a, b) => (a || 0) + (b || 0), 0);
    console.log(theme.ui.current(`Winner: ${winner.name} with ${winScore} pts!`));
  }
}

async function main() {
  parseAndHandleArgs();

  // Setup players
  console.log(theme.ui.header("Welcome to Yahtzee!"));
  const numPlayers = parseInt(prompt("Number of players (1-4)?") || "1");
  const playerNames: { name: string; isAI: boolean }[] = [];

  let humanCount = 0;
  let aiCount = 0;

  // Player 1 is always human
  humanCount++;
  playerNames.push({ name: `Player ${humanCount}`, isAI: false });

  for (let i = 1; i < numPlayers; i++) {
    const isAI = (prompt(`Is Player ${i + 1} an AI (y/n)?`) || "n").toLowerCase() === "y";
    if (isAI) {
      aiCount++;
      playerNames.push({ name: `AI ${aiCount}`, isAI: true });
    } else {
      humanCount++;
      playerNames.push({ name: `Player ${humanCount}`, isAI: false });
    }
  }

  state = reducer(state, { type: "START_GAME", playerNames });

  while (state.phase !== "GAME_OVER") {
    await printGameState(state);
    const currentPlayer = state.players[state.currentPlayerIndex];
    const rollNum = 3 - state.rollsLeft;
    
    // Draw visual dice
    const diceRows = ["", "", "", "", ""]; // top, mid, bot, labels
    state.dice.forEach((d, i) => {
      const isKept = state.kept[i];
      const t = isKept ? theme.dice.kept : theme.dice.default;
      const face = DICE_FACES[d as keyof typeof DICE_FACES];
      
      diceRows[0] += t(isKept ? " ╭[KEEP]─╮ " : " ╭───────╮ ") + " ";
      diceRows[1] += t(` │ ${face[0]} │ `) + " ";
      diceRows[2] += t(` │ ${face[1]} │ `) + " ";
      diceRows[3] += t(` │ ${face[2]} │ `) + " ";
      diceRows[4] += t(` ╰───────╯ `) + " ";

    });

    if (currentPlayer.isAI) {
      console.log(`${theme.ui.fg(currentPlayer.name)}, Roll ${rollNum}:`);
      diceRows.forEach(row => console.log(row));
      await new Promise(r => setTimeout(r, 1000)); // Pause for AI "thinking"
      const action = getAIAction(state);
      state = reducer(state, action);
    } else {
      while (true) {
        console.log(`${theme.ui.current(currentPlayer.name)}, Roll ${rollNum}:`);
        diceRows.forEach(row => console.log(row));
        const promptText = ` >`;
        const rawInput = (prompt(promptText) || "").trim();
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
          const confirmQuit = (prompt("Do you really want to quit (y/n)?") || "n").toLowerCase().trim();
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
