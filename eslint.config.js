import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage', '**/.turbo', 'apps/api/drizzle'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/web/public/**/*.js'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Provider + hook no mesmo arquivo é intencional; o ponto de entrada não exporta nada.
    files: [
      'apps/web/src/main.tsx',
      'apps/web/src/lib/theme.tsx',
      'apps/web/src/features/commands/command-palette.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // A camada de domínio não pode depender de nada de fora dela.
    files: ['apps/api/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/application/**',
            '**/infrastructure/**',
            '**/http/**',
            'fastify',
            'drizzle-orm*',
          ],
        },
      ],
    },
  },
  {
    // Casos de uso falam só com portas, nunca com implementações concretas.
    files: ['apps/api/src/application/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/infrastructure/**', '**/http/**', 'fastify', 'drizzle-orm*', 'postgres'] },
      ],
    },
  },
)
