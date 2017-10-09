'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const path = require('path');

const session = require('supertest-session');
const supertest = require('supertest');
const _ = require('lodash');
const AuthService = require('./mock_auth_service');

module.exports = class RRSupertest {
    constructor(addlPath) {
        this.server = null;
        this.baseUrl = '/api/v1.0';
        this.authService = new AuthService();
        if (addlPath) {
            this.baseUrl += addlPath;
        }
        this.userAudit = [];
        this.username = null;
    }

    initializeUrl(url) {
        this.server = supertest(url);
    }

    initialize(app) {
        this.app = app;
        this.server = session(app);
        this.username = null;
    }

    getModels() {
        return this.app.locals.models;
    }

    shutDown() {
        return this.app.locals.models.sequelize.close();
    }

    authBasic(user, status = 200) {
        if (status === 200) {
            this.username = user.username;
            this.userId = user.id;
            this.userRole = user.role;
        }
        this.authService.addUser(user);
        const token = this.authService.getJWT(user);
        this.server = session(this.app, {
            before(req) {
                req.set('Cookie', `rr-jwt-token=${token};`);
            },
        });
    }

    resetAuth() {
        this.server = session(this.app);
        this.username = null;
        this.userId = null;
        this.userRole = null;
    }

    getJWT() {
        const jwt = _.find(this.server.cookies, cookie => cookie.name === 'rr-jwt-token');
        return jwt;
    }

    getUserAudit() {
        return this.userAudit;
    }

    update(operation, endpoint, payload, status, header, validationError) {
        if (status < 401 && this.username && !validationError) {
            this.userAudit.push({ username: this.username, operation, endpoint });
        }
        const r = this.server[operation](this.baseUrl + endpoint);

        if (header) {
            _.toPairs(header).forEach(([key, value]) => r.set(key, value));
        }
        return r.send(payload).expect(status);
    }

    post(endpoint, payload, status, header, validationError) {
        return this.update('post', endpoint, payload, status, header, validationError);
    }

    postFile(endpoint, field, filepath, payload, status) {
        if (status < 401 && this.username) {
            this.userAudit.push({ username: this.username, operation: 'post', endpoint });
        }
        const filename = path.basename(filepath);
        const request = this.server
            .post(this.baseUrl + endpoint)
            .attach(field, filepath, filename);
        if (payload) {
            return request.field(payload).expect(status);
        }
        return request.expect(status);
    }

    patch(endpoint, payload, status, header) {
        return this.update('patch', endpoint, payload, status, header);
    }

    authPost(endpoint, payload, status, header) {
        const { user } = payload;
        if (status < 401) {
            this.username = user.username || user.email.toLowerCase();
        }
        return this.update('post', endpoint, payload, status, header).expect(status);
    }

    delete(endpoint, status, query) {
        if (status < 401 && this.username) {
            this.userAudit.push({ username: this.username, operation: 'delete', endpoint });
        }
        let r = this.server.delete(this.baseUrl + endpoint);
        if (query) {
            r = r.query(query);
        }
        return r.expect(status);
    }

    get(endpoint, auth, status, query) {
        if (status < 401 && this.username) {
            this.userAudit.push({ username: this.username, operation: 'get', endpoint });
        }

        let r = this.server.get(this.baseUrl + endpoint);

        if (query) {
            r = r.query(query);
        }

        return r.expect(status);
    }
};
