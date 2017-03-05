module.exports = {
    'extends': 'airbnb-base',
    'plugins': [
        'import'
    ],
    'rules': {
        'indent': ['error', 4],
        'func-names': ['warn', 'as-needed'],
        'no-param-reassign': 'off',
        'class-methods-use-this': 'off',
        'no-shadow': 'off',
        'max-len': 'off',
        'no-return-assign': 'warn',
        'no-underscore-dangle': 'warn',
        'consistent-return': 'warn',
        'global-require': 'warn',
        'no-unused-vars': 'warn',
        'no-self-assign': 'warn',
        'prefer-const': 'warn',
        'no-prototype-builtins': 'warn',
        'no-confusing-arrow': 'warn',
        'array-callback-return': 'warn',
        'no-mixed-operators': 'warn',
        'newline-per-chained-call': 'warn',
        'new-cap': 'warn',
        'no-multi-assign': 'warn',
        'camelcase': 'warn',
        'no-useless-concat': 'warn',
        'no-template-curly-in-string': 'warn',
        'import/no-unresolved': 'warn',
        'no-restricted-syntax': 'warn',
        'default-case': 'warn',
        'import/no-dynamic-require': 'warn',
        'no-use-before-define': 'warn',
        'import/no-extraneous-dependencies': 'warn'
    },
    'parserOptions': {
        'sourceType': 'script'
    }
};
