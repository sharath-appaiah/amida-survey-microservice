'use strict';

const chai = require('chai');
const _ = require('lodash');
const moment = require('moment');

const models = require('../../models');

const expect = chai.expect;

let choiceSetMap;

const comparator = {
    enableWhen(client, server, options) {
        if (client.enableWhen && server.enableWhen) {
            expect(server.enableWhen.length).to.equal(client.enableWhen.length);
            client.enableWhen.forEach((clientRule, index) => {
                const serverRule = server.enableWhen[index];
                if ((clientRule.questionIndex !== undefined) && serverRule.questionId) {
                    clientRule.questionId = serverRule.questionId;
                    delete clientRule.questionIndex;
                }
                clientRule.id = serverRule.id;
                const answer = clientRule.answer;
                const question = options.serverQuestionMap[serverRule.questionId];
                if (answer && answer.choiceText) {
                    const enableWhenChoice = question.choices.find(choice => (choice.text === answer.choiceText));
                    answer.choice = enableWhenChoice.id;
                    delete answer.choiceText;
                }
                if (answer && answer.choices) {
                    answer.choices.forEach((answerChoice) => {
                        const enableWhenChoice = question.choices.find(choice => (choice.text === answerChoice.text));
                        answerChoice.id = enableWhenChoice.id;
                        delete answerChoice.text;
                        if (Object.keys(answerChoice).length === 1) {
                            answerChoice.boolValue = true;
                        }
                    });
                    answer.choices = _.sortBy(answer.choices, 'id');
                }
                if (answer && (answer.code !== undefined)) {
                    const questionId = serverRule.questionId;
                    const question = options.serverQuestionMap[questionId];
                    const choice = question.choices.find(choice => (choice.code === answer.code));
                    answer.choice = choice.id;
                    delete answer.code;
                }
            });
            expect(server.enableWhen).to.deep.equal(client.enableWhen);
        }
    },
    question(client, server, options = {}) {
        const id = server.id;
        const expected = _.cloneDeep(client);
        if (expected.type === 'choices') {
            expected.choices.forEach((choice) => { choice.type = choice.type || 'bool'; });
        }
        if (expected.type === 'choice' && expected.oneOfChoices) {
            expected.choices = expected.oneOfChoices.map(choice => ({ text: choice }));
            delete expected.oneOfChoices;
        }
        if (expected.choiceSetId) {
            expected.choices = choiceSetMap.get(expected.choiceSetId);
            delete expected.choiceSetId;
        }
        if (expected.choiceSetReference) {
            expected.choices = choiceSetMap.get(expected.choiceSetReference);
            delete expected.choiceSetReference;
        }
        if (!expected.id) {
            expected.id = id;
        }
        delete expected.parentId;
        if (options.ignoreQuestionIdentifier) {
            delete expected.questionIdentifier;
        }
        if (options.ignoreAnswerIdentifier) {
            delete expected.answerIdentifier;
            delete expected.answerIdentifiers;
        }
        expect(server.type).to.equal(expected.type);
        if (expected.type === 'choice' || expected.type === 'open-choice' || expected.type === 'choices' || expected.type === 'choice-ref') {
            expected.choices.forEach((choice, index) => {
                choice.id = server.choices[index].id;
                if (options.ignoreAnswerIdentifier) {
                    delete choice.answerIdentifier;
                }
            });
            expect(server.choices).to.deep.equal(expected.choices);
        }
        this.enableWhen(expected, server, options);
        if (expected.sections && server.sections) {
            expect(expected.sections.length).to.equal(server.sections.length);
            expected.sections.forEach((section, index) => {
                section.id = server.sections[index].id;
                this.enableWhen(section, server.sections[index], options);
                this.surveySectionsOrQuestions(section, server.sections[index], options);
            });
        }
        expect(server).to.deep.equal(expected);
        return expected;
    },
    questions(client, server, options = {}) {
        expect(client.length).to.equal(server.length);
        return client.map((question, index) => this.question(question, server[index], options));
    },
    surveySections(clientSections, serverSections, options) {
        expect(serverSections.length).to.equal(clientSections.length);
        clientSections.forEach((section, index) => {
            const serverSection = serverSections[index];
            section.id = serverSection.id;
            expect(section.name).to.equal(serverSection.name);
            expect((section.sections && serverSection.sections) || (section.questions && serverSection.questions));
            if (section.questions) {
                section.questions = this.questions(section.questions, serverSection.questions, options);
            }
            if (section.sections) {
                this.surveySections(section.sections, serverSection.sections, options);
            }
            this.enableWhen(section, serverSection, options);
            expect(section).to.deep.equal(serverSection);
        });
    },
    surveySectionsOrQuestions(client, server, options) {
        expect(!((client.sections && server.sections) || (client.questions && server.questions))).to.equal(false);
        expect(!((client.sections && client.questions) || (server.sections && server.questions))).to.equal(true);
        if (client.sections) {
            this.surveySections(client.sections, server.sections, options);
        } else {
            client.questions = this.questions(client.questions, server.questions, options);
        }
    },
    survey(client, server, options = {}) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        delete expected.parentId;
        if (options.ignoreSurveyIdentifier) {
            delete expected.identifier;
        }
        if (!expected.status) {
            expected.status = 'published';
        }
        const serverSurveyQuestions = models.survey.getQuestions(server);
        const serverQuestionMap = _.keyBy(serverSurveyQuestions, 'id');
        options.serverQuestionMap = serverQuestionMap;
        this.surveySectionsOrQuestions(expected, server, options);
        expect(server).to.deep.equal(expected);
    },
    answeredSurvey(survey, answers, serverAnsweredSurvey, language) {
        const expected = _.cloneDeep(survey);
        const answerMap = new Map();
        answers.forEach(({ questionId, answer, answers, language }) => answerMap.set(questionId, { answer, answers, language }));
        const surveyQuestions = models.survey.getQuestions(expected);
        surveyQuestions.forEach((qx) => {
            const clientAnswers = answerMap.get(qx.id);
            if (clientAnswers) {
                if (qx.multiple) {
                    qx.answers = answerMap.get(qx.id).answers;
                } else {
                    qx.answer = answerMap.get(qx.id).answer;
                }
                qx.language = answerMap.get(qx.id).language || language || 'en';
                if (qx.type === 'choices' && qx.answer.choices) {
                    qx.answer.choices.forEach((choice) => {
                        const numValues = ['textValue', 'code', 'monthValue', 'yearValue', 'dayValue', 'integerValue', 'boolValue'].reduce((r, p) => {
                            if (Object.prototype.hasOwnProperty.call(choice, p)) {
                                r += 1;
                            }
                            return r;
                        }, 0);
                        if (!numValues) {
                            choice.boolValue = true;
                        }
                    });
                }
            }
        });
        expect(serverAnsweredSurvey).to.deep.equal(expected);
    },
    answers(answers, serverAnswers, language) {
        const expected = _.cloneDeep(answers);
        expected.forEach((answer) => {
            answer.language = answer.language || language || 'en';
            if (answer.answer && answer.answer.choices) {
                answer.answer.choices.forEach((choice) => {
                    const numValues = ['textValue', 'code', 'monthValue', 'yearValue', 'dayValue', 'integerValue', 'boolValue', 'dateValue', 'numberValue', 'feetInchesValue', 'bloodPressureValue'].reduce((r, p) => {
                        if (Object.prototype.hasOwnProperty.call(choice, p)) {
                            r += 1;
                        }
                        return r;
                    }, 0);
                    if (!numValues) {
                        choice.boolValue = true;
                    }
                });
            }
        });
        const orderedExpected = _.sortBy(expected, 'questionId');
        const orderedActual = _.sortBy(serverAnswers, 'questionId');
        expect(orderedActual).to.deep.equal(orderedExpected);
    },
    createdAt(server) {
        const compareDateTime = moment().subtract(2, 'second');
        const createdDateTime = moment(server.createdAt);
        expect(createdDateTime.isAfter(compareDateTime)).to.equal(true);
    },
    user(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        delete expected.password;
        if (!Object.prototype.hasOwnProperty.call(expected, 'role')) {
            expected.role = 'participant';
        }
        if (!expected.username) {
            expected.username = expected.email.toLowerCase();
        }
        this.createdAt(server);
        expected.createdAt = server.createdAt;
        expect(server).to.deep.equal(expected);
    },
    choiceSet(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        _.range(server.choices.length).forEach((index) => {
            expected.choices[index].id = server.choices[index].id;
        });
        expect(server).to.deep.equal(expected);
    },
    conditionalSurveyTwiceCreatedSections(firstServerSections, secondServerSections) {
        secondServerSections.forEach((section, index) => {
            section.id = firstServerSections[index].id;
        });
        secondServerSections.forEach((section, index) => {
            if (section.enableWhen) {
                section.enableWhen.forEach((rule, index2) => {
                    const newRuleId = firstServerSections[index].enableWhen[index2].id;
                    rule.id = newRuleId;
                });
            }
        });
        secondServerSections.forEach((section, index) => {
            if (section.sections) {
                this.conditionalSurveyTwiceCreatedSections(section.sections, firstServerSections[index].sections);
            }
            if (section.questions) {
                this.conditionalSurveyTwiceCreatedQuestions(section.questions, firstServerSections[index].questions);
            }
        });
    },
    conditionalSurveyTwiceCreatedQuestions(firstServerQuestions, secondServerQuestions) {
        secondServerQuestions.forEach((question, index) => {
            if (question.enableWhen) {
                question.enableWhen.forEach((rule, index2) => {
                    const newRuleId = firstServerQuestions[index].enableWhen[index2].id;
                    rule.id = newRuleId;
                });
            }
        });
        secondServerQuestions.forEach((question, index) => {
            if (question.sections) {
                this.conditionalSurveyTwiceCreatedSections(question.sections, firstServerQuestions[index].sections);
            }
        });
    },
    conditionalSurveyTwiceCreated(firstServer, secondServer) {
        secondServer = _.cloneDeep(secondServer);
        if (firstServer.questions) {
            this.conditionalSurveyTwiceCreatedQuestions(firstServer.questions, secondServer.questions);
        }
        if (firstServer.sections) {
            this.conditionalSurveyTwiceCreatedSections(firstServer.sections, secondServer.sections);
        }
        expect(secondServer).to.deep.equal(firstServer);
    },
    updateChoiceSetMap(choiceSets) {
        choiceSetMap = new Map();
        choiceSets.forEach((choiceSet) => {
            const choices = choiceSet.choices.map(({ id, text, code }) => ({ id, text, code }));
            choiceSetMap.set(choiceSet.id, choices);
            choiceSetMap.set(choiceSet.reference, choices);
        });
    },
    researchSite(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        expected.zip = expected.zip.replace(/ /g, '');
        expect(server).to.deep.equal(expected);
    },
    section(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        expect(server).to.deep.equal(expected);
    },
    registry(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        expect(server).to.deep.equal(expected);
    },
    filter(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        this.createdAt(server);
        expected.createdAt = server.createdAt;
        expect(server).to.deep.equal(expected);
    },
    cohort(client, server) {
        const expected = _.cloneDeep(client);
        expected.id = server.id;
        this.createdAt(server);
        expected.createdAt = server.createdAt;
        expect(server).to.deep.equal(expected);
    },
};

module.exports = comparator;
