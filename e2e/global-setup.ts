import { loadFixtures } from './db';

export default async function globalSetup() {
  await loadFixtures();
}
