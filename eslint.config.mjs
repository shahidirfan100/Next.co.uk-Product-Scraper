/* eslint-disable import-x/no-default-export */
import prettier from 'eslint-config-prettier';

import apify from '@apify/eslint-config/js.js';

export default [
    { files: ['eslint.config.mjs'], rules: { 'import-x/no-default-export': 'off' } },
    { ignores: ['**/dist'] },
    ...apify,
    prettier,
];
