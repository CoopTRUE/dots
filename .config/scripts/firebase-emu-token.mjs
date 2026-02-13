#!/usr/bin/env node

import { input, confirm, password as passwordInput } from '@inquirer/prompts';
import chalk from 'chalk';
import { z } from 'zod';
import { spawn } from 'child_process';

// < check for development environment >
function isDevEnv() {
  return process.env.NODE_ENV?.match(/^dev/);
}
async function confirmEnv() {
  if (isDevEnv()) return;
  const envCheck = await confirm({
    message: 'Your environment is not development, run anyway?',
    default: true
  });
  if (!envCheck) throw new Error('must be in development environment!');
}
// </ check for development environment

// <firebase related code. load envvars and get token logic>
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
/** load env vars from tooks/firebase-token/.env */
function loadFirebaseEnvvars() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return parse(readFileSync(join(__dirname, '..', '.env'), { encoding: 'utf-8' }));
  } catch {
    console.error(`${chalk.redBright('[ERROR]')} could not load env file`);
    process.exit(1);
  }
}

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';

/**
 * works exclusively with the firebase emulator
 * @param {string} email user's email
 * @param {string} password user's password
 * @returns {Promise<string>} firebase id token
 */
function getFirebaseIdToken(email, password) {
  const firebaseEnvs = loadFirebaseEnvvars();
  const firebaseConfig = {
    apiKey: firebaseEnvs.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: firebaseEnvs.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseEnvs.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: firebaseEnvs.NEXT_PUBLIC_FIREBASE_APP_ID
  };
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return signInWithEmailAndPassword(auth, email, password).then((resp) => resp.user.getIdToken());
}
// </firebase related code. load envvars and get token logic>

/** on a mac, copy to clipboard */
function pbcopy(data) {
  const proc = spawn('pbcopy');
  proc.stdin.write(data);
  proc.stdin.end();
}

/**
 * @template Schema
 * @extends {import('zod').ZodTypeAny}
 *
 * @param {Schema} schema
 */
function zodValidate(schema) {
  /**
   * @param {string} newValue
   * @returns {boolean | string }
   */
  return (newValue) => {
    const parsed = schema.safeParse(newValue);
    if (parsed.success) return true;
    return parsed.error.flatten().formErrors.join('\n');
  };
}

/**
 * interactively ask the user for their login information
 * @param {Object} flagArgs
 * @param {string} [flagArgs.email]
 * @param {string} [flagArgs.password]
 */
async function interactiveAuthToken(flagArgs) {
  // <get arguments>
  const email = await input({
    message: 'email:',
    default: flagArgs.email,
    validate: zodValidate(z.string().email('Please enter a valid email'))
  });
  const password =
    flagArgs.password ??
    (await passwordInput({
      message: 'password:',
      mask: true,
      validate: zodValidate(z.string().min(6, 'Must be at least 6 characters long'))
    }));
  let token;
  try {
    token = await getFirebaseIdToken(email, password);
  } catch (e) {
    console.error(`${chalk.redBright('[ERROR]')} Could not get auth token: ${e.code}`);
    process.exit(1);
  }
  // </ get argument>
  const writeToClipboard = await confirm({ message: 'write token to clipboard?', default: true });
  if (writeToClipboard) pbcopy(token);
  else console.log(token);
}

import { parseArgs } from 'node:util';

const {
  values: { help: helpFlag, ...values }
} = parseArgs({
  options: {
    email: { short: 'e', type: 'string' },
    password: { short: 'p', type: 'string' },
    help: { short: 'h', type: 'boolean', default: false }
  }
});

if (helpFlag) {
  console.log(`
GET FIREBASE TOKEN

ENVIRONMENT

  NODE_ENV  If this is not set to something matching /^dev/, confirmation is asked for before proceeding

FLAGS
  if either are not passed, you will be prompted interactively

  -e, --email    <str>  email of user to pull a token for
  -p, --password <str>  password of user to pull token for

EXAMPLES

  firebase-emu-token -e ben+admin@dev.outdoorly.com
`);
  process.exit(0);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'minimum required by firebase')
});

/**
 * if the session is not interactive
 * behave like a cli tool: only printing asked-for information to standard output
 * to better interact with other cli tools
 * This allows the command to easily be combined with other tools on the command line
 */
if (!process.stdout.isTTY) {
  const parsed = loginSchema.safeParse(values);
  if (isDevEnv() && parsed.success) {
    const token = await getFirebaseIdToken(parsed.data.email, parsed.data.password);
    process.stdout.write(token);
  } else {
    console.error(chalk.redBright('[ERROR]'), 'not enough information provided');
    process.exit(1);
  }
} else {
  // process is interactive
  try {
    await confirmEnv();
  } catch (e) {
    console.error(`${chalk.redBright('[ERROR]')} ${e.message}`);
    process.exit(1);
  }
  interactiveAuthToken(values);
}
