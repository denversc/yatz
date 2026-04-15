import { Ansis } from "ansis";

export interface Theme {
  level: number;
  ui: {
    bg: (s: string) => string;
    fg: (s: string) => string;
    header: (s: string) => string;
    current: (s: string) => string;
    separator: (s: string) => string;
    border: (s: string) => string;
    error: (s: string) => string;
  };
  dice: {
    default: (s: string) => string;
    kept: (s: string) => string;
  };
  score: {
    label: (s: string) => string;
    value: (s: string) => string;
    potential: (s: string) => string;
    empty: (s: string) => string;
    sum: (s: string) => string;
  };
}

// Tokyo Night (Night) Colors
const COLORS = {
  bg: "#1a1b26",
  fg: "#c0caf5",
  blue: "#7aa2f7",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  green: "#9ece6a",
  yellow: "#e0af68",
  orange: "#ff9e64",
  red: "#f7768e",
  comment: "#565f89",
  dark3: "#414868",
};

export function createTheme(level?: number): Theme {
  const a = level !== undefined ? new Ansis(level) : new Ansis();

  return {
    level: a.level,
    ui: {
      bg: a.bg(COLORS.bg),
      fg: a.hex(COLORS.fg),
      header: a.hex(COLORS.magenta).bold,
      current: a.hex(COLORS.blue).bold,
      separator: a.hex(COLORS.dark3),
      border: a.hex(COLORS.dark3),
      error: a.hex(COLORS.red).bold,
    },
    dice: {
      default: a.hex(COLORS.cyan),
      kept: a.hex(COLORS.green).bold,
    },
    score: {
      label: a.hex(COLORS.fg),
      value: a.hex(COLORS.green),
      potential: a.hex(COLORS.comment).italic,
      empty: a.hex(COLORS.dark3),
      sum: a.hex(COLORS.comment).italic,
    },
  };
}

export let theme = createTheme();

export function updateTheme(level: number) {
  theme = createTheme(level);
}
