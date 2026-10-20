import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const agentsPath = path.join(root, "AGENTS.md");
const claudePath = path.join(root, "CLAUDE.md");

type Rule = {
  text: string;
  enforcement: string | null;
};

function readRules(content: string): Rule[] {
  const rules: Rule[] = [];
  let current: string[] | null = null;

  for (const line of content.split("\n")) {
    if (line.startsWith("- ")) {
      if (current) rules.push(makeRule(current));
      current = [line.slice(2).trim()];
      continue;
    }
    if (current && /^ {2,}\S/.test(line)) {
      current.push(line.trim());
      continue;
    }
    if (current) {
      rules.push(makeRule(current));
      current = null;
    }
  }
  if (current) rules.push(makeRule(current));

  return rules;
}

function makeRule(lines: string[]): Rule {
  const text = lines.join(" ");
  const match = text.match(/Enforced by: (\S+)$/);
  return { text, enforcement: match?.[1] ?? null };
}

describe("AGENTS.md", () => {
  const content = readFileSync(agentsPath, "utf8");
  const rules = readRules(content);

  it("stays short enough to be read", () => {
    expect(content.trimEnd().split("\n").length).toBeLessThan(100);
  });

  it("points every rule at an enforcement path", () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.enforcement, `rule without an enforcement path: ${rule.text}`).not.toBeNull();
    }
  });

  it("names an enforcement path that exists", () => {
    for (const rule of rules) {
      const target = rule.enforcement as string;
      expect(existsSync(path.join(root, target)), `${target} does not exist`).toBe(true);
    }
  });

  it("is the only entry point CLAUDE.md needs", () => {
    expect(readFileSync(claudePath, "utf8").trim()).toBe("@AGENTS.md");
  });
});
