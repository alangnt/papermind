import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
  ...next,
  {
    // eslint-config-next does not enable unused-variable detection, which is
    // what catches dead imports and leftover locals.
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
