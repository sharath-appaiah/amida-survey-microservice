'use strict';

const _ = require('lodash');
const config = require('./config');

const swaggerTools = require('swagger-tools');

const models = require('./models');
const db = require('./models/db');

const swaggerJson = require('./swagger.json');
const security = require('./security');
const logger = require('./logger');
const jsutil = require('./lib/jsutil');

/* jshint unused:false*/
const errHandler = function (err, req, res, next) { // eslint-disable-line no-unused-vars
    logger.error(err);
    err = jsutil.errToJSON(err);
    if ((!res.statusCode) || (res.statusCode < 300)) {
        res.statusCode = 500;
    }
    res.json(err);
};

const userAudit = function (req, res, next) {
    const userId = _.get(req, 'user.id');
    if (userId) {
        const operationSpec = _.get(req, 'swagger.operationPath', ['', '', '']);
        let endpoint = operationSpec[1];
        const operation = operationSpec[2];
        if (req.swagger.params) {
            _.forOwn(req.swagger.params, (description, name) => {
                const value = description && description.value;
                if (value && _.get(description, 'schema.in') === 'path') {
                    endpoint = endpoint.replace(`{${name}}`, value);
                }
            });
        }
        db.UserAudit.create({ userId, endpoint, operation });
    }
    next();
};

/* jshint unused:false*/
const modelsSupplyFn = function (inputModels) {
    return function modelsSupply(req, res, next) { // eslint-disable-line no-unused-vars
        req.models = inputModels;
        next();
    };
};

exports.initialize = function (app, options, callback) {
    const swaggerObject = options.swaggerJson || swaggerJson;
    swaggerTools.initializeMiddleware(swaggerObject, (middleware) => {
        app.use(middleware.swaggerMetadata());

        app.use(middleware.swaggerValidator({
            validateResponse: true,
        }));

        app.use(modelsSupplyFn(models));

        app.use(middleware.swaggerSecurity(security));

        app.use(userAudit);

        app.use(middleware.swaggerRouter({
            useStubs: false,
            ignoreMissingHandlers: true,
            controllers: './controllers',
        }));

        app.use(middleware.swaggerUi());

        app.use(errHandler);

        models.sequelize.sync({
            force: config.env === 'test',
        }).then(() => {
            callback(null, app);
        });
    });
};
