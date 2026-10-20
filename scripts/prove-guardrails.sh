#!/usr/bin/env bash
#
# Proves the guardrails actually bite.
#
# Each case writes a file that breaks one rule, runs the checker that owns
# that rule, and asserts the checker failed with the expected message. Every
# probe file is removed afterwards. A violation that is not caught fails the
# script.

set -uo pipefail

cd "$(dirname "$0")/.."

WORK_DIR=".guardrail-probes"
PROBE_DOMAIN="src/domain/__guardrail_probe.ts"
PROBE_COMPONENT="src/components/__guardrail_probe.tsx"
PROBE_PAGE="src/app/guardrail-probe/page.tsx"
PROBE_LINT="src/__guardrail_probe.ts"
PROBE_SKIP="src/__guardrail_probe.test.ts"

caught=0
missed=0

cleanup() {
  rm -f "$PROBE_DOMAIN" "$PROBE_COMPONENT" "$PROBE_PAGE" "$PROBE_LINT" "$PROBE_SKIP"
  rm -rf "src/app/guardrail-probe" "$WORK_DIR"
}
trap cleanup EXIT

check() {
  local name="$1"
  local expected_rule="$2"
  shift 2

  local output
  output="$("$@" 2>&1)"
  local status=$?

  if [ "$status" -eq 0 ]; then
    printf 'FAIL %s: the checker exited 0, so the violation was not caught\n' "$name"
    missed=$((missed + 1))
    return
  fi

  if ! printf '%s' "$output" | grep -q "$expected_rule"; then
    printf 'FAIL %s: expected %s in the output, got:\n%s\n' "$name" "$expected_rule" "$output"
    missed=$((missed + 1))
    return
  fi

  printf 'PASS %s: caught by %s\n' "$name" "$expected_rule"
  caught=$((caught + 1))
}

# check_migration_sql <directory>
# The first migration carries the hand written extension and index statements.
# A regenerated migration drops them silently, so they are checked by hand.
check_migration_sql() {
  local directory="$1"
  local sql
  sql="$(cat "$directory"/*.sql 2>/dev/null)"

  local missing=""
  printf '%s' "$sql" | grep -qi "create extension if not exists vector" || missing="$missing vector-extension"
  printf '%s' "$sql" | grep -qi "create extension if not exists pg_trgm" || missing="$missing pg_trgm-extension"
  printf '%s' "$sql" | grep -qi "using hnsw" || missing="$missing hnsw-index"
  printf '%s' "$sql" | grep -qi "memories_embedding_hnsw_idx" || missing="$missing hnsw-index"
  printf '%s' "$sql" | grep -qi "using gin" || missing="$missing gin-index"
  printf '%s' "$sql" | grep -qi "companions_search_idx" || missing="$missing gin-index"

  if [ -n "$missing" ]; then
    printf 'the migrations are missing:%s\n' "$missing"
    return 1
  fi
  return 0
}

# check_agent_block <directory>
# The Next.js agent rules block is written by the installed next. Editing it by
# hand makes the next dev run rewrite it and every later diff carries the churn.
check_agent_block() {
  node scripts/check-agent-block.mjs "$1"
}

# check_capture_cleanup <file>
# The capture script creates an account. It has to delete it and clear its work
# directory, or a capture run leaves a user and scratch files behind.
check_capture_cleanup() {
  local file="$1"
  local missing=""

  grep -q "deleteCaptureUser" "$file" || missing="$missing account-deletion"
  grep -q "rmSync(workDir" "$file" || missing="$missing work-directory-removal"

  if [ -n "$(git ls-files .capture/)" ]; then
    missing="$missing tracked-capture-work"
  fi

  if [ -n "$missing" ]; then
    printf 'the capture script is missing:%s\n' "$missing"
    return 1
  fi
  return 0
}

# check_readme_media <readme> <base directory>
# Every media file the README shows has to exist and have bytes in it.
check_readme_media() {
  local readme="$1"
  local base="$2"
  local missing=""

  local reference
  for reference in $(grep -oE "docs/(media|screenshots)/[A-Za-z0-9._-]+" "$readme" | sort -u); do
    if [ ! -s "$base/$reference" ]; then
      missing="$missing $reference"
    fi
  done

  if [ -n "$missing" ]; then
    printf 'the README references media that is missing or empty:%s\n' "$missing"
    return 1
  fi
  return 0
}

write_domain_probe() {
  cat >"$PROBE_DOMAIN" <<'PROBE'
import { db } from "@/db";

export const probe = db;
PROBE
}

