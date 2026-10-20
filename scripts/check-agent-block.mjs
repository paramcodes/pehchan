import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { hasCurrentAgentRules } = require("next/dist/server/lib/generate-agent-files.js");

const directory = process.argv[2] ?? process.cwd();

if (!hasCurrentAgentRules(directory)) {
  console.error("the nextjs agent rules block does not match the installed next");
  process.exit(1);
}
