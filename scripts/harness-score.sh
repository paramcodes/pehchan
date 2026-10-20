#!/usr/bin/env bash
#
# Scores the agent harness against the ten criteria.
#
# Every criterion runs a real check. A criterion passes only when its check
# passes. The script exits 0 only when all ten pass.

set -uo pipefail

cd "$(dirname "$0")/.."

passed=0
failed=0

report() {
  local number="$1"
  local status="$2"
  local reason="$3"
  local detail="${4:-}"

  printf '%s %s %s\n' "$status" "$number" "$reason"
  if [ -n "$detail" ]; then
    printf '     %s\n' "$detail"
  fi

  if [ "$status" = "PASS" ]; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
  fi
}

run() {
  local output
  output="$("$@" 2>&1)"
  local status=$?
  LAST_OUTPUT="$output"
  return $status
}

# criterion_1: layer boundaries enforced by a tool.
criterion_1() {
  local probe="src/domain/__harness_probe.ts"
  local reason="pnpm arch passes and rejects a domain file that imports @/db"

  if ! run pnpm arch; then
    report 1 FAIL "$reason" "pnpm arch failed: $(printf '%s' "$LAST_OUTPUT" | tail -3 | tr '\n' ' ')"
    return
  fi

  cat >"$probe" <<'PROBE'
import { db } from "@/db";

export const probe = db;
PROBE

  local output status
  output="$(pnpm exec eslint --config eslint.arch.mjs "$probe" --max-warnings=0 2>&1)"
  status=$?
  rm -f "$probe"

  if [ "$status" -eq 0 ]; then
    report 1 FAIL "$reason" "the arch check accepted a domain file that imports @/db"
    return
  fi

  if ! printf '%s' "$output" | grep -q "no-restricted-imports"; then
    report 1 FAIL "$reason" "the arch check failed for the wrong reason: $output"
    return
  fi

  if ! grep -q "src/domain" eslint.arch.mjs ||
    ! grep -q "src/components" eslint.arch.mjs ||
    ! grep -q "src/app/\*\*/page.tsx" eslint.arch.mjs; then
    report 1 FAIL "$reason" "eslint.arch.mjs does not name all three boundaries"
    return
  fi

  report 1 PASS "$reason"
}

# criterion_2: data functions take the actor.
criterion_2() {
  local reason="every exported src/db function takes an owner, user or viewer id, or is listed with a reason"

  if [ ! -f scripts/public-db-functions.txt ]; then
    report 2 FAIL "$reason" "scripts/public-db-functions.txt is missing"
    return
  fi

  local output status
  output="$(node --input-type=module <<'NODE' 2>&1
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const dbDir = "src/db";
const actorPattern = /\b(userId|ownerId|viewerId|actorId|owner|viewer|user)\b/;

function exportedFunctions(source) {
  const found = [];
  const pattern = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;
  let match = pattern.exec(source);
  while (match) {
    let index = pattern.lastIndex;
    let depth = 1;
    const start = index;
    while (index < source.length && depth > 0) {
      const character = source[index];
      if (character === "(" || character === "{" || character === "[") depth += 1;
      else if (character === ")" || character === "}" || character === "]") depth -= 1;
      index += 1;
    }
    found.push({ name: match[1], params: source.slice(start, index - 1) });
    match = pattern.exec(source);
  }
  return found;
}

const allowlist = new Map();
for (const line of readFileSync("scripts/public-db-functions.txt", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const separator = trimmed.indexOf(" — ");
  if (separator === -1) {
    console.log(`allowlist entry without a reason: ${trimmed}`);
    process.exitCode = 1;
    continue;
  }
  const name = trimmed.slice(0, separator).trim();
  const reason = trimmed.slice(separator + 3).trim();
  if (!reason) {
    console.log(`allowlist entry without a reason: ${trimmed}`);
    process.exitCode = 1;
    continue;
  }
  allowlist.set(name, reason);
}

const files = readdirSync(dbDir).filter(
  (file) => file.endsWith(".ts") && !file.includes(".test.ts"),
);

let failures = 0;
for (const file of files) {
  const source = readFileSync(path.join(dbDir, file), "utf8");
  for (const fn of exportedFunctions(source)) {
    if (actorPattern.test(fn.params)) continue;
    if (allowlist.has(fn.name)) continue;
    console.log(`${fn.name} in ${file} takes no actor id and is not listed in scripts/public-db-functions.txt`);
    failures += 1;
  }
}

for (const name of allowlist.keys()) {
  const exported = files.some((file) =>
    exportedFunctions(readFileSync(path.join(dbDir, file), "utf8")).some((fn) => fn.name === name),
  );
  if (!exported) {
    console.log(`${name} is listed in scripts/public-db-functions.txt but is not an exported src/db function`);
    failures += 1;
  }
}

const chat = readFileSync(path.join(dbDir, "chat.ts"), "utf8");
for (const required of ["listMessages", "appendMessage"]) {
  const pattern = new RegExp(`export\\s+async\\s+function\\s+${required}\\s*\\(([^)]*)`, "s");
  const match = chat.match(pattern);
  if (!match || !/\buserId\b/.test(match[1])) {
    console.log(`${required} in src/db/chat.ts does not take a userId`);
    failures += 1;
  }
}

if (failures > 0) process.exitCode = 1;
NODE
)"
  status=$?

  if [ "$status" -ne 0 ]; then
    report 2 FAIL "$reason" "$(printf '%s' "$output" | head -5 | tr '\n' ' ')"
    return
  fi

  report 2 PASS "$reason"
}

