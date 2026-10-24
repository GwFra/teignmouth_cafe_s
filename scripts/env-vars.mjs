#!/usr/bin/env node
/**
 * Tracks environment variables declared in .env.example and gets new ones
 * into Vercel as part of a release.
 *
 * Every variable in .env.example carries an annotation in the comment block
 * directly above it saying how it's stored in Vercel:
 *
 *   # @vercel secret   value is sensitive; stored as a Vercel secret
 *   # @vercel config   readable value; stored as a Vercel config variable
 *   # @vercel local    local development only; never synced to Vercel
 *
 * NEXT_PUBLIC_* variables are inlined into the browser bundle, so they can
 * never be secrets.
 *
 * Values never live in this repo. At release time they're read from GitHub
 * Actions: a repository secret (for `secret`) or repository variable (for
 * `config`, or a secret if preferred) with the same name.
 *
 * Usage:
 *   node scripts/env-vars.mjs lint
 *       Fail if any variable is missing a valid annotation.
 *   node scripts/env-vars.mjs comment --base <git-ref>
 *       Print the release PR comment for variables added/removed since
 *       <git-ref> (prints nothing if there are none).
 *   node scripts/env-vars.mjs sync --base <git-ref>
 *       Add variables new since <git-ref> to Vercel's production environment.
 *
 * `comment` and `sync` read GH_SECRETS / GH_VARS (toJSON(secrets) and
 * toJSON(vars) from the workflow) to find values; `sync` also needs
 * VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ENV_FILE = ".env.example";
const KINDS = ["secret", "config", "local"];
const ANNOTATION = /^#\s*@vercel\s+(\S+)\s*$/;
const ASSIGNMENT = /^([A-Z][A-Z0-9_]*)=/;
export const COMMENT_MARKER = "<!-- env-vars-release-check -->";

/**
 * Parses .env.example source into [{ key, kind, line }]. `kind` is null when
 * the variable has no annotation, or the raw text when it's not a known kind.
 */
function parse(source) {
  const vars = [];
  let pendingKind = null;
  source.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (line === "") {
      // An annotation only applies to the comment block it's part of.
      pendingKind = null;
      return;
    }
    if (line.startsWith("#")) {
      const match = line.match(ANNOTATION);
      if (match) pendingKind = match[1];
      return;
    }
    const assignment = line.match(ASSIGNMENT);
    if (assignment) {
      vars.push({ key: assignment[1], kind: pendingKind, line: index + 1 });
    }
    pendingKind = null;
  });
  return vars;
}

function readCurrent() {
  return parse(readFileSync(ENV_FILE, "utf8"));
}

