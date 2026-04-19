import { defineConfig } from 'vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'axiom';
const base = process.env.GITHUB_ACTIONS === 'true' ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
  },
});