write_component_probe() {
  cat >"$PROBE_COMPONENT" <<'PROBE'
import type { CompanionListItem } from "@/db/companions";

export function GuardrailProbe({ companion }: { companion: CompanionListItem }) {
  return <span>{companion.name}</span>;
}
PROBE
}

write_page_probe() {
  mkdir -p src/app/guardrail-probe
  cat >"$PROBE_PAGE" <<'PROBE'
import { listCategories } from "@/db/companions";

export default function GuardrailProbePage() {
  return <span>{String(listCategories)}</span>;
}
PROBE
}

write_console_probe() {
  cat >"$PROBE_LINT" <<'PROBE'
export function guardrailProbe() {
  console.log("this must not reach production");
}
PROBE
}

write_json_probe() {
  cat >"$PROBE_LINT" <<'PROBE'
export function guardrailProbe(raw: string) {
  return JSON.parse(raw);
}
PROBE
}

write_disable_probe() {
  cat >"$PROBE_LINT" <<'PROBE'
export function guardrailProbe() {
  // eslint-disable-next-line no-console
  console.log("this must not reach production");
}
PROBE
}

write_expect_error_probe() {
  cat >"$PROBE_LINT" <<'PROBE'
export function guardrailProbe(value: { count: number }): number {
  // @ts-expect-error the property does not exist
  return value.missing;
}
PROBE
}

write_skip_probe() {
  cat >"$PROBE_SKIP" <<'PROBE'
import { describe, expect, it } from "vitest";

describe("guardrail probe", () => {
  it.skip("never runs", () => {
    expect(true).toBe(true);
  });
});
PROBE
}

write_migration_probe() {
  mkdir -p "$WORK_DIR/migration"
  cat >"$WORK_DIR/migration/0001_probe.sql" <<'PROBE'
CREATE TABLE "probe" ("id" uuid primary key);
PROBE
}

write_agent_block_probe() {
  mkdir -p "$WORK_DIR/agent"
  sed 's/## This is NOT the Next.js you know/## This is not the Next.js you know/' AGENTS.md \
    >"$WORK_DIR/agent/AGENTS.md"
}

write_capture_probe() {
  mkdir -p "$WORK_DIR/capture"
  grep -v "deleteCaptureUser" scripts/capture-demo.mjs >"$WORK_DIR/capture/capture-demo.mjs"
}

write_readme_probe() {
  mkdir -p "$WORK_DIR/readme"
  sed 's#docs/media/pehchan-demo.gif#docs/media/__missing__.gif#' README.md >"$WORK_DIR/readme/README.md"
}

write_domain_probe
check "domain imports the database layer" "no-restricted-imports" \
  pnpm exec eslint --config eslint.arch.mjs "$PROBE_DOMAIN" --max-warnings=0
cleanup

write_component_probe
check "component imports the database layer" "no-restricted-imports" \
  pnpm exec eslint --config eslint.arch.mjs "$PROBE_COMPONENT" --max-warnings=0
cleanup

write_page_probe
check "page imports the database layer" "no-restricted-imports" \
  pnpm exec eslint --config eslint.arch.mjs "$PROBE_PAGE" --max-warnings=0
cleanup

write_console_probe
check "console log in src" "no-console" \
  pnpm exec eslint "$PROBE_LINT" --max-warnings=0
cleanup

write_json_probe
check "raw JSON parse outside a schema" "no-raw-json-parse" \
  pnpm exec eslint "$PROBE_LINT" --max-warnings=0
cleanup

write_disable_probe
check "inline eslint-disable comment" "no-inline-config" \
  pnpm exec eslint "$PROBE_LINT" --max-warnings=0
cleanup

write_expect_error_probe
check "ts-expect-error comment" "ban-ts-comment" \
  pnpm exec eslint "$PROBE_LINT" --max-warnings=0
cleanup

write_skip_probe
check "skipped test" "no-skipped-tests" \
  pnpm exec eslint "$PROBE_SKIP" --max-warnings=0
cleanup

write_migration_probe
check "migration without the hand written indexes" "missing:" \
  check_migration_sql "$WORK_DIR/migration"
cleanup

write_agent_block_probe
check "nextjs agent rules block edited by hand" "agent rules block" \
  check_agent_block "$WORK_DIR/agent"
cleanup

write_capture_probe
check "capture script without its cleanup" "capture script is missing" \
  check_capture_cleanup "$WORK_DIR/capture/capture-demo.mjs"
cleanup

write_readme_probe
check "README media that is missing" "README references media" \
  check_readme_media "$WORK_DIR/readme/README.md" "$PWD"
cleanup

printf 'prove: %d caught, %d missed\n' "$caught" "$missed"

if [ "$missed" -ne 0 ]; then
  exit 1
fi
