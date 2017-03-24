/* global describe,before,it*/

'use strict';

process.env.NODE_ENV = 'test';

const _ = require('lodash');
const SharedSpec = require('./util/shared-spec.js');
const Generator = require('./util/generator');
const History = require('./util/history');
const questionCommon = require('./util/question-common');
const filterCommon = require('./util/filter-common');

describe('filter unit', () => {
    const generator = new Generator();
    const shared = new SharedSpec(generator);
    const hxQuestion = new History();
    const qxTests = new questionCommon.SpecTests(generator, hxQuestion);
    const tests = new filterCommon.SpecTests(hxQuestion);
    const questionGenerator = generator.questionGenerator;
    let count = 0;

    before(shared.setUpFn());

    ['choice', 'choices'].forEach((type) => {
        _.range(count, count + 3).forEach((index) => {
            const question = questionGenerator.newQuestion(type);
            it(`create question ${index}`, qxTests.createQuestionFn(question));
            it(`get question ${index}`, qxTests.getQuestionFn(index));
        });
        count += 3;
        _.range(count, count + 3).forEach((index) => {
            const question = questionGenerator.newMultiQuestion(type);
            it(`create question ${index}`, qxTests.createQuestionFn(question));
            it(`get question ${index}`, qxTests.getQuestionFn(index));
        });
        count += 3;
    });

    _.range(count, count + 10).forEach((index) => {
        it(`create question ${index}`, qxTests.createQuestionFn());
        it(`get question ${index}`, qxTests.getQuestionFn(index));
    });
    count += 10;

    _.range(count, count + 10).forEach((index) => {
        const question = questionGenerator.newMultiQuestion();
        it(`create question ${index}`, qxTests.createQuestionFn(question));
        it(`get question ${index}`, qxTests.getQuestionFn(index));
    });
    count += 10;

    _.range(20).forEach((index) => {
        it(`create filter ${index}`, tests.createFilterFn());
        it(`get filter ${index}`, tests.getFilterFn(index));
    });

    it('list filters', tests.listFiltersFn(20));

    [5, 11].forEach((index) => {
        it(`delete filter ${index}`, tests.deleteFilterFn(index));
    });

    it('list filters', tests.listFiltersFn(18));

    _.range(20, 30).forEach((index) => {
        it(`create filter ${index}`, tests.createFilterFn());
        it(`get filter ${index}`, tests.getFilterFn(index));
    });

    it('list filters', tests.listFiltersFn(28));

    [20, 21].forEach((index) => {
        const fields = ['name'];
        it(`patch filter ${index} name`, tests.patchFilterFn(index, fields));
        it(`verify filter ${index}`, tests.verifyFilterFn(index));
    });

    [22, 23].forEach((index) => {
        const fields = ['name', 'maxCount'];
        it(`patch filter ${index} name`, tests.patchFilterFn(index, fields));
        it(`verify filter ${index}`, tests.verifyFilterFn(index));
    });

    [24, 25].forEach((index) => {
        const fields = ['questions'];
        it(`patch filter ${index} name`, tests.patchFilterFn(index, fields));
        it(`verify filter ${index}`, tests.verifyFilterFn(index));
    });

    [26, 27].forEach((index) => {
        const fields = ['name', 'maxCount', 'questions'];
        it(`patch filter ${index} name`, tests.patchFilterFn(index, fields));
        it(`verify filter ${index}`, tests.verifyFilterFn(index));
    });

    it('list filters', tests.listFiltersFn(28, true));
});