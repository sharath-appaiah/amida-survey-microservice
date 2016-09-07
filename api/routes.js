'use strict';

const auth = require('./auth');

module.exports = function (app) {
    app.use('/api/v1.0/auth', require('./auth'));

    app.use('/api/v1.0/ethnicities', require('./api/ethnicity'));
    app.use('/api/v1.0/genders', require('./api/gender'));
    app.use('/api/v1.0/user', require('./api/user'));
    app.use('/api/v1.0/surveys', require('./api/survey'));
    app.use('/api/v1.0/registries', require('./api/registry'));
};
