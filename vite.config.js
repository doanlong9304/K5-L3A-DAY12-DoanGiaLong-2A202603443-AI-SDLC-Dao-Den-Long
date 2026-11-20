import { defineConfig } from 'vite';
import { leaderboardPlugin } from './scripts/leaderboard-store.js';

export default defineConfig({
  plugins: [leaderboardPlugin()],
  build: { chunkSizeWarningLimit: 1000 },
});
