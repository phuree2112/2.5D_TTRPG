import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Module boundaries from Engineering.md §4.2.
const RENDER_LIBS = ['react', 'react-dom', 'react/*', 'three', 'three/*', '@react-three/*'];
const BACKEND_LIBS = ['@supabase/*', 'dexie'];

const pureDomain = {
  group: [...RENDER_LIBS, ...BACKEND_LIBS, '**/ui/**', '**/data/local/**', '**/data/supabase/**'],
  message: 'Domain modules are pure TypeScript: no React, three.js, UI or storage adapters.',
};
const supabaseOnlyInAdapter = {
  group: ['@supabase/*'],
  message: 'Supabase may only be imported in src/data/supabase/ (Engineering.md §4.2).',
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'skill',
      '.claude',
      '.scratch',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', { patterns: [supabaseOnlyInAdapter] }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactRefresh.configs.vite],
  },
  {
    // three.js objects are mutable by design: R3F updates materials, lights and fog in effects
    // and useFrame. The React Compiler immutability rule assumes compiled components, which this
    // project does not use.
    files: ['src/scene/**/*.{ts,tsx}', 'src/tokens/render/**/*.{ts,tsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },
  {
    files: [
      'src/combat/**',
      'src/dice/core/**',
      'src/levels/core/**',
      'src/editor/commands/**',
      'src/scene/core/**',
      'src/ui/tool-rail/core/**',
      'src/tokens/core/**',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [pureDomain, supabaseOnlyInAdapter] }],
    },
  },
  {
    files: ['src/data/**'],
    ignores: ['src/data/supabase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...RENDER_LIBS, '**/ui/**', '**/scene/**'],
              message: 'The data layer has no React or three.js.',
            },
            supabaseOnlyInAdapter,
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/supabase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...RENDER_LIBS, '**/ui/**', '**/scene/**'],
              message: 'The data layer has no React or three.js.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*'],
              message: 'UI reaches three.js only through typed hooks from src/scene.',
            },
            supabaseOnlyInAdapter,
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
