/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');

const config = require('../config');
const RRError = require('../lib/rr-error');

const SharedIntegration = require('./util/shared-integration');
const History = require('./util/entity-history');
const Generator = require('./util/entity-generator');
const comparator = require('./util/client-server-comparator');
const translator = require('./util/translator');
const ConsentDocumentHistory = require('./util/consent-document-history');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedIntegration(generator);

describe('registry integration', function () {
    const store = {
        server: null,
        auth: null
    };

    const hxSurvey = new History(['id', 'name']);
    const hxUser = new History();
    const hxAnswers = [];
    const hxConsentDoc = new ConsentDocumentHistory(2);

    before(shared.setUpFn(store));

    it('error: create profile survey unauthorized', function (done) {
        const clientSurvey = generator.newSurvey();
        store.server
            .post('/api/v1.0/profile-survey')
            .send(clientSurvey)
            .expect(401)
            .end(done);
    });

    it('error: get profile survey when none created', function (done) {
        store.server
            .get('/api/v1.0/profile-survey')
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                const message = RRError.message('registryNoProfileSurvey');
                expect(res.body.message).to.equal(message);
                done();
            });

    });

    it('login as super', shared.loginFn(store, config.superUser));

    for (let i = 0; i < 2; ++i) {
        it(`create consent type ${i}`, shared.createConsentTypeFn(store, hxConsentDoc));
    }

    for (let i = 0; i < 2; ++i) {
        it(`create consent document of type ${i}`, shared.createConsentDocumentFn(store, hxConsentDoc, i));
    }

    const createProfileSurveyFn = function () {
        return function (done) {
            const clientSurvey = generator.newSurvey();
            store.server
                .post('/api/v1.0/profile-survey')
                .set('Authorization', store.auth)
                .send(clientSurvey)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(clientSurvey, res.body);
                    done();
                });
        };
    };

    it('create profile survey 0', createProfileSurveyFn());

    it('logout as super', shared.logoutFn(store));

    const verifyProfileSurveyFn = function (index) {
        return function (done) {
            store.server
                .get('/api/v1.0/profile-survey')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    const id = hxSurvey.id(index);
                    expect(res.body.id).to.equal(id);
                    hxSurvey.updateServer(index, res.body);
                    comparator.survey(hxSurvey.client(index), res.body)
                        .then(done, done);
                });
        };
    };

    const translateProfileSurveyFn = function (index, language) {
        return function (done) {
            const survey = hxSurvey.server(index);
            const translation = translator.translateSurvey(survey, language);
            delete translation.id;
            store.server
                .patch(`/api/v1.0/profile-survey/text/${language}`)
                .set('Authorization', store.auth)
                .send(translation)
                .expect(204)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.translate(index, language, translation);
                    done();
                });
        };
    };

    const verifyTranslatedProfileSurveyFn = function (index, language) {
        return function (done) {
            store.server
                .get(`/api/v1.0/profile-survey`)
                .set('Authorization', store.auth)
                .query({ language })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    translator.isSurveyTranslated(res.body, language);
                    const expected = hxSurvey.translatedServer(index, language);
                    expect(res.body).to.deep.equal(expected);
                    done();
                });
        };
    };

    it(`get profile survey 0`, verifyProfileSurveyFn(0));

    it('get profile survey 0 in spanish when no translation', function (done) {
        const language = 'es';
        store.server
            .get(`/api/v1.0/profile-survey`)
            .set('Authorization', store.auth)
            .query({ language })
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const survey = hxSurvey.server(0);
                expect(res.body).to.deep.equal(survey);
                done();
            });
    });

    it('login as super', shared.loginFn(store, config.superUser));

    it('translate profile survey 0 to spanish', translateProfileSurveyFn(0, 'es'));

    it('logout as super', shared.logoutFn(store));

    it('get/verify translated profile survey 0 (spanish)', verifyTranslatedProfileSurveyFn(0, 'es'));

    const createProfileFn = function (surveyIndex, signatures) {
        return function (done) {
            const survey = hxSurvey.server(surveyIndex);
            const clientUser = generator.newUser();
            clientUser.role = 'participant';
            const answers = generator.answerQuestions(survey.questions);
            hxAnswers.push(answers);
            const input = { user: clientUser, answers };
            if (signatures) {
                input.signatures = signatures.map(sign => hxConsentDoc.id(sign));
            }
            store.server
                .post('/api/v1.0/profiles')
                .send(input)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    store.auth = 'Bearer ' + res.body.token;
                    hxUser.push(clientUser, {});
                    done();
                });
        };
    };

    const verifyProfileFn = function (surveyIndex, userIndex) {
        return function (done) {
            store.server
                .get('/api/v1.0/profiles')
                .set('Authorization', store.auth)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    const result = res.body;
                    const survey = hxSurvey.server(surveyIndex);

                    comparator.user(hxUser.client(userIndex), result.user);
                    comparator.answeredSurvey(survey, hxAnswers[userIndex], result.survey);

                    done();
                });
        };
    };

    const updateProfileFn = function (surveyIndex, userIndex) {
        return function (done) {
            const survey = hxSurvey.server(surveyIndex);
            const answers = generator.answerQuestions(survey.questions);
            const userUpdates = {
                email: `updated${userIndex}@example.com`
            };
            hxUser.client(userIndex).email = userUpdates.email;
            const updateObj = {
                user: userUpdates,
                answers
            };
            hxAnswers[userIndex] = answers;
            store.server
                .patch('/api/v1.0/profiles')
                .set('Authorization', store.auth)
                .send(updateObj)
                .expect(204, done);
        };
    };

    const verifySignedDocumentFn = function (expected) {
        return function (done) {
            const server = hxConsentDoc.server(0);
            store.server
                .get(`/api/v1.0/consent-documents/${server.id}/with-signature`)
                .set('Authorization', store.auth)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    const result = res.body;
                    expect(result.content).to.equal(server.content);
                    expect(result.signature).to.equal(expected);
                    if (expected) {
                        expect(result.language).to.equal('en');
                    }
                    done();
                });
        };
    };

    const verifySignedDocumentByTypeNameFn = function (expected) {
        return function (done) {
            const server = hxConsentDoc.server(0);
            const typeName = hxConsentDoc.type(0).name;
            store.server
                .get(`/api/v1.0/consent-documents/type-name/${typeName}/with-signature`)
                .set('Authorization', store.auth)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    const result = res.body;
                    expect(result.content).to.equal(server.content);
                    expect(result.signature).to.equal(expected);
                    if (expected) {
                        expect(result.language).to.equal('en');
                    }
                    done();
                });
        };
    };

    it('register user 0 with profile survey 0', createProfileFn(0));

    it('verify user 0 profile', verifyProfileFn(0, 0));

    it('verify document 0 is not signed by user 0', verifySignedDocumentFn(false));

    it('verify document 0 is not signed by user 0 (type name)', verifySignedDocumentByTypeNameFn(false));

    it('update user 0 profile', updateProfileFn(0, 0));

    it('verify user 0 profile', verifyProfileFn(0, 0));

    it('register user 1 with profile survey 0 and doc 0 signature', createProfileFn(0, [0]));

    it('verify user 1 profile', verifyProfileFn(0, 1));

    it('verify document 0 is signed by user 1', verifySignedDocumentFn(true));

    it('verify document 0 is not signed by user 1 (type name)', verifySignedDocumentByTypeNameFn(true));

    it('login as super', shared.loginFn(store, config.superUser));

    it('create profile survey 1', createProfileSurveyFn());

    it('logout as super', shared.logoutFn(store));

    it('get/verify profile survey 1', verifyProfileSurveyFn(1));
});