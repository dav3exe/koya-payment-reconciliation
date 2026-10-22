// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts are numbers or strings, some with thousands separators ("4,804.15").
function parseAmount(raw) {
  if (typeof raw === "number") return raw;
  return Number(String(raw).replace(/,/g, "").trim());
}

// Only the latest attempt (by ts) for each txn_id counts. Ties: later line wins.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (const line of lines) {
  if (line.trim().length === 0) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line
  }
  if (event === null || typeof event !== "object" || !event.txn_id) continue;

  const time = Date.parse(event.ts);
  const prev = latest.get(event.txn_id);
  if (!prev || time >= prev.time) latest.set(event.txn_id, { time, event });
}

let total = 0;
let count = 0;
for (const { event } of latest.values()) {
  if (event.status === "success") {
    const amount = parseAmount(event.amount);
    if (Number.isNaN(amount)) throw new Error(`Bad amount: ${JSON.stringify(event)}`);
    total += amount;
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
