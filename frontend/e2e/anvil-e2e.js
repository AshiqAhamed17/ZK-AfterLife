// Real end-to-end run of register -> checkIn is skipped -> trigger grace ->
// prove (in-browser, real UltraHonk) -> executeWill -> claim, driving the
// actual frontend UI in real Chrome against a local Anvil devnet running the
// genuine contracts (HonkVerifier/WillVerifier/Poseidon/InheritanceRegistry).
// MockUSDC/MockSelfVerifier stand in for the real ERC20 and Self Protocol hub
// only because those cannot be exercised without a public network / a real
// passport scan. See contracts/script/DeployLocalE2E.s.sol.
//
// Usage: node e2e/anvil-e2e.js
// Requires: anvil running on :8545 with DeployLocalE2E.s.sol already
// broadcast, and `npm run dev` serving the app on :3000 with .env.local
// pointing at that deployment.

const { chromium } = require("playwright-core");
const { poseidon } = require("circomlibjs");

const APP_URL = "http://localhost:3000";
const RPC_URL = "http://localhost:8545";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Anvil's default deterministic test accounts (mnemonic "test test test ... junk").
const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const BENEFICIARY = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const ETH_AMOUNT = "0.01";
const USDC_AMOUNT = "50";
const USDC_DECIMALS = 6n;