# criterion_3: cross-user integration tests.
criterion_3() {
  local reason="the integration suite proves user B cannot read, append to or rename user A's rows"
  local file="src/db/authorization.integration.test.ts"

  if [ ! -f "$file" ]; then
    report 3 FAIL "$reason" "$file is missing"
    return
  fi

  local expectations=(
    "refuses to read another user's messages"
    "refuses to append to another user's conversation"
    "refuses to read another user's memories"
  )
  for expectation in "${expectations[@]}"; do
    if ! grep -q "$expectation" "$file"; then
      report 3 FAIL "$reason" "the suite has no case named: $expectation"
      return
    fi
  done

  if ! run pnpm exec vitest run --config vitest.integration.config.mts "$file"; then
    report 3 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  report 3 PASS "$reason"
}

# criterion_4: guardrail proof.
criterion_4() {
  local reason="scripts/prove-guardrails.sh writes violating files and every one of them is caught"

  if [ ! -f scripts/prove-guardrails.sh ]; then
    report 4 FAIL "$reason" "scripts/prove-guardrails.sh is missing"
    return
  fi

  if ! run pnpm prove; then
    report 4 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  local caught
  caught="$(printf '%s' "$LAST_OUTPUT" | grep -c '^PASS ')"
  if [ "$caught" -lt 6 ]; then
    report 4 FAIL "$reason" "only $caught violating files were proven, six are required"
    return
  fi

  if printf '%s' "$LAST_OUTPUT" | grep -q "missed"; then
    report 4 PASS "$reason"
    return
  fi

  report 4 FAIL "$reason" "the proof script did not report a miss count"
}

# criterion_5: no escape hatches in src.
criterion_5() {
  local reason="inline lint config, ts-ignore, ts-expect-error and skipped tests are errors in src"

  if ! grep -q "noInlineConfig" eslint.config.mjs; then
    report 5 FAIL "$reason" "eslint.config.mjs does not set linterOptions.noInlineConfig"
    return
  fi

  if ! grep -q "local/no-inline-config" eslint.config.mjs; then
    report 5 FAIL "$reason" "eslint.config.mjs does not turn inline lint config into an error"
    return
  fi

  if ! grep -q "ban-ts-comment" eslint.config.mjs; then
    report 5 FAIL "$reason" "eslint.config.mjs does not configure ban-ts-comment"
    return
  fi

  if ! grep -q '"ts-expect-error": true' eslint.config.mjs; then
    report 5 FAIL "$reason" "eslint.config.mjs does not ban ts-expect-error outright"
    return
  fi

  if ! grep -q "local/no-skipped-tests" eslint.config.mjs; then
    report 5 FAIL "$reason" "eslint.config.mjs does not ban skipped tests"
    return
  fi

  if ! run pnpm lint; then
    report 5 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  report 5 PASS "$reason"
}

# criterion_6: agent entry points.
criterion_6() {
  local reason="CLAUDE.md points at AGENTS.md, AGENTS.md is under 100 lines and every rule names a path that exists"

  if [ ! -f CLAUDE.md ]; then
    report 6 FAIL "$reason" "CLAUDE.md is missing"
    return
  fi

  if [ "$(tr -d '[:space:]' <CLAUDE.md)" != "@AGENTS.md" ]; then
    report 6 FAIL "$reason" "CLAUDE.md does not contain only @AGENTS.md"
    return
  fi

  local lines
  lines="$(grep -c '' AGENTS.md)"
  if [ "$lines" -ge 100 ]; then
    report 6 FAIL "$reason" "AGENTS.md has $lines lines, it must stay under 100"
    return
  fi

  if ! run pnpm exec vitest run --config vitest.config.mts src/test/agents-file.test.ts; then
    report 6 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  report 6 PASS "$reason"
}

