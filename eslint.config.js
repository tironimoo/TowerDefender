import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/atlas/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { project: false },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  {
    // Die Simulation bleibt rein: keine Grafik, keine Plattform, kein
    // ungezaehmter Zufall und keine Echtzeit. Siehe docs/03-architektur.md.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@render/*', '@app/*', '**/render/**', '**/ui/**', '**/platform/**', 'pixi.js'],
              message:
                'src/sim darf nichts aus Darstellung, Oberflaeche oder Plattform importieren.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'In der Simulation nur den gesetzten Zufallsgenerator aus core/rng.ts nutzen.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Die Simulation kennt keine Echtzeit. Nutze world.tick.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Die Simulation kennt keine Echtzeit. Nutze world.tick.',
        },
      ],
    },
  },
);
