import { parseArgs } from "node:util";
import { createTheme, type Theme } from "./theme";

export function parseAndHandleArgs(): Theme {
  try {
    const { values, positionals } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        help: {
          type: "boolean",
          short: "h",
        },
        color: {
          type: "string",
        },
      },
      strict: true,
      allowPositionals: true,
    });

    if (values.help) {
      printHelp();
      process.exit(0);
    }

    if (positionals.length > 0) {
      console.error(`Error: Argument "${positionals[0]}" is not supported.`);
      console.error("Run with --help for help.");
      process.exit(2);
    }

    if (values.color) {
      if (!["yes", "no", "auto", "16", "256"].includes(values.color)) {
        console.error(`Error: Invalid value for --color: "${values.color}".`);
        console.error("Valid values are: yes, no, auto, 16, 256.");
        console.error("Run with --help for help.");
        process.exit(2);
      }

      if (values.color === "yes") {
        return createTheme(3);
      } else if (values.color === "no") {
        return createTheme(0);
      } else if (values.color === "16") {
        return createTheme(1);
      } else if (values.color === "256") {
        return createTheme(2);
      }
    }

    return createTheme();
  } catch (e: any) {
    if (e.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
      const option = e.message.match(/'(.+)'/)?.[1] || "unknown";
      console.error(`Error: Option "${option}" is not supported.`);
    } else {
      console.error(`Error: ${e.message}`);
    }
    console.error("Run with --help for help.");
    process.exit(2);
  }
}

function printHelp() {
  console.log(`
Usage: yatz [options]

Options:
  -h, --help           Show this help screen
  --color <value>      Use colors in output: yes, no, auto, 16, 256 (default: auto)
`);
}