# criterion_7: local fast gate.
criterion_7() {
  local reason="a pre-commit hook runs format, lint and typecheck, and pnpm install installs it"

  if [ ! -f lefthook.yml ]; then
    report 7 FAIL "$reason" "lefthook.yml is missing"
    return
  fi

  for command in "pre-commit:" "format-check:" "lint:" "typecheck:"; do
    if ! grep -q "$command" lefthook.yml; then
      report 7 FAIL "$reason" "lefthook.yml has no $command command"
      return
    fi
  done

  if ! grep -q "staged_files" lefthook.yml; then
    report 7 FAIL "$reason" "the lefthook commands do not run on staged files"
    return
  fi

  local prepare
  prepare="$(node -e 'process.stdout.write(require("./package.json").scripts.prepare || "")')"
  if ! printf '%s' "$prepare" | grep -q "lefthook"; then
    report 7 FAIL "$reason" "package.json has no prepare script that installs lefthook"
    return
  fi

  if [ ! -f .git/hooks/pre-commit ]; then
    report 7 FAIL "$reason" "the pre-commit hook is not installed in .git/hooks"
    return
  fi

  report 7 PASS "$reason"
}

# criterion_8: smoke test.
criterion_8() {
  local reason="the production server in mock mode answers five routes with 200 and the expected text"

  if [ ! -f scripts/smoke.mjs ]; then
    report 8 FAIL "$reason" "scripts/smoke.mjs is missing"
    return
  fi

  local smoke_script
  smoke_script="$(node -e 'process.stdout.write(require("./package.json").scripts.smoke || "")')"
  if [ -z "$smoke_script" ]; then
    report 8 FAIL "$reason" "package.json has no smoke script"
    return
  fi

  if ! grep -q "smoke" .github/workflows/ci.yml; then
    report 8 FAIL "$reason" "the CI workflow has no smoke step"
    return
  fi

  if ! run pnpm smoke; then
    report 8 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  local routes_passed
  routes_passed="$(printf '%s' "$LAST_OUTPUT" | grep -c '^PASS /')"
  if [ "$routes_passed" -lt 5 ]; then
    report 8 FAIL "$reason" "only $routes_passed routes passed, five are required"
    return
  fi

  report 8 PASS "$reason"
}

# criterion_9: mistake log and ratchet.
criterion_9() {
  local reason="the mistake log has five real entries and the ratchet names the three step procedure"

  if [ ! -f docs/mistake-log.md ]; then
    report 9 FAIL "$reason" "docs/mistake-log.md is missing"
    return
  fi

  if [ ! -f docs/ratchet.md ]; then
    report 9 FAIL "$reason" "docs/ratchet.md is missing"
    return
  fi

  local entries
  entries="$(grep -c '^| ' docs/mistake-log.md)"
  entries=$((entries - 1))
  if [ "$entries" -lt 5 ]; then
    report 9 FAIL "$reason" "the mistake log has $entries entries, five are required"
    return
  fi

  for step in "strongest layer" "proof case" "log row"; do
    if ! grep -qi "$step" docs/ratchet.md; then
      report 9 FAIL "$reason" "docs/ratchet.md does not mention: $step"
      return
    fi
  done

  if ! grep -q "docs/mistake-log.md" AGENTS.md || ! grep -q "docs/ratchet.md" AGENTS.md; then
    report 9 FAIL "$reason" "AGENTS.md does not link both documents"
    return
  fi

  report 9 PASS "$reason"
}

# criterion_10: operating policy.
criterion_10() {
  local reason="AGENTS.md carries the four operating rules with a reason, and verify:full passes"

  if ! grep -qi "plan before code" AGENTS.md; then
    report 10 FAIL "$reason" "AGENTS.md has no rule about planning before code"
    return
  fi

  if ! grep -qi "one branch or worktree per task" AGENTS.md; then
    report 10 FAIL "$reason" "AGENTS.md has no rule about one branch or worktree per task"
    return
  fi

  if ! grep -qi "never commit to or force-push" AGENTS.md; then
    report 10 FAIL "$reason" "AGENTS.md has no rule about never committing to main"
    return
  fi

  if ! grep -qi "pnpm verify:full" AGENTS.md || ! grep -qi "pnpm smoke" AGENTS.md; then
    report 10 FAIL "$reason" "AGENTS.md does not define done as verify:full plus smoke"
    return
  fi

  if ! run pnpm verify:full; then
    report 10 FAIL "$reason" "$(printf '%s' "$LAST_OUTPUT" | tail -5 | tr '\n' ' ')"
    return
  fi

  report 10 PASS "$reason"
}

criterion_1
criterion_2
criterion_3
criterion_4
criterion_5
criterion_6
criterion_7
criterion_8
criterion_9
criterion_10

printf '\nharness: %d passed, %d failed\n' "$passed" "$failed"

reported=$((passed + failed))
if [ "$reported" -lt 10 ]; then
  printf 'harness: the score did not cover all ten criteria\n'
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi
