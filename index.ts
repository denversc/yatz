import { INITIAL_STATE, reducer, calculateScore, getTotalScore, getUpperScore, getBonus } from "./src/reducer";
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
  if (state.phase === "GAME_OVER") {
    const winner = [...state.players].sort((a, b) => {
      const scoreA = getTotalScore(a.scorecard);
      const scoreB = getTotalScore(b.scorecard);
      return scoreB - scoreA;
    })[0];
    const winScore = getTotalScore(winner.scorecard);
    const info = theme.ui.dim(`${winner.name} wins!`);
    console.log(`\n${theme.ui.header(`≋≋≋≋≋≋ GAME OVER ❯ `)}${theme.ui.header(info)}${theme.ui.header(` ≋≋≋≋≋≋`)}`);
    if (state.players.length > 1) {
      console.log("\nFinal Scores:");
      const maxNameLen = Math.max(...state.players.map(p => p.name.length));
      state.players.forEach(p => {
        const total = getTotalScore(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        console.log(theme.ui.fg(`  ${paddedName}: ${paddedScore}`));
      });
    }
  } else {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const turn = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
    const roll = 3 - state.rollsLeft;
    const info = theme.ui.dim(`${currentPlayer.name} ⋄ Turn ${turn} ⋄ Roll ${roll}`);
    console.log(`\n${theme.ui.header(`⣿⣿⣿⣿⣿⣿ YAHTZEE ❯ `)}${theme.ui.header(info)}${theme.ui.header(` ⣿⣿⣿⣿⣿⣿`)}`);
    if (state.players.length > 1) {
      console.log("\nScores:");
      const maxNameLen = Math.max(...state.players.map(p => p.name.length));
      state.players.forEach((p, i) => {
        const isCurrent = i === state.currentPlayerIndex;
        const total = getTotalScore(p.scorecard);
        const paddedName = p.name.padEnd(maxNameLen);
        const paddedScore = total.toString().padStart(3);
        const line = `${isCurrent ? "> " : "  "}${paddedName}: ${paddedScore}`;
        console.log(isCurrent ? theme.ui.current(line) : theme.ui.fg(line));
      });
    }
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (state.phase !== "START") {
    console.log("");
    const CATEGORY_LABELS: Record<string, string> = {
      ones: "⚀ ones",
      twos: "⚁ twos",
      threes: "⚂ threes",
      fours: "⚃ fours",
      fives: "⚄ fives",
      sixes: "⚅ sixes",
      sum: "∑ sum",
      bonus: "✧ bonus",
      threeOfAKind: "③ 3-of-a-kind",
      fourOfAKind: "④ 4-of-a-kind",
      fullHouse: "⌂ full house",
      smallStraight: "⇀ sm straight",
      largeStraight: "⇉ lg straight",
      yahtzee: "★ yahtzee",
      chance: "❂ chance",
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
      const isAvailable = key !== "sum" && key !== "bonus" && currentPlayer.scorecard[key as Category] === null;
      if (!isAvailable) {
        return (key === "sum" || key === "bonus")
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

async function main() {
  parseAndHandleArgs();

  // Setup players
  console.log(theme.ui.header("Welcome to Yahtzee!"));
  const playerNames: { name: string; isAI: boolean }[] = [];

  while (true) {
    const input = (prompt("Enter the players (? for help):") || "").toLowerCase().trim();

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
        const rollNum = 3 - state.rollsLeft;
        const action = getAIAction(state);
        
        if (action.type === "TOGGLE_KEEPER") {
          state = reducer(state, action);
          continue;
        }

        const turnNum = Object.values(currentPlayer.scorecard).filter(v => v !== null).length + 1;
        console.log(`${theme.ui.fg(currentPlayer.name)}, Turn ${turnNum}, Roll ${rollNum}:`);
        const isLastRoll = action.type === "SCORE_CATEGORY";
        const diceToPrint = state.dice;
        const keptToPrint = isLastRoll ? [false, false, false, false, false] : state.kept;

        const diceRows = ["", "", "", "", ""];
        diceToPrint.forEach((d, i) => {
          const isKept = keptToPrint[i];
          const t = isKept ? theme.dice.kept : theme.dice.default;
          const face = DICE_FACES[d as keyof typeof DICE_FACES];
          diceRows[0] += t(isKept ? " ╭[KEEP]─╮ " : " ╭───────╮ ") + " ";
          diceRows[1] += t(` │ ${face[0]} │ `) + " ";
          diceRows[2] += t(` │ ${face[1]} │ `) + " ";
          diceRows[3] += t(` │ ${face[2]} │ `) + " ";
          diceRows[4] += t(` ╰───────╯ `) + " ";
        });
        diceRows.forEach(row => console.log(row));
        
        if (action.type === "SCORE_CATEGORY") {
          const points = calculateScore(state.dice, action.category);
          const rollsUsed = 3 - state.rollsLeft;
          console.log(`${currentPlayer.name} scored ${points} points in ${action.category} after ${rollsUsed} roll${rollsUsed > 1 ? "s" : ""}`);
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
        
        diceRows[0] += t(isKept ? " ╭[KEEP]─╮ " : " ╭───────╮ ") + " ";
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

          const points = calculateScore(state.dice, actualCategory);
          const rollsUsed = 3 - state.rollsLeft;
          console.log(`${currentPlayer.name} scored ${points} points in ${actualCategory} after ${rollsUsed} roll${rollsUsed > 1 ? "s" : ""}`);

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