function log(msg) {
  console.log(`[e2e] ${msg}`);
}

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method} failed: ${json.error.message}`);
  return json.result;
}

function injectWallet(page, account) {
  return page.addInitScript((acct) => {
    window.ethereum = {
      isMetaMask: true,
      chainId: "0x7a69",
      selectedAddress: acct,
      request: async ({ method, params }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [acct];
        const res = await fetch("http://localhost:8545", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params: params || [] }),
        });
        const json = await res.json();
        if (json.error) {
          const err = new Error(json.error.message);
          err.code = json.error.code;
          throw err;
        }
        return json.result;
      },
      on: () => {},
      removeListener: () => {},
    };
  }, account);
}

async function connectWallet(page) {
  await page.locator("main").getByRole("button", { name: "Connect wallet" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Connect wallet"), { timeout: 15000 });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

// Mirrors InheritanceRegistry.claim()'s tree walk / the on-chain PoseidonT3/T5
// construction (see contracts/test/InheritanceRegistry.t.sol _buildTree).
function computeSingleBeneficiaryProof(addr, ethWei, usdcBaseUnits) {
  const h2 = (a, b) => BigInt(poseidon([a, b]));
  const h4 = (a, b, c, d) => BigInt(poseidon([a, b, c, d]));

  const bh = [h4(BigInt(addr), ethWei, usdcBaseUnits, 0n), 0n, 0n, 0n, 0n, 0n, 0n, 0n];
  const l1 = [h2(bh[0], bh[1]), h2(bh[2], bh[3]), h2(bh[4], bh[5]), h2(bh[6], bh[7])];
  const l2 = [h2(l1[0], l1[1]), h2(l1[2], l1[3])];
  const root = h2(l2[0], l2[1]);

  return {
    root,
    leafIndex: 0,
    siblings: [bh[1], l1[1], l2[1]],
  };
}

function toHex32(v) {
  return "0x" + v.toString(16).padStart(64, "0");
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  try {
    // ---- 1. Register (owner) ----
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    ownerPage.on("console", (m) => {
      if (m.type() === "error") log(`[owner console] ${m.text()}`);
    });
    await injectWallet(ownerPage, OWNER);

    log("Navigating to /register");
    await ownerPage.goto(`${APP_URL}/register`, { waitUntil: "domcontentloaded" });
    await connectWallet(ownerPage);

    log("Waiting for on-chain Self verification to be picked up");
    await ownerPage.getByRole("button", { name: "Continue" }).click({ timeout: 15000 });

    log("Step 1: description");
    await ownerPage
      .getByPlaceholder("A short note about this will and any instructions.")
      .fill("E2E test will");
    await ownerPage.getByRole("button", { name: "Next" }).click();

    log("Step 2: beneficiary");
    await ownerPage.getByLabel("Name").fill("Bob");
    await ownerPage.getByLabel("Address").fill(BENEFICIARY);
    await ownerPage.getByLabel("ETH").fill(ETH_AMOUNT);
    await ownerPage.getByLabel("USDC").fill(USDC_AMOUNT);
    await ownerPage.getByRole("button", { name: "Next" }).click();

    // 0.001 days ≈ 86s — comfortably above the contract's 60s floor
    // (MIN_INACTIVITY_PERIOD/MIN_GRACE_PERIOD) while keeping the harness fast.
    // Real users choose days/months here; this value only exists to make a
    // real-time E2E run practical.
    log("Step 3: trusted circle + timing");
    await ownerPage.getByLabel("Inactivity period (days)").fill("0.001");
    await ownerPage.getByLabel("Grace period (days)").fill("0.001");
    await ownerPage.getByLabel("Member 01").fill(OWNER);
    await ownerPage.getByLabel("Veto threshold").fill("1");
    await ownerPage.getByRole("button", { name: "Next" }).click();

    log("Step 4: review -> seal will (real on-chain register tx)");
    await ownerPage.getByRole("button", { name: "Seal will" }).click();
    await ownerPage.getByText("Your will is sealed.").waitFor({ timeout: 30000 });

    await ownerPage.getByRole("button", { name: "Toggle commitment visibility" }).click();
    const commitment = await ownerPage.locator("code.font-mono.text-\\[13px\\].text-ink").first().innerText();
    const pageText = await ownerPage.locator("main").innerText();
    const saltMatch = pageText.match(/will salt \(([a-z0-9]+)\)/i);
    if (!saltMatch) throw new Error("Could not scrape willSalt from success screen");
    const willSalt = saltMatch[1];

    log(`Registered. commitment=${commitment} willSalt=${willSalt}`);

    // ---- 2. Trigger grace period once inactivity elapses (real wall clock) ----
    log("Waiting for inactivity period to elapse (real time)...");
    await sleep(95000);

    log("Navigating to /execute to trigger grace period");
    await ownerPage.goto(`${APP_URL}/execute`, { waitUntil: "domcontentloaded" });
    await ownerPage.waitForFunction(() => !document.body.innerText.includes("Loading wills"), { timeout: 15000 });

    // Cards only render a truncated commitment ("0x1234··abcd"), not the
    // full hex, so scope by that instead of the full commitment string —
    // there may be other wills from prior runs still sitting on this chain.
    const truncated = commitment.slice(0, 6) + "··" + commitment.slice(-4);
    const willCard = ownerPage.locator("div.rounded-card", { hasText: truncated });
    await willCard.getByRole("button", { name: "Trigger grace period" }).click({ timeout: 15000 });
    await ownerPage.waitForTimeout(3000);
    log("Grace period triggered.");

    // ---- 3. Execute once grace elapses (real proof, real tx) ----
    log("Waiting for grace period to elapse (real time)...");
    await sleep(95000);

    await ownerPage.reload({ waitUntil: "domcontentloaded" });
    await ownerPage.getByRole("button", { name: "Refresh" }).click();
    await ownerPage.waitForTimeout(2000);

    await willCard.getByRole("button", { name: "Execute" }).click();
    await ownerPage.getByLabel("Will salt").fill(willSalt);
    await ownerPage.getByLabel("Description").fill("E2E test will");
    await ownerPage.getByLabel("Address").fill(BENEFICIARY);
    await ownerPage.getByLabel("ETH").fill(ETH_AMOUNT);
    await ownerPage.getByLabel("USDC").fill(USDC_AMOUNT);

    log("Generating real UltraHonk proof in-browser (this can take a while)...");
    await ownerPage.getByRole("button", { name: "Generate proof & execute" }).click();
    await ownerPage.getByText("Will executed. Assets distributed.").waitFor({ timeout: 180000 });
    log("Will executed on-chain with a real proof.");

    // ---- 4. Claim (beneficiary) ----
    log("Computing beneficiary Merkle proof locally (mirrors on-chain Poseidon tree)");
    const ethWei = BigInt(Math.round(parseFloat(ETH_AMOUNT) * 1e18));
    const usdcBaseUnits = BigInt(USDC_AMOUNT) * 10n ** USDC_DECIMALS;
    const { leafIndex, siblings } = computeSingleBeneficiaryProof(BENEFICIARY, ethWei, usdcBaseUnits);

    const beneficiaryBalanceBefore = BigInt(await rpc("eth_getBalance", [BENEFICIARY, "latest"]));

    const benCtx = await browser.newContext();
    const benPage = await benCtx.newPage();
    benPage.on("console", (m) => {
      if (m.type() === "error") log(`[beneficiary console] ${m.text()}`);
    });
    await injectWallet(benPage, BENEFICIARY);

    log("Navigating to /claims as the beneficiary");
    await benPage.goto(`${APP_URL}/claims`, { waitUntil: "domcontentloaded" });
    await connectWallet(benPage);

    await benPage.getByLabel("Will commitment").fill(commitment);
    await benPage.getByLabel("Your ETH share").fill(ETH_AMOUNT);
    await benPage.getByLabel("Your USDC share").fill(USDC_AMOUNT);
    await benPage.getByLabel("Leaf index (0-7)").fill(String(leafIndex));
    await benPage.getByLabel("Sibling hash 1 of 3").fill(toHex32(siblings[0]));
    await benPage.getByLabel("Sibling hash 2 of 3").fill(toHex32(siblings[1]));
    await benPage.getByLabel("Sibling hash 3 of 3").fill(toHex32(siblings[2]));

    await benPage.getByRole("button", { name: "Claim" }).click();
    await benPage.getByText("Claim sent. Your share is on the way.").waitFor({ timeout: 30000 });

    await benPage.waitForTimeout(2000);
    const beneficiaryBalanceAfter = BigInt(await rpc("eth_getBalance", [BENEFICIARY, "latest"]));
    const gained = beneficiaryBalanceAfter - beneficiaryBalanceBefore;
    log(`Beneficiary ETH balance delta: ${gained} wei (expected ~${ethWei} wei, minus its own gas)`);

    if (gained <= 0n) {
      throw new Error("Beneficiary balance did not increase after claim");
    }

    log("E2E PASSED: register -> prove -> verify -> claim, all real, against local Anvil.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[e2e] FAILED:", err);
  process.exit(1);
});
