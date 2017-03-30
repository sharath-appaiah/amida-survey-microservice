/* global it*/

'use strict';

const _ = require('lodash');

const config = require('../../../config');
const models = require('../../../models');
const appGenerator = require('../../../app-generator');
const generator = require('../../../models/generator');
const searchCommon = require('./search-common');
const RRSuperTest = require('../rr-super-test');
const SharedIntegration = require('../shared-integration');

const Tests = class BaseTests {
    constructor() {
        this.registries = _.range(2).map((index) => {
            const registry = { name: `name_${index}`, schema: `schema_${index}` };
            return registry;
        });
        this.schemas = ['current'];
        this.registries.forEach(({ schema }) => this.schemas.push(schema));
        this.dbs = ['recregone', 'recregtwo'];
        this.servers = {};
        this.apps = {};
        this.ports = { recregone: 9006, recregtwo: 9007 };
        this.registries.push({
            name: 'name_2',
            url: 'http://localhost:9006/api/v1.0',
        });
        this.registries.push({
            name: 'name_3',
            url: 'http://localhost:9007/api/v1.0',
        });
    }

    prepareSystemFn() {
        const self = this;
        return function prepareSystem() {
            it('drop all schemas', function dropAllSchemas() {
                return models.sequelize.dropAllSchemas();
            });

            self.schemas.forEach((schema) => {
                it(`create schema ${schema}`, function createSchema() {
                    return models.sequelize.createSchema(schema);
                });
            });

            self.dbs.forEach((db) => {
                it(`create database ${db}`, function createDatabase() {
                    const dropdbSql = `DROP DATABASE IF EXISTS ${db}`;
                    const createdbSql = `CREATE DATABASE ${db}`;
                    return models.sequelize.query(dropdbSql)
                            .then(() => models.sequelize.query(createdbSql));
                });
            });

            it(self.initMessage, self.initializeFn());
        };
    }

    startServerFn(dbname) {
        const self = this;
        return function startServer(done) {
            const app = appGenerator.newExpress();
            const m = generator('public', dbname);
            const configClone = _.cloneDeep(config);
            configClone.env = 'development';

            appGenerator.initialize(app, { models: m, config: configClone }, (err) => {
                if (err) {
                    done(err);
                } else {
                    self.servers[dbname] = app.listen(self.ports[dbname], () => {
                        self.apps[dbname] = app;
                        done();
                    });
                }
            });
        };
    }

    closeServerSequelizeFn(dbname) {
        const self = this;
        return function closeServerSeqeulize() {
            return self.apps[dbname].locals.models.sequelize.close();
        };
    }

    closeServerFn(dbname) {
        const self = this;
        return function closeServer(done) {
            return self.servers[dbname].close(done);
        };
    }
};

const SpecTests = class FederalSearchSpecTests extends Tests {
    constructor() {
        super();
        this.models = generator(this.schemas);
        this.modelsdb0 = generator('public', 'recregone');
        this.modelsdb1 = generator('public', 'recregtwo');
        this.initMessage = 'sync models';
        this.searchTestsMap = this.schemas.reduce((r, schema, index) => {
            const m = this.models[schema];
            const searchTests = new searchCommon.SpecTests(m, index * 7, 4, false);
            r.set(schema, searchTests);
            return r;
        }, new Map());
        this.searchTestsMap.set('recregone', new searchCommon.SpecTests(this.modelsdb0, 5, 4, false));
        this.searchTestsMap.set('recregtwo', new searchCommon.SpecTests(this.modelsdb1, 10, 4, false));
    }

    initializeFn() {
        const self = this;
        return function initialize() {
            return self.models.sequelize.sync({ force: true })
                .then(() => self.modelsdb0.sequelize.sync({ force: true }))
                .then(() => self.modelsdb1.sequelize.sync({ force: true }));
        };
    }
};

const IntegrationTests = class FederalSearchSpecTests extends Tests {
    constructor() {
        super();
        this.rrSuperTests = this.schemas.reduce((r, schema) => {
            const rrSuperTest = new RRSuperTest(`/${schema}`);
            r[schema] = rrSuperTest;
            return r;
        }, {});
        this.rrSuperTest = this.rrSuperTests.current;
        this.initMessage = 'initialize app';
        this.searchTestsMap = this.schemas.reduce((r, schema, index) => {
            const rrSuperTest = this.rrSuperTests[schema];
            const searchTests = new searchCommon.IntegrationTests(rrSuperTest, index * 7, 4, false);
            r.set(schema, searchTests);
            return r;
        }, new Map());
        this.modelsdb0 = generator('public', 'recregone');
        this.modelsdb1 = generator('public', 'recregtwo');
        this.searchTestsMap.set('recregone', new searchCommon.SpecTests(this.modelsdb0, 5, 4, true));
        this.searchTestsMap.set('recregtwo', new searchCommon.SpecTests(this.modelsdb1, 10, 4, true));
    }

    initializeFn() {
        const configClone = _.cloneDeep(config);
        configClone.db.schema = this.schemas.join('~');
        const options = { config: configClone, generatedb: true };
        const rrSuperTests = _.values(this.rrSuperTests);
        return SharedIntegration.setUpMultiFn(rrSuperTests, options);
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};