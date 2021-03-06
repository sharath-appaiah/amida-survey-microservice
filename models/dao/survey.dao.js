'use strict';

const _ = require('lodash');

const answerCommon = require('./answer-common');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');
const importUtil = require('../../import/import-util');
const Translatable = require('./translatable');
const ExportCSVConverter = require('../../export/csv-converter.js');
const ImportCSVConverter = require('../../import/csv-converter.js');

const surveyPatchInfoQuery = queryrize.readQuerySync('survey-patch-info.sql');

const translateRuleChoices = function (ruleParent, choices) {
    const choiceText = _.get(ruleParent, 'answer.choiceText');
    const rawChoices = _.get(ruleParent, 'answer.choices');
    if (choiceText || rawChoices) {
        if (!choices) {
            return SurveyError.reject('surveySkipChoiceForNonChoice');
        }
        const p = ruleParent.answer;
        if (choiceText) {
            const serverChoice = choices.find(choice => choice.text === choiceText);
            if (!serverChoice) {
                return SurveyError.reject('surveySkipChoiceNotFound');
            }
            p.choice = serverChoice.id;
            delete p.choiceText;
        }
        if (rawChoices) {
            p.choices.forEach((r) => {
                const serverChoice = choices.find(choice => choice.text === r.text);
                if (!serverChoice) {
                    throw new SurveyError('surveySkipChoiceNotFound');
                }
                r.id = serverChoice.id;
            });
            p.choices.forEach(r => delete r.text);
        }
        return ruleParent;
    }
    return null;
};

const translateEnableWhen = function (parent, questions, questionChoices) {
    let enableWhen = parent.enableWhen;
    if (enableWhen) {
        enableWhen = _.cloneDeep(enableWhen);
        parent.enableWhen = enableWhen.map((r) => { // eslint-disable-line no-param-reassign
            const questionIndex = r.questionIndex;
            if (questionIndex !== undefined) {
                r.questionId = questions[questionIndex].id;
                delete r.questionIndex;
            }
            if (questionChoices) {
                const choices = questionChoices[r.questionId];
                return translateRuleChoices(r, choices) || r;
            }
            return r;
        });
    }
};