/** Keys declared in .env.example at a git ref (empty if it didn't exist). */
function readKeysAt(ref) {
  if (!ref) return new Set();
  try {
    const source = execFileSync("git", ["show", `${ref}:${ENV_FILE}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(parse(source).map((v) => v.key));
  } catch {
    return new Set();
  }
}

function validate(vars) {
  const errors = [];
  for (const { key, kind, line } of vars) {
    if (kind === null) {
      errors.push(
        `${ENV_FILE}:${line} ${key} has no "# @vercel <${KINDS.join("|")}>" annotation above it`,
      );
    } else if (!KINDS.includes(kind)) {
      errors.push(
        `${ENV_FILE}:${line} ${key} has unknown kind "${kind}" (expected ${KINDS.join(", ")})`,
      );
    } else if (key.startsWith("NEXT_PUBLIC_") && kind === "secret") {
      errors.push(
        `${ENV_FILE}:${line} ${key} is NEXT_PUBLIC_, so it's shipped to the browser and can't be a secret; use config`,
      );
    }
  }
  return errors;
}

function diffSince(base) {
  const current = readCurrent();
  const errors = validate(current);
  if (errors.length > 0) {
    throw new Error(`Invalid ${ENV_FILE}:\n${errors.join("\n")}`);
  }
  const before = readKeysAt(base);
  const currentKeys = new Set(current.map((v) => v.key));
  return {
    added: current.filter((v) => !before.has(v.key)),
    removed: [...before].filter((key) => !currentKeys.has(key)),
  };
}

function readJsonEnv(name) {
  try {
    return JSON.parse(process.env[name] || "{}");
  } catch {
    return {};
  }
}

/**
 * Where a variable's value comes from in GitHub Actions, or null if it isn't
 * set. Secrets must be repository secrets; config may be either, preferring
 * a (readable) repository variable.
 */
function findValue({ key, kind }) {
  const secrets = readJsonEnv("GH_SECRETS");
  const vars = readJsonEnv("GH_VARS");
  if (kind === "config" && vars[key]) {
    return { source: "repository variable", value: vars[key] };
  }
  if (secrets[key]) return { source: "repository secret", value: secrets[key] };
  return null;
}

function parseBase(args) {
  const i = args.indexOf("--base");
  return i === -1 ? "" : (args[i + 1] ?? "");
}

function lint() {
  const errors = validate(readCurrent());
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error(
      `\nAnnotate each variable in ${ENV_FILE} so releases know how to store it in Vercel, e.g.\n\n  # @vercel secret\n  MY_API_SECRET="..."\n`,
    );
    process.exit(1);
  }
  console.log(`${ENV_FILE}: all variables annotated.`);
}

function comment(base) {
  const { added, removed } = diffSince(base);
  if (added.length === 0 && removed.length === 0) return;

  const since = base ? `\`${base}\`` : "the first release";
  const lines = [
    COMMENT_MARKER,
    "### ⚠️ Environment variables changed in this release",
    "",
  ];

  if (added.length > 0) {
    let missing = 0;
    lines.push(
      `New in \`${ENV_FILE}\` since ${since}. When this PR is merged, the deploy adds them to Vercel **Production** before building.`,
      "",
      "| Variable | Type | Value in GitHub Actions |",
      "| --- | --- | --- |",
    );
    for (const v of added) {
      let status;
      if (v.kind === "local") {
        status = "— local only, not synced";
      } else {
        const found = findValue(v);
        if (found) {
          status = `✅ ${found.source}`;
        } else {
          missing += 1;
          status = `❌ add a repository ${v.kind === "secret" ? "secret" : "variable"} named \`${v.key}\``;
        }
      }
      lines.push(`| \`${v.key}\` | ${v.kind} | ${status} |`);
    }
    lines.push("");
    if (missing > 0) {
      lines.push(
        "> [!WARNING]",
        "> Add the missing values under **Settings → Secrets and variables → Actions** before merging. The deploy stops before building if any are missing.",
        "",
      );
    }
  }

  if (removed.length > 0) {
    lines.push(
      `Removed from \`${ENV_FILE}\`: ${removed.map((k) => `\`${k}\``).join(", ")}. These aren't deleted from Vercel automatically; remove them there once this release is live.`,
      "",
    );
  }

  lines.push(
    "<sub>Status as of the last push to `main`. Re-run the Release Please workflow to refresh it after adding values.</sub>",
  );
  console.log(lines.join("\n"));
}

function sync(base) {
  const { added } = diffSince(base);
  const toSync = added.filter((v) => v.kind !== "local");
  if (toSync.length === 0) {
    console.log("No new environment variables to add to Vercel.");
    return;
  }

  // Check everything first so a missing value stops the deploy before
  // anything is half-applied.
  const missing = toSync.filter((v) => !findValue(v));
  if (missing.length > 0) {
    console.error(
      `Missing values in GitHub Actions for: ${missing.map((v) => v.key).join(", ")}\n` +
        "Add them as repository secrets/variables with the same names and re-run the deploy.",
    );
    process.exit(1);
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("VERCEL_TOKEN is not set.");
    process.exit(1);
  }

  for (const v of toSync) {
    const { value } = findValue(v);
    // Value goes over stdin, not argv, so it isn't visible in the process
    // list. --force makes re-running a failed deploy safe.
    const result = spawnSync(
      "vercel",
      [
        "env",
        "add",
        v.key,
        "production",
        "--type",
        v.kind,
        "--force",
        "--yes",
        `--token=${token}`,
      ],
      { input: value, stdio: ["pipe", "inherit", "inherit"] },
    );
    if (result.status !== 0) {
      console.error(`Failed to add ${v.key} to Vercel.`);
      process.exit(result.status ?? 1);
    }
    console.log(`Added ${v.key} to Vercel production as ${v.kind}.`);
  }
}

const [command, ...args] = process.argv.slice(2);
try {
  switch (command) {
    case "lint":
      lint();
      break;
    case "comment":
      comment(parseBase(args));
      break;
    case "sync":
      sync(parseBase(args));
      break;
    default:
      console.error(
        "Usage: env-vars.mjs <lint|comment|sync> [--base <git-ref>]",
      );
      process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
