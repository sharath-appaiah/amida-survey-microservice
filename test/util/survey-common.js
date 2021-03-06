'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');
const comparator = require('./comparator');

const expect = chai.expect;

const answerValueType = [
    'textValue', 'code', 'monthValue', 'yearValue', 'dayValue', 'integerValue', 'boolValue',
];

const formAnswersToPost = function (survey, answersSpec) {
    const questions = survey.questions;
    return answersSpec.reduce((r, spec, index) => {
        if (spec !== null) {
            const entry = {
                questionId: questions[index].id,
                answer: {},
            };
            if (spec.choices) {
                entry.answer.choices = spec.choices.map((cindex) => {
                    const { id } = questions[index].choices[cindex.index];
                    const result = { id };
                    const numValues = answerValueType.reduce((r2, p) => {
                        if (Object.prototype.hasOwnProperty.call(cindex, p)) {
                            result[p] = cindex[p];
                            return r2 + 1;
                        }
                        return r2;
                    }, 0);
                    if (!numValues) {
                        result.boolValue = true;
                    }
                    return result;
                });
            }
            if (Object.prototype.hasOwnProperty.call(spec, 'choice')) {
                entry.answer.choice = questions[index].choices[spec.choice].id;
            }
            if (Object.prototype.hasOwnProperty.call(spec, 'textValue')) {
                entry.answer.textValue = spec.textValue;
            }
            if (Object.prototype.hasOwnProperty.call(spec, 'boolValue')) {
                entry.answer.boolValue = spec.boolValue;
            }
            r.push(entry);
        }
        return r;
    }, []);
};

const formAnsweredSurvey = function (survey, answers) {
    const result = _.cloneDeep(survey);
    result.questions.forEach((question, index) => {
        question.answer = answers[index].answer;
        question.language = answers.language || 'en';
    });
    return result;
};

const updateEnableWhenIds = function (enableWhen, questionIdMap, sectionIdMap, ruleIdMap) {
    enableWhen.forEach((rule) => {
        rule.id = ruleIdMap[rule.id];
        if (rule.questionId) {
            rule.questionId = questionIdMap[rule.questionId].questionId;
        }
        if (rule.sectionId) {
            rule.sectionId = sectionIdMap[rule.sectionId];
        }
    });
};

let updateQuestionIds = null;

const updateSectionIds = function (sections, questionIdMap, sectionIdMap, ruleIdMap) {
    sections.forEach((section) => {
        const sectionId = sectionIdMap[section.id];
        if (!sectionId) {
            throw new Error(`updateIds: section id '${sectionId}' does not exist in the map`);
        }
        section.id = sectionId;
        if (section.enableWhen) {
            updateEnableWhenIds(section.enableWhen, questionIdMap, sectionIdMap, ruleIdMap);
        }
        if (section.sections) {
            return updateSectionIds(section.sections, questionIdMap, sectionIdMap, ruleIdMap);
        }
        if (section.questions) {
            return updateQuestionIds(section.questions, questionIdMap, sectionIdMap, ruleIdMap);
        }
        return null;
    });
};

updateQuestionIds = function (questions, questionIdMap, sectionIdMap, ruleIdMap) {
    questions.forEach((question) => {
        const questionIdObj = questionIdMap[question.id];
        if (!questionIdObj) {
            throw new Error(`updateIds: question id '${question.id}' does not exist in the map`);
        }
        question.id = questionIdObj.questionId;
        if (question.choices) {
            const choicesIds = questionIdObj.choicesIds;
            question.choices.forEach((choice) => { choice.id = choicesIds[choice.id]; });
        }
        if (question.enableWhen) {
            updateEnableWhenIds(question.enableWhen, questionIdMap, sectionIdMap, ruleIdMap);
        }
        if (question.sections) {
            updateSectionIds(question.sections, questionIdMap, sectionIdMap, ruleIdMap);
        }
    });
};

const updateIds = function (surveys, idMap, questionIdMap, sectionIdMap, ruleIdMap) {
    surveys.forEach((survey) => {
        const surveyId = idMap[survey.id];
        if (!surveyId) {
            throw new Error(`updateIds: id for '${survey.name}' does not exist in the map`);
        }
        survey.id = surveyId;
        const { sections, questions } = survey;
        if (sections) {
            updateSectionIds(sections, questionIdMap, sectionIdMap, ruleIdMap);
        }
        if (questions) {
            updateQuestionIds(questions, questionIdMap, sectionIdMap, ruleIdMap);
        }
    });
};

let removeQuestionSectionIds;
let removeSurveySectionIds;

