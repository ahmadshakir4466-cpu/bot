#!/usr/bin/env node
/**
 * Futures Lab: Local Connector Interactive CLI
 * Specification: Prompt 2 & Prompt 8
 *
 * SECRETS STAY ON YOUR MACHINE:
 * Exchange API Key, Secret and Passphrase are stored in a local .env file
 * and are NEVER uploaded to cloud, backend, or browser storage.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { LocalExecutionWorker } from './worker.ts';

const CONFIG_FILE = path.resolve(process.cwd(), 'connector', '.connector.json');

function askQuestion(query: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      // Mute stdin or simple masked prompt
      let input = '';
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', function onData(char) {
        const c = char.toString();
        if (c === '\n' || c === '\r' || c === '\u0004') {
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener('data', onData);
          rl.close();
          console.log('');
          resolve(input.trim());
        } else if (c === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (c === '\b' || c === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
    }
  });
}

async function main() {
  console.log('================================================================');
  console.log('  FUTURES LAB — LOCAL EXECUTION CONNECTOR CLI (v1.0.0)');
  console.log('  Official Bitget UTA v3 Demo Trading Integration');
  console.log('  STRICT RESTRICTION: LIVE TRADING DISABLED BY ARCHITECTURE');
  console.log('================================================================\n');

  console.log('Available Commands:');
  console.log('  1. pair            - Pair this device with your Futures Lab web account');
  console.log('  2. set-keys        - Enter Bitget Demo API Key, Secret & Passphrase');
  console.log('  3. test-connection - Test read-only connection (no orders placed)');
  console.log('  4. start           - Start automated strategy loop in EXCHANGE_DEMO');
  console.log('  5. diagnostic-test - Run isolated 1-round-trip DIAGNOSTIC_DEMO test');
  console.log('  6. exit            - Quit\n');

  const action = await askQuestion('Select command (pair | set-keys | test-connection | start | diagnostic-test | exit): ');

  if (action === 'pair') {
    const backendUrl =
      (await askQuestion('Enter Futures Lab Backend URL [http://localhost:3000]: ')) ||
      'http://localhost:3000';
    const code = await askQuestion('Enter 6-digit Pairing Code generated from web dashboard: ');
    const deviceName =
      (await askQuestion('Enter Device Name [e.g. My Laptop Worker]: ')) || 'Local PC Worker';

    try {
      console.log(`\nConnecting to ${backendUrl}/api/connector/pair ...`);
      const res = await fetch(`${backendUrl}/api/connector/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: code,
          deviceName,
          clientVersion: '1.0.0-bitget-uta-v3',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Pairing failed');
      }

      const data = await res.json();
      const config = {
        backendUrl,
        deviceToken: data.deviceToken,
        deviceId: data.device.id,
        pairedAt: new Date().toISOString(),
      };

      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

      console.log('\n[SUCCESS] Connector paired successfully!');
      console.log(`Device ID: ${data.device.id}`);
      console.log('Device token stored securely in local configuration.');
      console.log('Next step: run `npx tsx connector/cli.ts` and select `set-keys`.\n');
    } catch (err: unknown) {
      console.error(`\n[ERROR] ${(err as Error).message}\n`);
    }
  } else if (action === 'set-keys') {
    console.log('\nEnter your Bitget DEMO API Credentials.');
    console.log('Notice: These keys are stored ONLY on this local computer.\n');

    const apiKey = await askQuestion('Bitget Demo API Key: ');
    const apiSecret = await askQuestion('Bitget Demo API Secret: ', true);
    const passphrase = await askQuestion('Bitget Demo API Passphrase: ', true);

    const envPath = path.resolve(process.cwd(), 'connector', '.env.local');
    const content = `BITGET_DEMO_API_KEY="${apiKey}"\nBITGET_DEMO_API_SECRET="${apiSecret}"\nBITGET_DEMO_API_PASSPHRASE="${passphrase}"\n`;

    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, content, 'utf-8');

    console.log('\n[SUCCESS] Credentials saved locally to connector/.env.local');
    console.log('You can now run `test-connection`.\n');
  } else if (action === 'test-connection' || action === 'start' || action === 'diagnostic-test') {
    const envPath = path.resolve(process.cwd(), 'connector', '.env.local');
    if (!fs.existsSync(envPath) || !fs.existsSync(CONFIG_FILE)) {
      console.log('\n[CONFIG REQUIRED]');
      console.log('Missing connector/.connector.json or connector/.env.local.');
      console.log('Please run `pair` and `set-keys` first.\n');
      return;
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const envText = fs.readFileSync(envPath, 'utf-8');
    const apiKeyMatch = envText.match(/BITGET_DEMO_API_KEY="([^"]+)"/);
    const secretMatch = envText.match(/BITGET_DEMO_API_SECRET="([^"]+)"/);
    const passMatch = envText.match(/BITGET_DEMO_API_PASSPHRASE="([^"]+)"/);

    if (!apiKeyMatch || !secretMatch || !passMatch) {
      console.error('Invalid .env.local file. Run `set-keys` again.');
      return;
    }

    const worker = new LocalExecutionWorker({
      backendUrl: config.backendUrl,
      deviceToken: config.deviceToken,
      credentials: {
        apiKey: apiKeyMatch[1],
        apiSecret: secretMatch[1],
        passphrase: passMatch[1],
      },
    });

    if (action === 'test-connection') {
      console.log('\nPerforming read-only Bitget Demo Connection Test...\n');
      try {
        const result = await worker.testConnection();
        console.log('----------------------------------------------------');
        console.log(`  Authentication:         ${result.authenticated ? 'PASSED (200 OK)' : 'FAILED'}`);
        console.log(`  Demo Routing Verified:  ${result.demoRoutingVerified ? 'YES (paptrading: 1 enforced)' : 'NO'}`);
        console.log(`  Server Time Offset:     ${result.serverTimeSyncMs} ms`);
        console.log(`  Round-Trip Latency:     ${result.roundTripLatencyMs} ms`);
        console.log(`  Demo USDT Balance:      $${result.balanceUsdt.toFixed(2)}`);
        console.log(`  Available Margin:       $${result.availableMarginUsdt.toFixed(2)}`);
        console.log(`  Position Mode:          ${result.positionMode}`);
        console.log(`  Margin Mode:            ${result.marginMode}`);
        console.log(`  BTCUSDT Fresh Price:    $${result.marketFreshness.lastPrice.toFixed(2)}`);
        console.log(`  Bid/Ask Spread:         ${result.marketFreshness.spreadPercent.toFixed(3)}%`);
        console.log(`  Existing Positions:     ${result.existingPositionsCount}`);
        console.log('----------------------------------------------------');
        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach((w) => console.log(`  ! ${w}`));
        }
        console.log('\n[TEST CONNECTION COMPLETED SUCCESSFULLY - ZERO ORDERS PLACED]\n');
      } catch (err: unknown) {
        console.error('\n[CONNECTION ERROR]', (err as Error).message);
      }
    } else if (action === 'diagnostic-test') {
      console.log('\nInitiating isolated DIAGNOSTIC_DEMO round trip...');
      const res = await worker.executeDiagnosticRoundTrip();
      console.log(`Result: ${res.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Details: ${res.details}\n`);
    } else if (action === 'start') {
      console.log('\nStarting Local Execution Worker loop...');
      console.log('Press Ctrl+C to terminate cleanly.\n');
      await worker.start();
    }
  } else {
    console.log('Exiting.');
  }
}

if (process.argv[1]?.endsWith('cli.ts')) {
  main().catch(console.error);
}
