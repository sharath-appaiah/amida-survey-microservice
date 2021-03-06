'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');

const models = require('../../models');

const expect = chai.expect;

const SpecTests = class AssessmentSpecTests {
    constructor(generator, hxSurvey, hxAssessment) {
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxAssessment = hxAssessment;
    }

    createAssessmentFn(indices, override = {}) {
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxAssessment = this.hxAssessment;
        return function createAssessment() {
            const surveyIds = indices.map(index => hxSurvey.id(index));
            const assessment = Object.assign(generator.newAssessment(surveyIds), override);
            return models.assessment.createAssessment(assessment)
                .then(({ id }) => {
                    if (assessment.stage === undefined) {
                        assessment.stage = 0;
                    }
                    hxAssessment.pushWithId(assessment, id);
                });
        };
    }

    getAssessmentFn(index) {
        const hxAssessment = this.hxAssessment;
        return function getAssessment() {
            const id = hxAssessment.id(index);
            return models.assessment.getAssessment(id)
                .then((assessment) => {
                    expect(assessment).to.deep.equal(hxAssessment.server(index));
                });
        };
    }

    deleteAssessmentFn(index) {
        const hxAssessment = this.hxAssessment;
        return function getAssessment() {
            const id = hxAssessment.id(index);
            return models.assessment.deleteAssessment(id)
                .then(() => {
                    hxAssessment.remove(index);
                });
        };
    }

    listAssessmentFn() {
        const hxAssessment = this.hxAssessment;
        return function listAssessment() {
            return models.assessment.listAssessments()
                .then((list) => {
                    expect(list).to.deep.equal(hxAssessment.listServers());
                });
        };
    }

    listAssessmentGroupFn(group, indices) {
        const hxAssessment = this.hxAssessment;
        return function listAssessmentGroup() {
            return models.assessment.listAssessments({ group })
                .then((list) => {
                    let expected = hxAssessment.listServers();
                    expected = indices.map(index => expected[index]);
                    expect(list).to.deep.equal(expected);
                });
        };
    }
};

const IntegrationTests = class AssessmentSpecTests {
    constructor(surveySuperTest, generator, hxSurvey, hxAssessment) {
        this.surveySuperTest = surveySuperTest;
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxAssessment = hxAssessment;
    }

    createAssessmentFn(indices, override = {}) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxAssessment = this.hxAssessment;

        return function createAssessment() {
            const surveyIds = indices.map(index => hxSurvey.id(index));
            const assessment = Object.assign(generator.newAssessment(surveyIds), override);
            return surveySuperTest.post('/assessments', assessment, 201)
                .expect((res) => {
                    if (assessment.stage === undefined) {
                        assessment.stage = 0;
                    }
                    hxAssessment.pushWithId(assessment, res.body.id);
                });
        };
    }

    getAssessmentFn(index) {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function getAssessment() {
            const id = hxAssessment.id(index);
            return surveySuperTest.get(`/assessments/${id}`, true, 200)
                .expect((res) => {
                    expect(res.body).to.deep.equal(hxAssessment.server(index));
                });
        };
    }

    deleteAssessmentFn(index) {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function getAssessment() {
            const id = hxAssessment.id(index);
            return surveySuperTest.delete(`/assessments/${id}`, 204)
                .then(() => {
                    hxAssessment.remove(index);
                });
        };
    }

    listAssessmentFn() {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function listAssessment() {
            return surveySuperTest.get('/assessments', true, 200)
                .expect((res) => {
                    expect(res.body).to.deep.equal(hxAssessment.listServers());
                });
        };
    }

    listAssessmentGroupFn(group, indices) {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function listAssessmentGroup() {
            return surveySuperTest.get('/assessments', true, 200, { group })
                .then((res) => {
                    let expected = hxAssessment.listServers();
                    expected = indices.map(index => expected[index]);
                    expect(res.body).to.deep.equal(expected);
                });
        };
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};