const removeSectionIds = function removeSectionIds(sections) {
    if (sections) {
        sections.forEach((section) => {
            delete section.id;
            removeSectionIds(section.sections);
            removeQuestionSectionIds(section.questions);
        });
    }
};

removeQuestionSectionIds = function (questions) {
    if (questions) {
        questions.forEach(({ sections }) => {
            if (sections) {
                sections.forEach((section) => {
                    delete section.id;
                    removeSurveySectionIds(section);
                });
            }
        });
    }
};

removeSurveySectionIds = function ({ questions, sections }) {
    removeSectionIds(sections);
    removeQuestionSectionIds(questions);
};

const formQuestionsSectionsSurveyPatch = function (survey, { questions, sections }) {
    const surveyPatch = { forceQuestions: true };
    if (sections) {
        sections = _.cloneDeep(sections);
        removeSectionIds(sections);
        surveyPatch.sections = sections;
        survey.sections = sections;
        delete survey.questions;
        return surveyPatch;
    }
    if (questions) {
        questions = _.cloneDeep(questions);
        removeQuestionSectionIds(questions);
        surveyPatch.questions = questions;
        survey.questions = questions;
        delete survey.sections;
        return surveyPatch;
    }
    throw new Error('Surveys should have either sections or questions.');
};

const SpecTests = class SurveySpecTests {
    constructor(generator, hxSurvey, hxQuestion, hxAnswer) {
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxQuestion = hxQuestion; // not updated in all creates.
        this.hxAnswer = hxAnswer;
    }

    createSurveyFn(options) {
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        return function createSurvey() {
            const survey = generator.newSurvey(options);
            return models.survey.createSurvey(survey)
                .then(id => hxSurvey.push(survey, { id }));
        };
    }

    createSurveyQxHxFn(questionIndices, options = {}) {
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        return function createSurveyQxHx() {
            const questionIds = questionIndices.map(index => hxQuestion.id(index));
            const survey = generator.newSurveyQuestionIds(questionIds, options);

            return models.survey.createSurvey(survey)
                .then((id) => {
                    const fullSurvey = _.cloneDeep(survey);
                    // TODO: un-hardcode sectionIds and use function map section Ids
                    if (options.noSection === false) {
                        survey.sections.forEach((section, indx) => {
                            const questions = section.questions;
                            fullSurvey.sections[indx].questions = questions.map((surveyQuestion) => {
                                const fullSurveyQuestion = Object.assign({}, surveyQuestion);
                                Object.assign(fullSurveyQuestion, hxQuestion.server(surveyQuestion.id - 1));
                                return fullSurveyQuestion;
                            });
                        });
                    } else {
                        fullSurvey.questions = questionIndices.map((qxIndex, index) => {
                            const question = Object.assign({}, survey.questions[index]);
                            Object.assign(question, hxQuestion.server(qxIndex));
                            return question;
                        });
                    }
                    hxSurvey.push(fullSurvey, { id });
                });
        };
    }

    getSurveyFn(index) {
        const hxSurvey = this.hxSurvey;
        return function getSurvey() {
            const surveyId = hxSurvey.id(index);
            return models.survey.getSurvey(surveyId)
                .then((survey) => {
                    const client = hxSurvey.client(index);
                    client.authorId = survey.authorId;
                    comparator.survey(client, survey);
                    hxSurvey.updateServer(index, survey);
                });
        };
    }

    deleteSurveyFn(index) {
        const hxSurvey = this.hxSurvey;
        return function deleteSurvey() {
            const id = hxSurvey.id(index);
            return models.survey.deleteSurvey(id)
                .then(() => hxSurvey.remove(index));
        };
    }

    listSurveysFn(options, count = -1) {
        const hxSurvey = this.hxSurvey;
        return function listSurveys() {
            return models.survey.listSurveys(options)
                .then((surveys) => {
                    if (count >= 0) {
                        expect(surveys).to.have.length(count);
                    }
                    const expected = hxSurvey.listServersByScope(options);
                    expect(surveys.length).to.equal(expected.length);

                    surveys.forEach((survey, index) => {
                        expect(survey).to.deep.equal(expected[index]);
                    });
                });
        };
    }

    getNumberOfUsersBySurveyfn(id) {
        const hxAnswer = this.hxAnswer;
        const hxSurvey = this.hxSurvey;
        return function getNumberOfUsersBySurvey() {
            return models.survey.getNumberOfUsersBySurvey({ surveyId: id })
                .then((res) => {
                    const totalUsers = new Set();
                    hxAnswer.store.forEach((ans) => {
                        const ansSurveyId = hxSurvey.id(ans.surveyIndex);

                        if (!totalUsers.has(ans.ownerId) && ansSurveyId === id) {
                            totalUsers.add(ans.ownerId);
                        }
                    });
                    const expected = totalUsers.size;
                    expect(res).to.equal(expected);
                });
        };
    }
};

