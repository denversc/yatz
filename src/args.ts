import { parseArgs } from "node:util";

export function parseAndHandleArgs() {
  try {
    const { values, positionals } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        help: {
          type: "boolean",
          short: "h",
        },
      },
      strict: true,
      allowPositionals: true, // We will manually reject them for specific error messages
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
  } catch (e: any) {
    // parseArgs throws for unknown options when strict is true
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
  -h, --help    Show this help screen
`);
}
