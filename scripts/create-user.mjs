#!/usr/bin/env node
// Admin CLI: create a user account directly in the SQLite database while the
// instance is closed to registration, bypassing only the instance-level
// restrictions (the 403s the register endpoint answers with): the
// closed-instance flag and the registration cap.
// The regular email/password validation still applies, exactly like the
// register API. Intended for bootstrapping accounts on an instance where
// registration is switched off or capped. Run it on the same machine (and
// database) as the server. A concurrent write from the server process can
// surface as SQLITE_BUSY — just rerun.

import path from "node:path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  createUser,
  normalizeEmail,
  registrationError,
} from "../src/lib/server/users.js";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const HELP = `Usage:
  npm run create-user -- --email <email> [--password <password>]

Creates a user account directly in the local SQLite database while
registration is disabled or capped. Bypasses the instance-level
registration restrictions (the closed flag and the user cap); the register
API's email/password validation still applies (valid email, at least 8
characters).

Options:
  -e, --email       Required. Email of the new user (trimmed + lowercased,
                    the same normalization sign-in uses).
  -p, --password    Optional. Without it, a 16-character random password is
                    generated and printed once.
  -h, --help        Show this help.

Notes:
  - An already-registered email fails with exit code 1; accounts are never
    updated by this script.
  - Invalid emails or short passwords (< 8 chars) fail like the register API.
  - Database: data/macro-maxxing.db by default, or the location configured
    via the repo .env file (real environment variables take precedence).
  - Exit codes: 0=created, 1=error.
`;

// Next.js loads the repo .env for its own process; a standalone script has to
// do it itself. process.loadEnvFile keeps variables that are already set,
// which matches the documented "shell values beat .env values" precedence, so
// the database location resolves identically here and in the server.
try {
  process.loadEnvFile(path.join(PROJECT_ROOT, ".env"));
} catch {
  // A missing or malformed .env is fine — the real environment still drives.
}

// The database path resolves against the process cwd in src/lib/server/db.js,
// so anchor it to the repo root just like running `next` from the root does.
process.chdir(PROJECT_ROOT);

function parseArgv(argv) {
  const options = { email: undefined, password: undefined, help: false };
  const unexpected = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      if (argv[i + 1] === undefined)
        throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return argv[i];
    };
    switch (arg) {
      case "--email":
      case "-e":
        options.email = value();
        break;
      case "--password":
      case "-p":
        options.password = value();
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        unexpected.push(arg);
    }
  }
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected argument "${unexpected[0]}". Pass --email/--password instead; run with --help for usage.`,
    );
  }
  return options;
}

// 16 chars from an unambiguous alphabet (no l/I, no O/0) — ~93 random bits,
// long enough for the app's storage and easy to retype.
function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i += 1) {
    password += alphabet[randomInt(alphabet.length)];
  }
  return password;
}

function main(argv) {
  const options = parseArgv(argv);
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const email = normalizeEmail(options.email);
  if (email === "") {
    throw new Error(
      "Provide the new user's email with --email (or -e); run with --help for usage.",
    );
  }

  let password = options.password;
  let generated = false;
  if (typeof password !== "string" || password.length === 0) {
    password = generatePassword();
    generated = true;
  }

  // Same validation as POST /api/auth/register (registrationError in
  // src/lib/server/users.js): valid email, password >= 8 chars. Only the
  // instance restrictions are bypassed here, never this.
  const validationError = registrationError({ email: options.email, password });
  if (validationError) {
    throw new Error(validationError);
  }

  const { user, conflict } = createUser(email, password);
  if (!user) {
    if (conflict) {
      throw new Error(
        `${email} is already registered; this script does not update existing accounts.`,
      );
    }
    throw new Error("Could not write the user to the database.");
  }

  process.stdout.write(
    `✓ Created user ${user.email} (id ${user.id})\n` +
      (generated
        ? `  password (generated — save it now, it is not stored anywhere else): ${password}\n`
        : "") +
      "  Written directly to the database; the instance's registration restrictions do not apply here.\n",
  );
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`create-user: ${error?.message ?? error}\n`);
  process.exitCode = 1;
}
