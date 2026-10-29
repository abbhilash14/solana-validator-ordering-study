#!/usr/bin/env node
/**
 * Test Suite for Solana Validator Ordering Measurement Harness
 * Verifies:
 * 1. Default DRY_RUN execution
 * 2. 0.05 SOL spend cap guard enforcement & abort on breach
 * 3. Matrix coverage (>= 3 distinct software families)
 * 4. Report schema and artifact persistence
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { SafetySpendManager, TARGET_VALIDATORS, TEST_TRANSACTION_PAIRS, runOrderingStudy } = require('./index');

async function testSpendCapEnforcement() {
  console.log('[Test 1] Testing 0.05 SOL spend cap hard guard...');

  const manager = new SafetySpendManager(50_000_000); // 0.05 SOL in lamports
  assert.strictEqual(manager.capLamports, 50_000_000);
  assert.strictEqual(manager.spentLamports, 0);

  // Spend 10,000 lamports
  manager.recordSpend(10_000, 'Test Tx 1');
  assert.strictEqual(manager.spentLamports, 10_000);

  // Spend up to 49,990,000 lamports (total 50,000,000)
  manager.recordSpend(49_990_000, 'Test Tx 2');
  assert.strictEqual(manager.spentLamports, 50_000_000);

  // Exceed cap by 1 lamport - Must throw immediately
  let threw = false;
  try {
    manager.recordSpend(1, 'Exceeding Tx');
  } catch (err) {
    threw = true;
    assert(err.message.includes('SPEND CAP SAFETY ABORT'), 'Should mention safety abort');
  }
  assert.strictEqual(threw, true, 'SafetySpendManager must throw when exceeding 0.05 SOL cap');

  console.log('✔ Spend cap hard guard strictly prevents expenditures over 0.05 SOL.');
}

async function testValidatorMatrixCoverage() {
  console.log('[Test 2] Testing validator matrix client diversity (>= 3 distinct client software versions)...');

  assert(TARGET_VALIDATORS.length >= 3, 'Must include at least 3 target validators');

  const families = new Set(TARGET_VALIDATORS.map((v) => v.softwareFamily));
  console.log(`Detected client software families: ${Array.from(families).join(', ')}`);

  assert(families.size >= 3, `Expected at least 3 distinct families, got ${families.size}`);
  assert(Array.from(families).some(f => f.includes('Agave')), 'Must include Agave');
  assert(Array.from(families).some(f => f.includes('Jito')), 'Must include Jito');
  assert(Array.from(families).some(f => f.includes('Firedancer') || f.includes('Frankendancer')), 'Must include Firedancer/Frankendancer');

  console.log('✔ Validator matrix covers Agave, Jito-Solana, and Firedancer/Frankendancer.');
}

async function testEndToEndHarnessExecution() {
  console.log('[Test 3] Testing end-to-end measurement harness execution and report generation...');

  await runOrderingStudy();

  const reportFile = path.join(__dirname, 'MEASUREMENT_REPORT.json');
  assert(fs.existsSync(reportFile), 'MEASUREMENT_REPORT.json must be written');

  const raw = fs.readFileSync(reportFile, 'utf8');
  const report = JSON.parse(raw);

  assert.strictEqual(report.metadata.mode, 'DRY_RUN', 'Default mode must be DRY_RUN');
  assert(report.metadata.spendCapSummary.totalSpentLamports <= 50_000_000, 'Spend must be within 0.05 SOL');
  assert(report.results.length >= 3, 'Must contain findings for all validators');
  assert(report.synthesis.primaryDecidingFactor.includes('Priority Fee'), 'Primary rule must be documented');

  console.log('✔ End-to-end measurement study generated valid report artifact.');
}

async function runAll() {
  try {
    await testSpendCapEnforcement();
    await testValidatorMatrixCoverage();
    await testEndToEndHarnessExecution();
    console.log('\n======================================================');
    console.log(' ALL SOLANA VALIDATOR ORDERING TESTS PASSED!');
    console.log('======================================================');
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
}

runAll();
