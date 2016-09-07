/* global describe,before,after,beforeEach,afterEach,it,xit*/
'use strict';
process.env.NODE_ENV = 'test';

var chai = require('chai');

const models = require('../../models');
const userExamples = require('../fixtures/user-examples');

const config = require('../../config');
const request = require('supertest');

const app = require('../..');

const expect = chai.expect;

let server;
let jwt;

const User = models.User;
const Ethnicity = models.Ethnicity;

describe('Starting API Server', function () {
    const user = userExamples.Example;

    before(function () {
        return models.sequelize.sync({
            force: true
        }).then(function () {
            return User.destroy({
                where: {}
            });
        });
    });

    var ethnicities;
    var genders;

    it('get available ethnicities', function (done) {
        request(app)
            .get('/api/v1.0/ethnicities')
            .expect(200)
            .expect(function (res) {
                var expected = Ethnicity.ethnicities();
                expect(res.body).to.deep.equal(expected);
            })
            .end(done);
    });

    it('get available genders', function (done) {
        request(app)
            .get('/api/v1.0/genders')
            .expect(200)
            .expect(function (res) {
                var expected = User.genders();
                expect(res.body).to.deep.equal(expected);
            })
            .end(done);
    });

    it('Creates a user via REST api.', function createUser(done) {
        request(app)
            .post('/api/v1.0/user')
            .send(user)
            .expect(201, done);
    });

    it('Authenticates a user and returns a JWT', function createToken(done) {
        request(app)
            .get('/api/v1.0/auth/basic')
            .auth(user.username, 'password')
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                jwt = res.body.token;
                done();
            });
    });

    it('Returns a user\'s own data after authenticating the API', function showUser(done) {
        request(app)
            .get('/api/v1.0/user')
            .set('Authorization', 'Bearer ' + jwt)
            .expect(200, {
                username: user.username,
                email: user.email,
                zip: user.zip
            }, done);
    });
});
