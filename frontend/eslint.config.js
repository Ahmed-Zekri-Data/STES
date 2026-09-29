import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  // The service worker runs in its own context (clients, self, …)
  {
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  // Build tool configs run in Node
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Counts <motion.div> and other JSX tags as uses of their variable
      'react/jsx-uses-vars': 'error',
      // A JSX tag must be imported or defined (a forgotten import crashes the page)
      'react/jsx-no-undef': 'error',
      // ignoreRestSiblings: `const { a, ...rest } = obj` to drop fields on purpose
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Context files export their provider together with its useX() hook, the
  // usual pattern; editing one reloads the page instead of hot-swapping it
  {
    files: ['src/context/*.jsx', 'src/components/animations/AnimationProvider.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]
