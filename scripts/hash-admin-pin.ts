// Turns the 6-digit admin PIN into ADMIN_PIN_HASH. Reads the PIN from stdin, so it is not
// saved in shell history. Prints one .env line. Only the hash goes in .env.local and Vercel.
//
//   read -s "PIN?Admin PIN (6 digits): " && echo && printf %s "$PIN" | npm run -s hash-admin-pin >> .env.local; unset PIN

import { hashAdminPin, isAdminPin } from '../lib/pin.ts';

let pin = '';
for await (const chunk of process.stdin) pin += chunk;
pin = pin.trim();

if (!isAdminPin(pin)) {
  console.error('The admin PIN must be exactly 6 digits.');
  process.exit(1);
}
console.log(`ADMIN_PIN_HASH=${await hashAdminPin(pin)}`);
