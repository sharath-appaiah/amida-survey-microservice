/* global describe,before,it*/

'use strict';

process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const chai = require('chai');

const config = require('../config');
const SharedIntegration = require('./util/shared-integration');
const RRSuperTest = require('./util/rr-super-test');
const Generator = require('./util/generator');
const Answerer = require('./util/generator/answerer');
const History = require('./util/history');
const SurveyHistory = require('./util/survey-history');
const surveyCommon = require('./util/survey-common');
const questionCommon = require('./util/question-common');
const answerCommon = require('./util/answer-common');

const expect = chai.expect;

const binaryParser = function binaryParser(res, callback) {
    res.setEncoding('binary');
    res.data = '';
    res.on('data', function onData(chunk) {
        res.data += chunk;
    });
    res.on('end', function onEnd() {
        callback(null, new Buffer(res.data, 'binary'));
    });
};

describe('answer file integration', function answerFileIntegration() {
    const fileIds = [];

    const AnswererWithFile = class extends Answerer {
        file() {
            const fileIndex = this.answerIndex % 4;
            const name = `cat${fileIndex}.jpeg`;
            const id = fileIds[fileIndex];
            return { fileValue: { id, name } };
        }
    };

    const userCount = 4;
    const surveyCount = 3;

    const rrSuperTest = new RRSuperTest();
    const generator = new Generator({ answerer: new AnswererWithFile() });
    const shared = new SharedIntegration(rrSuperTest, generator);
    const hxUser = new History();
    const hxQuestion = new History();
    const hxSurvey = new SurveyHistory();
    const qxTests = new questionCommon.IntegrationTests(rrSuperTest, { generator, hxQuestion });
    const surveyTests = new surveyCommon.IntegrationTests(rrSuperTest, generator, hxSurvey, hxQuestion); // eslint-disable-line max-len
    const answerTests = new answerCommon.IntegrationTests(rrSuperTest, {
        generator, hxUser, hxSurvey, hxQuestion,
    });

    const genFilepath = name => path.join(__dirname, `fixtures/answer-files/${name}`);

    before(shared.setUpFn());

    it('login as super', shared.loginFn(config.superUser));
    _.range(userCount).forEach((i) => {
        it(`create user ${i}`, shared.createUserFn(hxUser));
    });
    it('logout as super', shared.logoutFn());

    _.range(4).forEach((index) => {
        it(`login as user ${index}`, shared.loginIndexFn(hxUser, index));
        it(`post file ${index}`, function postFile() {
            const filename = `cat${index + 1}.jpeg`;
            const filepath = genFilepath(filename);
            return rrSuperTest.postFile('/files', 'file', filepath, { filename }, 201)
                .then(res => fileIds.push(res.body.id));
        });
        it(`get file ${index}`, function getFile() {
            const id = fileIds[index];
            return rrSuperTest.get(`/files/${id}`, true, 200)
                .buffer()
                .parse(binaryParser)
                .then((res) => {
                    const filename = `cat${index + 1}.jpeg`;
                    const filepath = genFilepath(filename);
                    const content = fs.readFileSync(filepath);
                    expect(res.body).to.deep.equal(content);
                });
        });
        it(`logout as user ${index}`, shared.logoutFn());
    });

    it('login as super', shared.loginFn(config.superUser));
    _.range(surveyCount).forEach((index) => {
        ['integer', 'text', 'file'].forEach((type) => {
            it(`create question of type ${type} (${index})`, qxTests.createQuestionFn({ type }));
            it(`get question of type  ${type} (${index})`, qxTests.getQuestionFn());
        });

        it(`create survey ${index}`, surveyTests.createSurveyQxHxFn(_.range(3 * index, (3 * index) + 3)));
        it(`get survey ${index}`, surveyTests.getSurveyFn());
    });
    it('logout as super', shared.logoutFn());

    _.range(userCount).forEach((userIndex) => {
        _.range(surveyCount).forEach((surveyIndex) => {
            it(`login as user ${userIndex}`, shared.loginIndexFn(hxUser, userIndex));
            it(`user ${userIndex} answers survey ${surveyIndex}`, answerTests.answerSurveyFn(userIndex, surveyIndex));
            it(`user ${userIndex} gets answers to survey ${surveyIndex}`, answerTests.getAnswersFn(userIndex, surveyIndex));
            it(`logout as user ${userIndex}`, shared.logoutFn());
        });
    });
});
