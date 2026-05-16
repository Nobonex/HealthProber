import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import signalPrefixRule from './eslint-rules/signal-prefix.rule.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
    {
        ignores: ['dist/**', '.angular/**', 'coverage/**', 'node_modules/**'],
    },
    {
        files: ['src/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                project: ['./tsconfig.eslint.json'],
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            local: {
                rules: {
                    'signal-prefix': signalPrefixRule,
                },
            },
        },
        rules: {
            '@angular-eslint/no-input-rename': 'off',
            '@angular-eslint/no-output-on-prefix': 'off',
            '@angular-eslint/prefer-inject': 'error',
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
            'local/signal-prefix': 'error',
            'object-curly-spacing': ['error', 'always'],
        },
    },
    {
        files: ['src/**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
        ],
    }
);
