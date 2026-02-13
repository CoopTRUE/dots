#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import { createInterface } from "readline";

// Parse command line arguments
const args = process.argv.slice(2);
const deployMode = args.includes("--deploy") || args.includes("-d");

// Helper function to execute commands safely
function runCommand(command, errorMessage, options = {}) {
  try {
    return execSync(command, { stdio: "inherit", ...options });
  } catch (error) {
    console.error(`❌ Error: ${errorMessage}`);
    console.error(JSON.stringify(error));
    console.error(error.message);
    process.exit(1);
  }
}

// Helper function to execute commands and capture output
function runCommandSilent(command) {
  try {
    return execSync(command, { stdio: "pipe" }).toString().trim();
  } catch (error) {
    throw error;
  }
}

// Helper function to ask for user input
function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Helper function to normalize git branch names for PlanetScale
function normalizeBranchName(gitBranchName) {
  return gitBranchName
    .replace(/[^a-zA-Z0-9_-]/g, "-") // Replace invalid characters with hyphens
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Handle deploy mode
async function handleDeployMode(
  database,
  branchName,
  organization,
  gitBranchName,
) {
  // Check if the PlanetScale branch exists
  try {
    const branches = JSON.parse(
      runCommandSilent(`pscale branch list ${database} --format json`),
    );
    const branch = branches.find((b) => b.name === branchName);

    if (!branch) {
      console.error(
        `❌ Error: PlanetScale branch '${branchName}' does not exist`,
      );
      console.error(
        "💡 Please create the branch first by running the script without --deploy flag",
      );
      process.exit(1);
    }

    console.log(`✅ Found PlanetScale branch '${branchName}'`);
  } catch (error) {
    console.error("❌ Error: Failed to check PlanetScale branches");
    process.exit(1);
  }

  // Check if deploy request already exists
  let deployRequestExists = false;
  let deployRequestUrl = "";

  try {
    const deployRequests = JSON.parse(
      runCommandSilent(`pscale deploy-request list ${database} --format json`),
    );
    const existingRequest = deployRequests.find(
      (dr) => dr.branch === branchName && dr.into_branch === "dev",
    );

    if (existingRequest) {
      deployRequestExists = true;
      deployRequestUrl = `https://app.planetscale.com/${organization}/${database}/deploy-requests/${existingRequest.number}`;
      console.log(`📋 Deploy request already exists: ${deployRequestUrl}`);
    }
  } catch (error) {
    console.error("❌ Error: Failed to check existing deploy requests");
    process.exit(1);
  }

  // Create deploy request if it doesn't exist
  if (!deployRequestExists) {
    console.log(`🚀 Creating deploy request from '${branchName}' to 'dev'...`);

    try {
      const output = runCommandSilent(
        `pscale deploy-request create ${database} ${branchName} dev --format json`,
      );
      const deployRequest = JSON.parse(output);
      deployRequestUrl = `https://app.planetscale.com/${organization}/${database}/deploy-requests/${deployRequest.number}`;
      console.log(`✅ Deploy request created: ${deployRequestUrl}`);
    } catch (error) {
      console.error("❌ Error: Failed to create deploy request");
      console.error(error.message);
      process.exit(1);
    }
  }

  // Find associated GitHub PR
  try {
    console.log("🔍 Looking for associated GitHub PR...");
    const prOutput = runCommandSilent(
      `gh pr list --head ${gitBranchName} --json number,title,body,url`,
    );
    const prs = JSON.parse(prOutput);

    if (prs.length === 0) {
      console.log("ℹ️  No GitHub PR found for this branch");
      console.log(`📋 Deploy request URL: ${deployRequestUrl}`);
      return;
    }

    const pr = prs[0]; // Use the first PR found
    console.log(`✅ Found PR #${pr.number}: ${pr.title}`);

    // Check if PR description already contains the deploy request link
    const deployRequestText = `## :rotating_light: [PlanetScale DeployRequest](${deployRequestUrl})`;

    if (pr.body && pr.body.includes(deployRequestUrl)) {
      console.log(
        "ℹ️  PR description already contains the deploy request link",
      );
      return;
    }

    // Update PR description
    console.log("📝 Updating PR description...");
    const newBody = pr.body
      ? `${deployRequestText}\n\n${pr.body}`
      : deployRequestText;

    try {
      // Use stdin to pass the body safely, avoiding shell injection
      execSync(`gh pr edit ${pr.number} --body-file -`, {
        input: newBody,
        stdio: ["pipe", "inherit", "inherit"],
      });
      console.log(`✅ Updated PR #${pr.number} with deploy request link`);
      console.log(`🔗 PR URL: ${pr.url}`);
      console.log(`📋 Deploy request URL: ${deployRequestUrl}`);
    } catch (error) {
      console.error("❌ Failed to update PR description");
      console.error(error);
      console.error("💡 You can manually add this to your PR description:");
      console.log(deployRequestText);
    }
  } catch (error) {
    console.error("❌ Error: Failed to find GitHub PR");
    console.log(`📋 Deploy request URL: ${deployRequestUrl}`);
  }
}

// Check if PlanetScale CLI is installed
console.log("🔍 Checking PlanetScale CLI...");
try {
  runCommandSilent("pscale version");
} catch (error) {
  console.error("❌ Error: PlanetScale CLI (pscale) is not installed");
  console.error("💡 Please install it from https://planetscale.com/cli");
  process.exit(1);
}

// Check if user is authenticated with PlanetScale
try {
  runCommandSilent("pscale auth show");
} catch (error) {
  console.error("❌ Error: Not authenticated with PlanetScale CLI");
  console.error('💡 Please run "pscale auth login" first');
  process.exit(1);
}

// Check if gh CLI is installed (needed for deploy mode)
if (deployMode) {
  try {
    runCommandSilent("gh --version");
  } catch (error) {
    console.error("❌ Error: GitHub CLI (gh) is not installed");
    console.error("💡 Please install it from https://cli.github.com/");
    process.exit(1);
  }

  // Check if user is authenticated with gh
  try {
    runCommandSilent("gh auth status");
  } catch (error) {
    console.error("❌ Error: Not authenticated with GitHub CLI");
    console.error('💡 Please run "gh auth login" first');
    process.exit(1);
  }
}

// Check if yarn is available (only needed for branch mode)
if (!deployMode) {
  try {
    runCommandSilent("yarn --version");
  } catch (error) {
    console.error("❌ Error: Yarn is not installed or not in PATH");
    console.error("💡 Please install Yarn first");
    process.exit(1);
  }
}

// Check if we're in a git repository and get current branch name
let gitBranchName;
try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
  gitBranchName = runCommandSilent("git branch --show-current");

  if (!gitBranchName) {
    console.error("❌ Error: Could not determine current git branch");
    console.error(
      "💡 Make sure you're on a named branch (not in detached HEAD state)",
    );
    process.exit(1);
  }

  console.log(`🌿 Current git branch: ${gitBranchName}`);
} catch (error) {
  console.error("❌ Error: Not in a git repository or git not available");
  console.error("💡 Please run this command from within a git repository");
  process.exit(1);
}

