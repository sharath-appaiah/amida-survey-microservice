'use strict';

const _ = require('lodash');

const db = require('../db');

const RRError = require('../../lib/rr-error');
const SPromise = require('../../lib/promise');
const Translatable = require('./translatable');
const exportCSVConverter = require('../../export/csv-converter.js');
const importCSVConverter = require('../../import/csv-converter.js');

const sequelize = db.sequelize;
const Survey = db.Survey;
const SurveyQuestion = db.SurveyQuestion;
const ProfileSurvey = db.ProfileSurvey;
const AnswerRule = db.AnswerRule;
const AnswerRuleValue = db.AnswerRuleValue;

module.exports = class SurveyDAO extends Translatable {
    constructor(dependencies) {
        super('survey_text', 'surveyId', ['name', 'description'], { description: true });
        Object.assign(this, dependencies);
    }

    validateCreateQuestionsPreTransaction(survey) {
        let rejection = null;
        const questions = survey.questions;
        const numOfQuestions = questions && questions.length;
        if (!numOfQuestions) {
            return RRError.reject('surveyNoQuestions');
        }
        questions.every((question, index) => {
            const skip = question.skip;
            if (skip) {
                const logic = skip.rule.logic;
                const count = skip.count;
                const answer = _.get(skip, 'rule.answer');
                if ((count + index) >= numOfQuestions) {
                    rejection = RRError.reject('skipValidationNotEnoughQuestions', count, index, numOfQuestions - index - 1);
                    return false;
                }
                if (logic === 'equals' || logic === 'not-equals') {
                    if (!answer) {
                        rejection = RRError.reject('skipValidationNoAnswerSpecified', index, logic);
                        return false;
                    }
                }
                if (logic === 'exists' || logic === 'not-exists' || logic === 'not-selected' || logic === 'each-not-selected') {
                    if (answer) {
                        rejection = RRError.reject('skipValidationAnswerSpecified', index, logic);
                        return false;
                    }
                }
            }
            return true;
        });
        return rejection;
    }

    createNewQuestionsTx(questions, tx) {
        const newQuestions = questions.reduce((r, qx, index) => {
            if (!qx.id) {
                r.push({ qx, index });
            }
            return r;
        }, []);
        if (newQuestions.length) {
            return SPromise.all(newQuestions.map(q => {
                    return this.question.createQuestionTx(q.qx, tx)
                        .then(({ id, choices }) => {
                            const inputQuestion = questions[q.index];
                            questions[q.index] = { id, required: inputQuestion.required };
                            let skip = inputQuestion.skip;
                            if (skip) {
                                const choiceText = _.get(skip, 'rule.answer.choiceText');
                                const rawChoices = _.get(skip, 'rule.answer.choices');
                                const selectionTexts = _.get(skip, 'rule.selectionTexts');
                                if (choiceText || rawChoices || selectionTexts) {
                                    skip = _.cloneDeep(skip);
                                    if (!choices) {
                                        return RRError.reject('surveySkipChoiceForNonChoice');
                                    }
                                    if (choiceText) {
                                        const serverChoice = choices.find(choice => choice.text === choiceText);
                                        if (!serverChoice) {
                                            return RRError.reject('surveySkipChoiceNotFound');
                                        }
                                        skip.rule.answer.choice = serverChoice.id;
                                        delete skip.rule.answer.choiceText;
                                    }
                                    if (rawChoices) {
                                        skip.rule.answer.choices.forEach(skipChoice => {
                                            const serverChoice = choices.find(choice => choice.text === skipChoice.text);
                                            if (!serverChoice) {
                                                throw new RRError('surveySkipChoiceNotFound');
                                            }
                                            skipChoice.id = serverChoice.id;
                                        });
                                        skip.rule.answer.choices.forEach(skipChoice => delete skipChoice.text);
                                    }
                                    if (selectionTexts) {
                                        const selectionIds = selectionTexts.map(text => {
                                            const serverChoice = choices.find(choice => choice.text === text);
                                            if (!serverChoice) {
                                                throw new RRError('surveySkipChoiceNotFound');
                                            }
                                            return serverChoice.id;
                                        });
                                        skip.rule.selectionIds = selectionIds;
                                        delete skip.rule.selectionTexts;
                                    }
                                }
                                questions[q.index].skip = skip;
                            }
                        });
                }))
                .then(() => questions);
        } else {
            return SPromise.resolve(questions);
        }
    }

    updateQuestionsTx(inputQxs, surveyId, transaction) {
        const questions = inputQxs.slice();
        return this.createNewQuestionsTx(questions, transaction)
            .then((questions) => {
                return SPromise.all(questions.map((qx, line) => {
                    const record = { questionId: qx.id, surveyId, line, required: Boolean(qx.required) };
                    if (qx.skip) {
                        record.skipCount = qx.skip.count;
                        const rule = qx.skip.rule;
                        return AnswerRule.create({ logic: rule.logic }, { transaction })
                            .then(({ id: ruleId }) => {
                                record.skipRuleId = ruleId;
                                return SurveyQuestion.create(record, { transaction })
                                    .then(() => {
                                        if (rule.answer) {
                                            let dbAnswers = this.answer.toDbAnswer(rule.answer);
                                            const pxs = dbAnswers.map(({ questionChoiceId, value }) => {
                                                questionChoiceId = questionChoiceId || null;
                                                value = (value !== undefined ? value : null);
                                                return AnswerRuleValue.create({ ruleId, questionChoiceId, value }, { transaction });
                                            });
                                            return SPromise.all(pxs);
                                        }
                                        if (rule.selectionIds) {
                                            const pxs = rule.selectionIds.map(questionChoiceId => {
                                                return AnswerRuleValue.create({ ruleId, questionChoiceId }, { transaction });
                                            });
                                            return SPromise.all(pxs);
                                        }
                                    });
                            });
                    } else {
                        return SurveyQuestion.create(record, { transaction });
                    }
                }));
            });
    }

    createSurveyTx(survey, transaction) {
        const fields = _.omit(survey, ['name', 'description', 'sections', 'questions', 'identifier']);
        return Survey.create(fields, { transaction })
            .then(({ id }) => this.createTextTx({ id, name: survey.name, description: survey.description }, transaction))
            .then(({ id }) => {
                return this.updateQuestionsTx(survey.questions, id, transaction)
                    .then(() => id);
            })
            .then(surveyId => {
                if (survey.identifier) {
                    const { type, value: identifier } = survey.identifier;
                    return this.surveyIdentifier.createSurveyIdentifier({ type, identifier, surveyId }, transaction)
                        .then(() => surveyId);
                }
                return surveyId;
            })
            .then(id => {
                if (survey.sections) {
                    return this.section.bulkCreateSectionsForSurveyTx(id, survey.sections, transaction)
                        .then(() => id);
                } else {
                    return id;
                }
            });
    }

    createSurvey(survey) {
        const rejection = this.validateCreateQuestionsPreTransaction(survey);
        if (rejection) {
            return rejection;
        }
        return sequelize.transaction(transaction => {
            return this.createSurveyTx(survey, transaction);
        });
    }

    replaceSurveySections(id, sections) {
        return sequelize.transaction(tx => {
            return this.section.bulkCreateSectionsForSurveyTx(id, sections, tx);
        });
    }

    updateSurveyTextTx({ id, name, description, sections }, language, tx) {
        return this.createTextTx({ id, name, description, language }, tx)
            .then(() => {
                if (sections) {
                    return this.section.updateMultipleSectionNamesTx(sections, language, tx);
                }
            });
    }

    updateSurveyText({ id, name, description, sections }, language) {
        return sequelize.transaction(tx => {
            return this.updateSurveyTextTx({ id, name, description, sections }, language, tx);
        });
    }

    updateSurvey(id, surveyUpdate) {
        return Survey.update(surveyUpdate, { where: { id } });
    }

    replaceSurveyTx(id, replacement, transaction) {
        return Survey.findById(id)
            .then(survey => {
                if (!survey) {
                    return RRError.reject('surveyNotFound');
                }
                return survey;
            })
            .then(survey => {
                const version = survey.version || 1;
                const newSurvey = Object.assign({
                    version: version + 1,
                    groupId: survey.groupId || survey.id
                }, replacement);
                return this.createSurveyTx(newSurvey, transaction)
                    .then((id) => {
                        if (!survey.version) {
                            return survey.update({ version: 1, groupId: survey.id }, { transaction })
                                .then(() => id);
                        }
                        return id;
                    })
                    .then((id) => {
                        return survey.destroy({ transaction })
                            .then(() => SurveyQuestion.destroy({ where: { surveyId: survey.id }, transaction }))
                            .then(() => ProfileSurvey.destroy({ where: { surveyId: survey.id }, transaction }))
                            .then(() => ProfileSurvey.create({ surveyId: id }, { transaction }))
                            .then(() => id);
                    });
            });
    }

    replaceSurvey(id, replacement) {
        const rejection = this.validateCreateQuestionsPreTransaction(replacement);
        if (rejection) {
            return rejection;
        }
        return sequelize.transaction(tx => {
            return this.replaceSurveyTx(id, replacement, tx);
        });
    }

    createOrReplaceSurvey(input) {
        const survey = _.omit(input, 'parentId');
        const parentId = input.parentId;
        if (parentId) {
            return this.replaceSurvey(parentId, survey);
        } else {
            return this.createSurvey(survey);
        }
    }

    deleteSurvey(id) {
        return sequelize.transaction(transaction => {
            return Survey.destroy({ where: { id }, transaction })
                .then(() => SurveyQuestion.destroy({ where: { surveyId: id }, transaction }))
                .then(() => ProfileSurvey.destroy({ where: { surveyId: id }, transaction }));
        });
    }

    listSurveys({ scope, language, history, where, order, groupId, version } = {}) {
        const attributes = ['id'];
        if (scope === 'version-only' || scope === 'version') {
            attributes.push('groupId');
            attributes.push('version');
        }
        const options = { raw: true, attributes, order: order || 'id', paranoid: !history };
        if (groupId || version) {
            options.where = {};
            if (groupId) {
                options.where.groupId = groupId;
            }
            if (version) {
                options.where.version = version;
            }
        }
        if (language) {
            options.language = language;
        }
        if (scope === 'version-only') {
            return Survey.findAll(options);
        }
        if (scope === 'id-only') {
            return Survey.findAll(options)
                .then(surveys => surveys.map(survey => survey.id));
        }
        return Survey.findAll(options)
            .then(surveys => this.updateAllTexts(surveys, options.language))
            .then(surveys => {
                if (scope === 'export') {
                    return SurveyQuestion.findAll({
                            raw: true,
                            attributes: ['surveyId', 'questionId', 'required'],
                            order: 'line'
                        })
                        .then(surveyQuestions => {
                            return surveyQuestions.reduce((r, qx) => {
                                const p = r.get(qx.surveyId);
                                if (!p) {
                                    r.set(qx.surveyId, [{ id: qx.questionId, required: qx.required }]);
                                    return r;
                                }
                                p.push({ id: qx.questionId, required: qx.required });
                                return r;
                            }, new Map());
                        })
                        .then(map => {
                            surveys.forEach(survey => {
                                survey.questions = map.get(survey.id);
                            });
                            return surveys;
                        });

                }
                return surveys;
            });
    }

    getSurvey(id, options = {}) {
        let _options = { where: { id }, raw: true, attributes: ['id', 'meta'] };
        if (options.override) {
            _options = _.assign({}, _options, options.override);
        }
        return Survey.findOne(_options)
            .then(survey => {
                if (!survey) {
                    return RRError.reject('surveyNotFound');
                }
                if (survey.meta === null) {
                    delete survey.meta;
                }
                return this.updateText(survey, options.language)
                    .then(() => this.surveyQuestion.listSurveyQuestions(survey.id))
                    .then(surveyQuestions => {
                        const ids = _.map(surveyQuestions, 'questionId');
                        const language = options.language;
                        return this.question.listQuestions({ scope: 'complete', ids, language })
                            .then(questions => {
                                const qxMap = _.keyBy(questions, 'id');
                                const qxs = surveyQuestions.map(surveyQuestion => {
                                    const result = Object.assign(qxMap[surveyQuestion.questionId], { required: surveyQuestion.required });
                                    if (surveyQuestion.skip) {
                                        result.skip = surveyQuestion.skip;
                                    }
                                    return result;
                                });
                                survey.questions = qxs;
                                return survey;
                            });
                    })
                    .then(() => {
                        return this.section.getSectionsForSurveyTx(survey.id, options.language)
                            .then((sections) => {
                                if (sections && sections.length) {
                                    survey.sections = sections;
                                }
                                return survey;
                            });
                    });
            });
    }

    getAnsweredSurvey(userId, id, options) {
        return this.getSurvey(id, options)
            .then(survey => {
                return this.answer.getAnswers({
                        userId,
                        surveyId: survey.id
                    })
                    .then(answers => {
                        const qmap = _.keyBy(survey.questions, 'id');
                        answers.forEach(answer => {
                            const qid = answer.questionId;
                            const question = qmap[qid];
                            question.language = answer.language;
                            if (answer.answer) {
                                question.answer = answer.answer;
                            } else if (answer.answers) {
                                question.answers = answer.answers;
                            }
                        });
                        return survey;
                    });
            });
    }

    export () {
        return this.listSurveys({ scope: 'export' })
            .then(surveys => {
                return surveys.reduce((r, { id, name, description, questions }) => {
                    const surveyLine = { id, name, description };
                    questions.forEach(({ id, required }, index) => {
                        const line = { questionId: id, required };
                        if (index === 0) {
                            Object.assign(line, surveyLine);
                        } else {
                            line.id = surveyLine.id;
                        }
                        r.push(line);
                    });
                    return r;
                }, []);
            })
            .then(lines => {
                const converter = new exportCSVConverter({ fields: ['id', 'name', 'description', 'questionId', 'required'] });
                return converter.dataToCSV(lines);
            });
    }

    importMetaProperties(record, metaOptions) {
        return metaOptions.reduce((r, propertyInfo) => {
            const name = propertyInfo.name;
            const value = record[name];
            if (value !== undefined && value !== null) {
                r[name] = value;
            }
            return r;
        }, {});
    }

    import (stream, questionIdMap, options = {}) {
        const choicesIdMap = _.values(questionIdMap).reduce((r, { choicesIds }) => {
            Object.assign(r, choicesIds);
            return r;
        }, {});
        questionIdMap = _.toPairs(questionIdMap).reduce((r, pair) => {
            r[pair[0]] = pair[1].questionId;
            return r;
        }, {});
        const converter = new importCSVConverter();
        return converter.streamToRecords(stream)
            .then(records => {
                const numRecords = records.length;
                if (!numRecords) {
                    return [];
                }
                const map = records.reduce((r, record) => {
                    const id = record.id;
                    let { survey } = r.get(id) || {};
                    if (!survey) {
                        survey = { name: record.name };
                        if (options.meta) {
                            const meta = this.importMetaProperties(record, options.meta);
                            if (Object.keys(meta).length > 0) {
                                survey.meta = meta;
                            }
                        }
                        if (record.description) {
                            survey.description = record.description;
                        }
                        r.set(id, { id, survey });
                    }
                    if (!survey.questions) {
                        survey.questions = [];
                    }
                    const question = {
                        id: questionIdMap[record.questionId],
                        required: record.required
                    };
                    if (record.skipCount) {
                        const rule = { logic: 'equals' };
                        const count = record.skipCount;
                        rule.answer = {
                            choice: choicesIdMap[record.skipValue]
                        };
                        question.skip = { count, rule };
                    }
                    survey.questions.push(question);
                    return r;
                }, new Map());
                return [...map.values()];
            })
            .then(records => {
                if (!records.length) {
                    return {};
                }
                return sequelize.transaction(transaction => {
                    const mapIds = {};
                    const pxs = records.map(({ id, survey }) => {
                        return this.createSurveyTx(survey, transaction)
                            .then(surveyId => mapIds[id] = surveyId);
                    });
                    return SPromise.all(pxs)
                        .then(() => {
                            if (options.sourceType) {
                                const type = options.sourceType;
                                const promises = _.transform(mapIds, (r, surveyId, identifier) => {
                                    const record = { type, identifier, surveyId };
                                    const promise = this.surveyIdentifier.createSurveyIdentifier(record, transaction);
                                    r.push(promise);
                                    return r;
                                }, []);
                                return SPromise.all(promises).then(() => mapIds);
                            }
                            return mapIds;
                        });
                });
            });
    }
};