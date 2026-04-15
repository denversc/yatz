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
    bold: (s: string) => string;
    italic: (s: string) => string;
    dim: (s: string) => string;
    underline: (s: string) => string;
    error: (s: string) => string;
    gradient: {
      header: { start: string; end: string };
      border: { start: string; end: string };
    };
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
  darkBlue: "#3d59a1",
  darkGreen: "#41a6b5",
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
      bold: (s: string) => a.bold(s),
      italic: (s: string) => a.italic(s),
      dim: (s: string) => a.dim(s),
      underline: (s: string) => a.underline(s),
      error: a.hex(COLORS.red).bold,
      gradient: {
        header: {
          start: COLORS.magenta,
          end: COLORS.cyan,
        },
        border: {
          start: COLORS.darkGreen,
          end: COLORS.darkBlue,
        },
      },
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