// Get organization info
let organization;
try {
  const orgOutput = runCommandSilent("pscale org show --format json");
  const orgData = JSON.parse(orgOutput);
  organization = orgData.org;
  console.log(`🏢 Organization: ${organization}`);
} catch (error) {
  console.error("❌ Error: Failed to get organization information");
  console.error("💡 Make sure you're authenticated with PlanetScale CLI");
  process.exit(1);
}

// Get database info
let database;
try {
  // Get list of available databases
  const output = runCommandSilent("pscale database list --format json");
  const databases = JSON.parse(output);

  if (databases.length === 0) {
    console.error("❌ Error: No databases found");
    console.error(
      "💡 Please create a database first or check your authentication",
    );
    process.exit(1);
  }

  if (databases.length === 1) {
    // Only one database, use it automatically
    database = databases[0].name;
    console.log(`📊 Using database: ${database}`);
  } else {
    // Multiple databases, ask user to choose
    console.log("📊 Multiple databases found:");
    databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${db.name}`);
    });

    const choice = await askQuestion(
      `\n🎯 Which database would you like to use? (1-${databases.length}): `,
    );
    const choiceIndex = parseInt(choice) - 1;

    if (
      isNaN(choiceIndex) ||
      choiceIndex < 0 ||
      choiceIndex >= databases.length
    ) {
      console.error("❌ Error: Invalid choice");
      process.exit(1);
    }

    database = databases[choiceIndex].name;
    console.log(`📊 Using database: ${database}`);
  }
} catch (error) {
  console.error("❌ Error: Failed to get database information");
  console.error(
    "💡 Make sure you have access to at least one PlanetScale database",
  );
  process.exit(1);
}

// Check if 'dev' branch exists
console.log("🔍 Checking if 'dev' branch exists...");
try {
  const branches = JSON.parse(
    runCommandSilent(`pscale branch list ${database} --format json`),
  );
  const devBranch = branches.find((branch) => branch.name === "dev");

  if (!devBranch) {
    console.error("❌ Error: 'dev' branch not found");
    console.error("💡 Please create a 'dev' branch first");
    process.exit(1);
  }

  console.log("✅ 'dev' branch found");
} catch (error) {
  console.error("❌ Error: Failed to check branches");
  process.exit(1);
}

// Normalize git branch name for PlanetScale compatibility
const branchName = normalizeBranchName(gitBranchName);

// Show normalization if the name was changed
if (branchName !== gitBranchName) {
  console.log(
    `🔧 Normalized branch name: '${gitBranchName}' → '${branchName}'`,
  );
}

// Final validation (should pass now, but just to be safe)
if (!/^[a-zA-Z0-9_-]+$/.test(branchName)) {
  console.error(
    `❌ Error: Could not normalize branch name '${gitBranchName}' to valid PlanetScale format`,
  );
  console.error(
    "💡 PlanetScale branch names can only contain letters, numbers, hyphens, and underscores",
  );
  process.exit(1);
}

// Handle deploy mode
if (deployMode) {
  console.log("🚀 Deploy mode: Creating deploy request and updating PR");
  await handleDeployMode(database, branchName, organization, gitBranchName);
  process.exit(0);
}

// Check if anything is running on local MySQL port (3306)
console.log("🔍 Checking local MySQL port...");
try {
  const result = runCommandSilent("lsof -ti:3306");
  if (result) {
    console.error("❌ Error: Something is already running on port 3306");
    console.error("💡 Please stop any local MySQL services before proceeding");
    console.error(`💡 You can kill the process with: kill ${result}`);
    process.exit(1);
  }
  console.log("✅ Port 3306 is available");
} catch (error) {
  // lsof returns non-zero exit code when no processes found, which is what we want
  console.log("✅ Port 3306 is available");
}

// Check if PlanetScale branch already exists
let branchExists = false;
try {
  const branches = JSON.parse(
    runCommandSilent(`pscale branch list ${database} --format json`),
  );
  const existingBranch = branches.find((branch) => branch.name === branchName);

  if (existingBranch) {
    branchExists = true;
    console.log(`📋 PlanetScale branch '${branchName}' already exists`);

    const confirmation = await askQuestion(
      `🤔 Do you want to proceed with pushing schema changes to the existing branch '${branchName}'? (y/N): `,
    );
    if (!confirmation.toLowerCase().match(/^(y|yes)$/)) {
      console.log("❌ Operation cancelled by user");
      process.exit(0);
    }

    console.log(`✅ Proceeding with existing branch '${branchName}'`);
  }
} catch (error) {
  console.error("❌ Error: Failed to check existing branches");
  process.exit(1);
}

// Create new branch from dev if it doesn't exist
if (!branchExists) {
  console.log(
    `🚀 Creating branch '${branchName}' from 'dev' and waiting for it to be ready...`,
  );
  runCommand(
    `pscale branch create ${database} ${branchName} --from dev --wait`,
    "Failed to create branch",
  );

  console.log("✅ Branch is ready!");
} else {
  console.log("📋 Using existing branch");
}

// Connect to the branch (this will start the proxy)
console.log(`🔌 Connecting to branch '${branchName}'...`);
console.log("💡 Starting PlanetScale proxy in the background...");

// Start pscale connect in the background
const connectProcess = spawn("pscale", ["connect", database, branchName], {
  stdio: ["pipe", "pipe", "pipe"],
  detached: false,
});

// Wait a bit for the connection to establish
await new Promise((resolve) => setTimeout(resolve, 5000));

// Check if the connection is working
let connectionReady = false;
let connectionRetries = 0;
const maxConnectionRetries = 12; // 1 minute with 5 second intervals

while (connectionRetries < maxConnectionRetries && !connectionReady) {
  try {
    // Try to connect to localhost:3306 to see if proxy is running
    runCommandSilent("nc -z localhost 3306");
    connectionReady = true;
    console.log("✅ PlanetScale proxy is running");
  } catch (error) {
    console.log(
      `⏳ Waiting for proxy to start... (${connectionRetries + 1}/${maxConnectionRetries})`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    connectionRetries++;
  }
}

if (!connectionReady) {
  console.error("❌ Error: Failed to establish PlanetScale connection");
  connectProcess.kill();
  process.exit(1);
}

// Run yarn prisma db push
console.log("🚀 Running yarn prisma db push...");
try {
  runCommand("yarn prisma db push", "Failed to run Prisma DB push");
  console.log("✅ Prisma DB push completed successfully!");
} catch (error) {
  console.error("❌ Prisma DB push failed");
  connectProcess.kill();
  process.exit(1);
}

// Clean up - kill the connection process
console.log("🧹 Cleaning up...");
connectProcess.kill();

console.log(
  `✨ All done! Branch '${branchName}' has been created and Prisma schema pushed.`,
);
console.log(
  `💡 To connect to this branch again, run: pscale connect ${database} ${branchName}`,
);