const IntegrationTests = class SurveyIntegrationTests {
    constructor(surveySuperTest, generator, hxSurvey, hxQuestion, hxAnswer) {
        this.surveySuperTest = surveySuperTest;
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxQuestion = hxQuestion; // not updated in all creates.
        this.hxAnswer = hxAnswer;
    }

    createSurveyFn(options) {
        const generator = this.generator;
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        return function createSurvey(done) {
            const survey = generator.newSurvey(options);
            surveySuperTest.post('/surveys', survey, 201)
                .expect((res) => {
                    hxSurvey.push(Object.assign(survey, {authorId: surveySuperTest.userId}), res.body);
                })
                .end(done);
        };
    }

    createSurveyQxHxFn(questionIndices, options = {}) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        return function createSurveyQxHx() {
            const questionIds = questionIndices.map(index => hxQuestion.id(index));
            const survey = generator.newSurveyQuestionIds(questionIds, options);
            return surveySuperTest.post('/surveys', survey, 201)
                .then((res) => {
                    const fullSurvey = _.cloneDeep(survey);
                    if (options.noSection === false) {
                        survey.sections.forEach((section, indx) => {
                            const questions = section.questions;
                            fullSurvey.sections[indx].questions = questions.map((surveyQuestion) => {
                                const fullSurveyQuestion = Object.assign({}, surveyQuestion);
                                Object.assign(fullSurveyQuestion, hxQuestion.server(surveyQuestion.id - 1));
                                return fullSurveyQuestion;
                            });
                        });
                    } else {
                        fullSurvey.questions = questionIndices.map((qxIndex, index) => {
                            const question = Object.assign({}, survey.questions[index]);
                            Object.assign(question, hxQuestion.server(qxIndex));
                            return question;
                        });
                    }
                    hxSurvey.push(Object.assign(fullSurvey, {authorId: surveySuperTest.userId}), res.body);
                });
        };
    }

    getSurveyFn(index) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        return function getSurvey(done) {
            if (index === null || index === undefined) {
                index = hxSurvey.lastIndex();
            }
            const id = hxSurvey.id(index);
            surveySuperTest.get(`/surveys/${id}`, true, 200)
                .expect((res) => {
                    hxSurvey.reloadServer(res.body);
                    let expected = hxSurvey.client(index);
                    expected = _.cloneDeep(expected);
                    comparator.survey(expected, res.body);
                })
                .end(done);
        };
    }

    verifySurveyFn(index, { noSectionId } = {}) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        return function verifySurvey() {
            const server = hxSurvey.server(index);
            return surveySuperTest.get(`/surveys/${server.id}`, true, 200)
                .then((res) => {
                    if (noSectionId) {
                        removeSurveySectionIds(res.body);
                    }
                    expect(res.body).to.deep.equal(server);
                });
        };
    }

    deleteSurveyFn(index) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        return function deleteSurvey(done) {
            const id = hxSurvey.id(index);
            surveySuperTest.delete(`/surveys/${id}`, 204)
                .expect(() => {
                    hxSurvey.remove(index);
                })
                .end(done);
        };
    }

    listSurveysFn(options = {}, count = -1) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        return function listSurveys() {
            return surveySuperTest.get('/surveys', true, 200, options)
                .then((res) => {
                    if (count >= 0) {
                        expect(res.body).to.have.length(count);
                    }
                    const opt = _.cloneDeep(options);
                    const expected = hxSurvey.listServersByScope(opt);
                    expect(res.body).to.deep.equal(expected);
                    return res;
                });
        };
    }

    getNumberOfUsersBySurveyfn(id) {
        const hxAnswer = this.hxAnswer;
        const hxSurvey = this.hxSurvey;
        const self = this;
        return function getNumberOfUsersBySurvey() {
            return self.surveySuperTest.get(`/numberUsersBySurvey/${id}`, true, 200)
                .then((res) => {
                    const totalUsers = new Set();
                    hxAnswer.store.forEach((ans) => {
                        const ansSurveyId = hxSurvey.id(ans.surveyIndex);
                        if (!totalUsers.has(ans.ownerId) && ansSurveyId === id) {
                            totalUsers.add(ans.ownerId);
                        }
                    });
                    const expected = totalUsers.size;
                    expect(res.body).to.equal(expected);
                });
        };
    }
};

module.exports = {
    formAnswersToPost,
    formAnsweredSurvey,
    updateIds,
    removeSectionIds,
    removeSurveySectionIds,
    formQuestionsSectionsSurveyPatch,
    SpecTests,
    IntegrationTests,
};