module.exports = class SurveyDAO extends Translatable {
    constructor(db, dependencies) {
        super(db, 'SurveyText', 'surveyId', ['name', 'description'], { description: true });
        Object.assign(this, dependencies);
        this.db = db;
    }

    flattenSectionsHieararchy(sections, result, parentIndex) {
        if (!sections.length) {
            result.sections.push({ line: 0 });
            return result;
        }
        sections.forEach((section, line) => {
            const { id, name, description, questions, enableWhen } = section;
            const sectionInfo = { name, description, parentIndex, line };
            if (id) {
                sectionInfo.id = id;
            }
            if (enableWhen) {
                sectionInfo.enableWhen = enableWhen;
            }
            result.sections.push(sectionInfo);

            if (questions) {
                const indices = this.flattenQuestionsHierarchy(questions, result);
                sectionInfo.indices = indices;
            }
            if (section.sections) {
                const index = result.sections.length ? result.sections.length - 1 : null;
                this.flattenSectionsHieararchy(section.sections, result, index);
            }
        });
        return result;
    }

    flattenQuestionsHierarchy(parentQuestions, result) {
        const indices = [];
        parentQuestions.forEach((question) => {
            const questionIndex = result.questions.length;
            indices.push(questionIndex);
            result.questions.push(question);
            const questionSections = question.sections;
            if (questionSections) {
                questionSections.forEach((section, line) => {
                    const { id, name, sections, questions, enableWhen } = section;
                    const sectionInfo = { name, questionIndex, line };
                    if (id) {
                        sectionInfo.id = id;
                    }
                    if (enableWhen) {
                        sectionInfo.enableWhen = enableWhen;
                    }
                    result.sections.push(sectionInfo);
                    if (questions) {
                        const indices2 = this.flattenQuestionsHierarchy(questions, result);
                        sectionInfo.indices = indices2;
                    }
                    if (sections) {
                        const n = result.sections.length;
                        const parentIndex = n ? n - 1 : null;
                        this.flattenSectionsHieararchy(sections, result, parentIndex);
                    }
                });
            }
        });
        return indices;
    }

    flattenHierarchy({ sections, questions }) {
        if (questions && sections) {
            throw new SurveyError('surveyBothQuestionsSectionsSpecified');
        }

        const result = { sections: [], questions: [] };
        if (sections) {
            return this.flattenSectionsHieararchy(sections, result, null);
        }
        if (questions) {
            this.flattenQuestionsHierarchy(questions, result);

            if (result.sections.length === 0) {
                delete result.sections;
            }
        }

        return result;
    }

    createRuleAnswerValue(ruleParent, transaction) {
        const AnswerRuleValue = this.db.AnswerRuleValue;
        if (!ruleParent) {
            return null;
        }
        const rule = ruleParent;
        const ruleId = ruleParent.ruleId;
        if (rule.answer) {
            const dbAnswers = answerCommon.prepareAnswerForDB(rule.answer);
            const pxs = dbAnswers.map(({ questionChoiceId, value }) => {
                const record = {
                    ruleId,
                    questionChoiceId: questionChoiceId || null,
                    value: (value !== undefined ? value : null),
                };
                return AnswerRuleValue.create(record, { transaction });
            });
            return SPromise.all(pxs);
        }
        return null;
    }

    createNewQuestionsTx(questions, tx) {
        const newQuestions = questions.reduce((r, qx, index) => {
            if (!qx.id) {
                r.push({ qx, index });
            }
            return r;
        }, []);
        if (newQuestions.length) {
            const questionChoices = {};
            return SPromise.all(newQuestions.map(q => this.question.createQuestionTx(q.qx, tx)
                        .then(({ id, choices }) => {
                            const inputQuestion = questions[q.index];
                            questions[q.index] = { id, required: inputQuestion.required }; // eslint-disable-line no-param-reassign, max-len
                            questionChoices[id] = choices;
                            let enableWhen = inputQuestion.enableWhen;
                            if (enableWhen) {
                                enableWhen = _.cloneDeep(enableWhen);
                                questions[q.index].enableWhen = enableWhen; // eslint-disable-line no-param-reassign, max-len
                            }
                        })))
                .then(() => ({ questions, questionChoices }));
        }
        return SPromise.resolve({ questions });
    }

    createRulesForQuestions(surveyId, questions, transaction) {
        const AnswerRule = this.db.AnswerRule;
        const questionsWithRule = questions.filter(question => question.enableWhen);
        if (questionsWithRule.length) {
            const promises = questionsWithRule.reduce((r, question) => {
                question.enableWhen.forEach((p, line) => {
                    const answerRule = {
                        surveyId,
                        questionId: question.id,
                        logic: p.logic,
                        line,
                    };
                    answerRule.answerQuestionId = p.questionId;
                    const promise = AnswerRule.create(answerRule, { transaction })
                        .then(({ id }) => {
                            const code = p.answer && p.answer.code;
                            if ((code !== null) && (code !== undefined)) {
                                return this.questionChoice.findQuestionChoiceIdForCode(answerRule.answerQuestionId, code, transaction) // eslint-disable-line max-len
                                    .then((choiceId) => {
                                        p.answer.choice = choiceId;
                                        delete p.answer.code;
                                        return { id };
                                    });
                            }
                            return ({ id });
                        })
                        .then(({ id }) => {
                            p.ruleId = id;
                            return this.createRuleAnswerValue(p, transaction);
                        });
                    r.push(promise);
                });
                return r;
            }, []);
            return SPromise.all(promises).then(() => questions);
        }
        return questions;
    }

    createRulesForSections(surveyId, sections, sectionIds, transaction) {
        const n = sections.length;
        const sectionsWithRule = _.range(n).filter(index => sections[index].enableWhen);
        if (sectionsWithRule.length) {
            const promises = sectionsWithRule.reduce((r, index) => {
                const section = sections[index];
                const sectionId = sectionIds[index];
                section.enableWhen.forEach((p, line) => {
                    const answerRule = { surveyId, sectionId, logic: p.logic, line };
                    answerRule.answerQuestionId = p.questionId;
                    const promise = this.db.AnswerRule.create(answerRule, { transaction })
                        .then(({ id }) => {
                            const code = p.answer && p.answer.code;
                            if ((code !== null) && (code !== undefined)) {
                                return this.questionChoice.findQuestionChoiceIdForCode(answerRule.answerQuestionId, code, transaction) // eslint-disable-line max-len
                                    .then((choiceId) => {
                                        p.answer.choice = choiceId;
                                        delete p.answer.code;
                                        return { id };
                                    });
                            }
                            return ({ id });
                        })
                        .then(({ id }) => {
                            p.ruleId = id;
                            return this.createRuleAnswerValue(p, transaction);
                        });
                    r.push(promise);
                });
                return r;
            }, []);
            return SPromise.all(promises).then(() => sections);
        }
        return sections;
    }

    createSurveyQuestionsTx(inputQuestions, sections, surveyId, transaction) {
        return this.createNewQuestionsTx(inputQuestions.slice(), transaction)
            .then(({ questions, questionChoices }) => {
                questions.forEach(r => translateEnableWhen(r, questions, questionChoices));
                if (sections) {
                    sections.forEach(r => translateEnableWhen(r, questions, questionChoices));
                }
                return questions;
            })
            .then(questions => this.createRulesForQuestions(surveyId, questions, transaction))
            .then(questions => SPromise.all(questions.map((qx, line) => {
                const required = Boolean(qx.required);
                const record = { questionId: qx.id, surveyId, line, required };
                return this.db.SurveyQuestion.create(record, { transaction });
            }))
                    .then(() => questions));
    }

    updateSurveyTx(inputId, survey, transaction) {
        const { sections, questions } = this.flattenHierarchy(survey);
        const record = { id: inputId, name: survey.name, description: survey.description };
        return this.createTextTx(record, transaction)
            .then(({ id }) => this.createSurveyQuestionsTx(questions, sections, id, transaction)
                .then((qxs) => {
                    const questionIds = qxs.map(question => question.id);
                    return { questionIds, surveyId: id };
                }))
            .then(({ questionIds, surveyId }) => {
                if (sections) {
                    return this.surveySection.bulkCreateFlattenedSectionsForSurveyTx(surveyId, questionIds, sections, transaction) // eslint-disable-line max-len
                        .then(sectionIds => this.createRulesForSections(surveyId, sections, sectionIds, transaction)) // eslint-disable-line max-len
                        .then(() => surveyId);
                }
                return surveyId;
            })
            .then((surveyId) => {
                if (survey.identifier) {
                    const { type, value: identifier } = survey.identifier;
                    return this.surveyIdentifier.createSurveyIdentifier({ type, identifier, surveyId }, transaction) // eslint-disable-line max-len
                        .then(() => surveyId);
                }
                return surveyId;
            });
    }

    createSurveyTx(survey, userId, transaction) {
        if (survey.sections && !survey.sections.length) {
            return SurveyError.reject('needAtLeastOneEmptySection');
        }

        const fields = _.omit(survey, ['name', 'description', 'sections', 'questions', 'identifier']);
        fields.authorId = userId;
        if (!survey.questions && !survey.sections) {
            return this.db.Survey.create(fields, { transaction })
                .then(({ id }) => this.updateSurveyTx(id, Object.assign({}, survey, { questions: [] }), transaction));// eslint-disable-line max-len
        }
        return this.db.Survey.create(fields, { transaction })
            .then(({ id }) => this.updateSurveyTx(id, survey, transaction));
    }

    createSurvey(survey, userId = 1) {
        return this.transaction(transaction => this.createSurveyTx(survey, userId, transaction));
    }

    patchSurveyTextTx({ id, name, description, sections }, language, transaction) {
        return this.createTextTx({ id, name, description, language }, transaction)
            .then(() => {
                if (sections) {
                    return this.surveySection.updateMultipleSectionNamesTx(sections, language, transaction); // eslint-disable-line max-len
                }
                return null;
            });
    }

    patchSurveyText({ id, name, description, sections }, language) {
        return this.transaction(transaction => this.patchSurveyTextTx({ id, name, description, sections }, language, transaction)); // eslint-disable-line max-len
    }

    patchSurveyInformationTx(surveyId, { name, description, sections, questions }, transaction) {
        const replacements = {
            text_needed: Boolean(name || (description !== undefined)),
            questions_needed: Boolean(questions || sections),
            sections_needed: Boolean(questions && !sections),
            survey_id: surveyId,
        };
        return this.selectQuery(surveyPatchInfoQuery, replacements, transaction)
            .then((surveys) => {
                if (!surveys.length) {
                    return SurveyError.reject('surveyNotFound');
                }
                return surveys[0];
            });
    }

    patchSurveyTx(surveyId, surveyPatch, transaction) {
        return this.patchSurveyInformationTx(surveyId, surveyPatch, transaction)
            .then((survey) => {
                if (!surveyPatch.forceStatus && survey.status === 'retired') {
                    return SurveyError.reject('surveyRetiredStatusUpdate');
                }
                return SPromise.resolve()
                    .then(() => {
                        const { status, meta, forceStatus } = surveyPatch;
                        if (status || meta) {
                            const fields = {};
                            if (status && (status !== survey.status)) {
                                if (survey.status === 'draft' && status === 'retired') {
                                    return SurveyError.reject('surveyDraftToRetiredUpdate');
                                }
                                if (!forceStatus && (status === 'draft') && (survey.status === 'published')) { // eslint-disable-line max-len
                                    return SurveyError.reject('surveyPublishedToDraftUpdate');
                                }
                                fields.status = status;
                            }
                            if (meta) {
                                if (_.isEmpty(meta)) {
                                    fields.meta = null;
                                } else {
                                    fields.meta = meta;
                                }
                            }
                            if (!_.isEmpty(fields)) {
                                const where = { id: surveyId };
                                return this.db.Survey.update(fields, { where, transaction });
                            }
                        }
                        return null;
                    })
                    .then(() => {
                        let { name, description } = surveyPatch;
                        if (name || (description !== undefined)) {
                            name = name || survey.name;
                            if (description === '') {
                                description = null;
                            } else {
                                description = description || survey.description;
                            }
                            const record = { id: surveyId, name, description };
                            return this.createTextTx(record, transaction);
                        }
                        return null;
                    })
                    .then(() => {
                        if (!(surveyPatch.questions || surveyPatch.sections)) {
                            return null;
                        }
                        const { sections, questions } = this.flattenHierarchy(surveyPatch);
                        const questionIdSet = new Set();
                        questions.forEach((question) => {
                            const questionId = question.id;
                            if (questionId) {
                                questionIdSet.add(questionId);
                            }
                        });

                        const noQuestionIds = !survey.questionIds;
                        let removedQuestionIds = [];
                        if (!noQuestionIds) {
                            removedQuestionIds = survey.questionIds.reduce((r, questionId) => {
                                if (!questionIdSet.has(questionId)) {
                                    r.push(questionId);
                                }
                                return r;
                            }, []);
                        }


                        if (removedQuestionIds.length || (!noQuestionIds && (survey.questionIds.length !== questions.length))) { // eslint-disable-line max-len
                            if (!surveyPatch.forceQuestions && (surveyPatch.status !== 'draft' && survey.status !== 'draft') ) {
                                return SurveyError.reject('surveyChangeQuestionWhenPublished');
                            }
                        }
                        return this.db.SurveyQuestion.destroy({ where: { surveyId }, transaction })
                            .then(() => {
                                if (removedQuestionIds.length) {
                                    const where = {
                                        surveyId, questionId: { $in: removedQuestionIds },
                                    };
                                    return this.db.Answer.destroy({ where, transaction });
                                }
                                return null;
                            })
                            .then(() => this.createSurveyQuestionsTx(questions, sections, surveyId, transaction)) // eslint-disable-line max-len
                            .then(qxs => qxs.map(question => question.id))
                            .then((questionIds) => {
                                if (sections) {
                                    return this.surveySection.bulkCreateFlattenedSectionsForSurveyTx(surveyId, questionIds, sections, transaction); // eslint-disable-line max-len
                                } else if (survey.sectionCount) {
                                    return this.surveySection.deleteSurveySectionsTx(surveyId, transaction); // eslint-disable-line max-len
                                }
                                return null;
                            });
                    });
            });
    }

    patchSurvey(id, surveyPatch) {
        return this.transaction(transaction => this.patchSurveyTx(id, surveyPatch, transaction));
    }

    replaceSurveyTx(originalId, replacement, userId, transaction) {
        return this.db.Survey.findById(originalId)
            .then((survey) => {
                if (!survey) {
                    return SurveyError.reject('surveyNotFound');
                }
                return survey;
            })
            .then((survey) => {
                const version = survey.version || 1;
                const newSurvey = Object.assign({
                    version: version + 1,
                    groupId: survey.groupId || survey.id,
                }, replacement);
                return this.createSurveyTx(newSurvey, userId, transaction)
                    .then((id) => {
                        if (!survey.version) {
                            const record = { version: 1, groupId: survey.id };
                            return survey.update(record, { transaction })
                                .then(() => id);
                        }
                        return id;
                    })
                    .then((id) => {
                        const where = { surveyId: survey.id };
                        return survey.destroy({ transaction })
                            .then(() => this.db.SurveyQuestion.destroy({ where, transaction }))
                            .then(() => id);
                    });
            });
    }

    replaceSurvey(id, replacement, userId = 1) {
        return this.transaction(tx => this.replaceSurveyTx(id, replacement, userId, tx));
    }

    createOrReplaceSurvey(surveyInfo, userId = 1) {
        const newSurvey = _.omit(surveyInfo, 'parentId');
        const parentId = surveyInfo.parentId;
        if (parentId) {
            return this.replaceSurvey(parentId, newSurvey, userId);
        }
        return this.createSurvey(newSurvey, userId);
    }

    deleteSurvey(id) {
        const Survey = this.db.Survey;
        const SurveyQuestion = this.db.SurveyQuestion;
        const SurveySection = this.db.SurveySection;
        const Answer = this.db.Answer;
        return this.transaction(transaction => Survey.destroy({ where: { id }, transaction })
                .then(() => SurveyQuestion.destroy({ where: { surveyId: id }, transaction }))
                .then(() => SurveySection.destroy({ where: { surveyId: id }, transaction }))
                .then(() => Answer.destroy({ where: { surveyId: id }, transaction })));
    }

    listSurveys(opt = {}) {
        const { scope, language, history, order, groupId, version, ids } = opt;
        const status = opt.status || 'published';
        const attributes = (status === 'all') ? ['id', 'status'] : ['id'];
        if (scope === 'version-only' || scope === 'version') {
            attributes.push('groupId');
            attributes.push('version');
        }
        if (scope !== 'export') {
            attributes.push('authorId');
        }
        const options = { raw: true, attributes, order: order || 'id', paranoid: !history };
        if (groupId || version || (status !== 'all') || ids) {
            options.where = {};
            if (groupId) {
                options.where.groupId = groupId;
            }
            if (version) {
                options.where.version = version;
            }
            if (status !== 'all') {
                options.where.status = status;
            }
            if (ids) {
                options.where.id = { $in: ids };
            }
        }

        if (language) {
            options.language = language;
        }
        if (scope === 'version-only') {
            return this.db.Survey.findAll(options);
        }
        if (scope === 'id-only') {
            return this.db.Survey.findAll(options)
                .then(surveys => surveys.map(survey => survey.id));
        }

        return this.db.Survey.findAll(options)
            .then(surveys => this.updateAllTexts(surveys, options.language))
            .then((surveys) => {
                if (scope === 'export') {
                    return this.updateSurveyListExport(surveys);
                }

                return surveys;
            });
    }

    updateSurveyListExport(surveys) {
        const surveyMap = new Map(surveys.map(survey => [survey.id, survey]));
        return this.db.SurveyQuestion.findAll({
            raw: true,
            attributes: ['surveyId', 'questionId', 'required'],
            order: 'line',
        })
            .then((surveyQuestions) => {
                surveyQuestions.forEach(({ surveyId, questionId, required }) => {
                    const survey = surveyMap.get(surveyId);
                    if (survey) {
                        const questions = survey.questions;
                        const question = { id: questionId, required };
                        if (questions) {
                            questions.push(question);
                        } else {
                            survey.questions = [question];
                        }
                    }
                });
                return surveys;
            })
            .then(() => this.surveySection.updateSurveyListExport(surveyMap))
            .then(() => surveys);
    }

    getSurvey(id, options = {}) {
        const attributes = ['authorId', 'id', 'meta', 'status'];
        let opt = { where: { id }, raw: true, attributes };
        if (options.override) {
            opt = _.assign({}, opt, options.override);
        }
        return this.db.Survey.findOne(opt)
            .then((survey) => {
                if (!survey) {
                    return SurveyError.reject('surveyNotFound');
                }
                if (survey.meta === null) {
                    delete survey.meta; // eslint-disable-line no-param-reassign
                }
                if (options.override) {
                    return survey;
                }
                return this.answerRule.getSurveyAnswerRules({ surveyId: survey.id })
                    .then(answerRuleInfos => this.updateText(survey, options.language)
                            .then(() => this.surveyQuestion.listSurveyQuestions(survey.id))
                            .then((surveyQuestions) => {
                                const ids = _.map(surveyQuestions, 'questionId');
                                const language = options.language;
                                return this.question.listQuestions({ scope: 'complete', ids, language })
                                    .then((questions) => {
                                        const qxMap = _.keyBy(questions, 'id');
                                        const qxs = surveyQuestions.map((surveyQuestion) => {
                                            const result = Object.assign(qxMap[surveyQuestion.questionId], { required: surveyQuestion.required }); // eslint-disable-line max-len
                                            return result;
                                        });
                                        answerRuleInfos.forEach(({ questionId, rule }) => {
                                            if (questionId) {
                                                const question = qxMap[questionId];
                                                if (!question.enableWhen) {
                                                    question.enableWhen = [];
                                                }
                                                question.enableWhen.push(rule);
                                            }
                                        });
                                        return qxs;
                                    });
                            })
                            .then(questions => this.surveySection.getSectionsForSurveyTx(survey.id, questions, answerRuleInfos, options.language) // eslint-disable-line max-len
                                    .then((result) => {
                                        if (!result) {
                                            survey.questions = questions; // eslint-disable-line no-param-reassign, max-len
                                            return survey;
                                        }
                                        const { sections, innerQuestionSet } = result;
                                        if (sections && sections.length) {
                                            survey.sections = sections; // eslint-disable-line no-param-reassign, max-len
                                        } else {
                                            survey.questions = questions.filter(qx => !innerQuestionSet.has(qx.id)); // eslint-disable-line max-len, no-param-reassign
                                        }
                                        return survey;
                                    })));
            });
    }

    updateQuestionQuestionsMap(questions, map) {
        questions.forEach((question) => {
            map.set(question.id, question);
            if (question.sections) {
                this.updateQuestionsMap({ sections: question.sections }, map);
            }
        });
    }

    updateQuestionsMap({ questions, sections }, map) {
        if (questions) {
            return this.updateQuestionQuestionsMap(questions, map);
        }
        sections.forEach((section) => {
            this.updateQuestionsMap(section, map);
        });
        return null;
    }

    getQuestionsMap(survey) {
        const map = new Map();
        this.updateQuestionsMap(survey, map);
        return map;
    }

    updateQuestionQuestionsList(questions, list) {
        questions.forEach((question) => {
            list.push(question);
            if (question.sections) {
                this.updateQuestionsList({ sections: question.sections }, list);
            }
        });
    }

    updateQuestionsList({ questions, sections }, list) {
        if (questions) {
            return this.updateQuestionQuestionsList(questions, list);
        }
        sections.forEach((section) => {
            this.updateQuestionsList(section, list);
        });
        return null;
    }

    getQuestions(survey) {
        const list = [];
        this.updateQuestionsList(survey, list);
        return list;
    }

    getAnsweredSurvey(userId, id, options) {
        return this.getSurvey(id, options)
            .then(survey => this.answer.getAnswers({
                userId,
                surveyId: survey.id,
            })
                    .then((answers) => {
                        const questionMap = this.getQuestionsMap(survey);
                        answers.forEach((answer) => {
                            const qid = answer.questionId;
                            const question = questionMap.get(qid);
                            question.language = answer.language;
                            if (answer.answer) {
                                question.answer = answer.answer;
                            } else if (answer.answers) {
                                question.answers = answer.answers;
                            }
                        });
                        return survey;
                    }));
    }

    exportAppendQuestionLines(r, startBaseObject, baseObject, questions) {
        if (questions) {
            questions.forEach(({ id, required, sections }, index) => {
                const line = { questionId: id, required };
                if (index === 0) {
                    Object.assign(line, startBaseObject);
                } else {
                    Object.assign(line, baseObject);
                }
                r.push(line);
                if (sections) {
                    const questionAsParent = Object.assign({
                        id: baseObject.id, parentQuestionId: id,
                    });
                    this.exportAppendSectionLines(r, questionAsParent, questionAsParent, sections);
                }
            });
        }
    }

    exportAppendSectionLines(r, startBaseObject, baseObject, parentSections) {
        if (parentSections) {
            parentSections.forEach(({ id, sections, questions }, index) => {
                const line = { sectionId: id };
                if (index === 0) {
                    Object.assign(line, startBaseObject);
                } else {
                    Object.assign(line, baseObject);
                }
                if (questions) {
                    const nextLines = Object.assign({ sectionId: id }, baseObject);
                    this.exportAppendQuestionLines(r, line, nextLines, questions);
                    return;
                }
                r.push(line);
                const sectionAsParent = { id: baseObject.id, parentSectionId: id };
                this.exportAppendSectionLines(r, sectionAsParent, sectionAsParent, sections);
            });
        }
    }

    exportSurveys() {
        return this.listSurveys({ scope: 'export' })
            .then(surveys => surveys.reduce((r, { id, name, description, questions, sections }) => {
                const surveyLine = { id, name, description };

                if (questions) {
                    this.exportAppendQuestionLines(r, surveyLine, { id }, questions);
                    return r;
                }

                this.exportAppendSectionLines(r, surveyLine, { id }, sections);
                return r;
            }, []))
            .then((lines) => {
                const converter = new ExportCSVConverter({
                    fields: [
                        'id', 'name', 'description', 'parentSectionId',
                        'parentQuestionId', 'sectionId', 'questionId', 'required',
                    ],
                });
                return converter.dataToCSV(lines);
            });
    }

    importToDb(surveys, surveyQuestions, surveySections, surveySectionQuestions, options = {}) {
        return this.transaction((transaction) => {
            const idMap = {};
            const promises = surveys.map((survey) => {
                const { id: importId, name, description, meta } = survey;
                const record = meta ? { meta } : {};
                const fields = _.omit(record, ['name', 'description', 'id']);
                return this.db.Survey.create(fields, { transaction })
                    .then(({ id }) => this.createTextTx({ id, name, description }, transaction))
                    .then(({ id }) => { idMap[importId] = id; });
            });
            return SPromise.all(promises)
                .then(() => {
                    surveyQuestions.forEach((surveyQuestion) => {
                        const newSurveyId = idMap[surveyQuestion.surveyId];
                        Object.assign(surveyQuestion, { surveyId: newSurveyId });
                    });
                    return this.surveyQuestion.importSurveyQuestionsTx(surveyQuestions, transaction); // eslint-disable-line max-len
                })
                .then(() => {
                    surveySections.forEach((surveySection) => {
                        const newSurveyId = idMap[surveySection.surveyId];
                        Object.assign(surveySection, { surveyId: newSurveyId });
                    });
                    return this.surveySection.importSurveySectionsTx(surveySections, surveySectionQuestions, transaction); // eslint-disable-line max-len
                })
                .then(() => {
                    if (options.sourceType) {
                        const type = options.sourceType;
                        const promises2 = _.transform(idMap, (r, surveyId, identifier) => {
                            const record = { type, identifier, surveyId };
                            const promise = this.surveyIdentifier.createSurveyIdentifier(record, transaction); // eslint-disable-line max-len
                            r.push(promise);
                            return r;
                        }, []);
                        return SPromise.all(promises2).then(() => idMap);
                    }
                    return idMap;
                });
        });
    }

    importSurveys(stream, maps, options = {}) {
        const questionIdMap = _.toPairs(maps.questionIdMap).reduce((r, pair) => {
            r[pair[0]] = pair[1].questionId;
            return r;
        }, {});
        const converter = new ImportCSVConverter({ checkType: false });
        return converter.streamToRecords(stream)
            .then(records => records.map((record) => {
                const idFields = [
                    'sectionId', 'questionId', 'parentSectionId', 'parentQuestionId',
                ];
                const newRecord = _.omit(record, idFields);
                ['sectionId', 'parentSectionId'].forEach((field) => {
                    const value = record[field];
                    if (value) {
                        const newValue = maps.sectionIdMap[value];
                        if (!newValue) {
                            throw new SurveyError('surveyImportMissingSectionId', value);
                        }
                        newRecord[field] = newValue;
                    }
                });

                ['questionId', 'parentQuestionId'].forEach((field) => {
                    const value = record[field];
                    if (value) {
                        const newValue = questionIdMap[value];
                        if (newValue) {
                            newRecord[field] = newValue;
                        }
                    }
                });
                return newRecord;
            }))
            .then((records) => {
                if (!records.length) {
                    return {};
                }
                let currentId = null;
                const sectionMap = new Map();
                const surveys = [];
                const surveyQuestions = [];
                const surveySections = [];
                const surveySectionQuestions = [];
                records.forEach((record) => {
                    const id = record.id;
                    if (id !== currentId) {
                        const survey = { id, name: record.name };
                        importUtil.updateMeta(survey, record, options);
                        if (record.description) {
                            survey.description = record.description;
                        }
                        surveys.push(survey);
                        currentId = id;
                    }
                    if (record.sectionId) {
                        let index = sectionMap.get(record.sectionId);
                        if (index === undefined) {
                            index = surveySections.length;
                            const section = {
                                surveyId: id, sectionId: record.sectionId, line: index,
                            };
                            surveySections.push(section);
                            sectionMap.set(record.sectionId, index);
                            const { parentSectionId, parentQuestionId } = record;
                            if (parentSectionId) {
                                const parentIndex = sectionMap.get(parentSectionId);
                                if (parentIndex === undefined) {
                                    const errCode = 'surveyImportMissingParentSectionId';
                                    throw new SurveyError(errCode, parentSectionId);
                                }
                                section.parentIndex = parentIndex;
                            }
                            if (parentQuestionId) {
                                section.parentQuestionId = parentQuestionId;
                            }
                        }
                        if (record.questionId) {
                            surveySectionQuestions.push({
                                sectionIndex: index,
                                questionId: record.questionId,
                                line: surveySectionQuestions.length,
                            });
                        }
                    }
                    if (record.questionId) {
                        const question = {
                            surveyId: id,
                            questionId: record.questionId,
                            required: record.required,
                            line: surveyQuestions.length,
                        };
                        surveyQuestions.push(question);
                    }
                });
                return this.importToDb(surveys, surveyQuestions, surveySections, surveySectionQuestions, options); // eslint-disable-line no-param-reassign, max-len
            });
    }

    getNumberOfUsersBySurvey({ surveyId, softDelete }) {
        const paranoid = softDelete !== true;
        return this.db.Answer.count({
            where: { surveyId },
            raw: true,
            group: ['user_id'],
            paranoid,
        }).then(answers => answers.length);
    }
};
