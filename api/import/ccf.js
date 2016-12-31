'use strict';

const _ = require('lodash');
const intoStream = require('into-stream');

const SPromise = require('../lib/promise');

const XLSXConverter = require('./xlsx-converter');

const models = require('../models');

const headers2 = {
    number: 'id',
    'objectId (Hash Tag Used for Questions)': 'key',
    question: 'text',
    instruction: 'instruction',
    'skipCount (Number of Questions Skipped if Contitional answer is picked)': 'skipCount',
    answerType: 'type',
    'conditional (Answer Hash Tag used with skipCount to skip next question if certain answer is picked)': 'condition',
    answer: 'choice',
    'hash (Hash Tag Used for Answers)': 'answerKey',
    tag: 'tag',
    toggle: 'toggle'
};

const converters = {
    answers() {
        return new XLSXConverter({
            dateTimes: ['updated_at']
        });
    },
    assessments() {
        return new XLSXConverter({
            dateTimes: ['updated_at']
        });
    },
    surveys() {
        return new XLSXConverter({
            sheets: [{
                name: 'Questions'
            }, {
                name: 'Pillars'
            }]
        });
    }
};

const answerUpdateSingle = function (line, question) {
    question.answerKey = line.answerKey;
    question.tag = line.tag;
};

const answerUpdateChoice = function (line, question, choices, pillarQuestion) {
    if (!question.choices) {
        question.choices = [];
    }
    const choice = {
        id: choices.length + 1,
        value: line.choice
    };
    if (line.toggle) {
        choice.toggle = line.toggle;
    }
    choice.answerKey = line.answerKey;
    if (pillarQuestion.condition === choice.answerKey) {
        pillarQuestion.skipValue = choice.id;
    }
    choice.tag = line.tag;
    question.choices.push(choice.id);
    choices.push(choice);
};

const answerUpdate = {
    1: answerUpdateChoice,
    2: answerUpdateChoice,
    3: answerUpdateChoice,
    4: answerUpdateChoice,
    5: answerUpdateSingle,
    7: answerUpdateChoice,
    8: answerUpdateChoice,
    9: answerUpdateChoice,
    10: answerUpdateChoice
};

const questionTypes = {
    5: 'zip',
    10: ['month', 'day', 'year'],
    2: 'choice',
    3: 'choice',
    7: 'choice',
    4: 'choices',
    8: ['integer'],
    9: ['integer', 'integer'],
};

const surveysPost = function (result, key, lines) {
    lines.Questions = lines.Questions.map(row => {
        return Object.keys(row).reduce((r, key) => {
            const newKey = headers2[key] || key;
            const value = row[key];
            r[newKey] = value;
            return r;
        }, {});
    });
    result[`surveysIdIndex`] = _.keyBy(lines.Pillars, 'id');
    result[`surveysTitleIndex`] = _.keyBy(lines.Pillars, 'title');
    lines.Pillars.forEach(pillar => pillar.isBHI = (pillar.isBHI === 'true'));
    if (!(lines.Pillars && result.surveysTitleIndex)) {
        throw new Error('Pillar records have to be read before questions.');
    }
    let activePillar = null;
    let activeQuestion = null;
    let pillarQuestion = null;
    const questions = [];
    const choices = [];
    lines.Questions.forEach(line => {
        const objKeys = Object.keys(line);
        if ((objKeys.length === 1) && (objKeys[0] === 'id')) {
            const title = line.id;
            activePillar = result.surveysTitleIndex[title];
            if (!activePillar) {
                throw new Error(`Unknown pillar: ${title}`);
            }
            activePillar.questions = [];
            return;
        }
        if (!activePillar) {
            throw new Error('Unexpected line.  Pillar title expected');
        }
        if (line.key) {
            activeQuestion = {
                id: questions.length + 1,
                key: line.key,
                text: line.text,
                instruction: line.instruction || '',
                type: line.type
            };
            if (activeQuestion.hasOwnProperty('type')) {
                activeQuestion.type = parseInt(activeQuestion.type, 10);
            }
            pillarQuestion = {
                questionId: activeQuestion.id,
            };
            if (line.condition) {
                pillarQuestion.condition = line.condition;
                pillarQuestion.skipCount = line.skipCount;
            }
            activePillar.questions.push(pillarQuestion);
            questions.push(activeQuestion);
        }
        if (!activeQuestion) {
            throw new Error('Unexpected line. Question key expected');
        }
        const fnAnswer = answerUpdate[activeQuestion.type];
        if (fnAnswer) {
            fnAnswer(line, activeQuestion, choices, pillarQuestion);
            return;
        }
        throw new Error(`Unexpected line.  Unsupported type: ${activeQuestion.type}`);
    });
    result[key].Questions = questions;
    result.choices = choices;
    result.pillars = result.surveys.Pillars;
    result.questions = result.surveys.Questions;
};

const answersPost = function (result, key, lines) {
    lines.forEach(r => {
        if (r.string_value === 'null') {
            delete r.string_value;
        }
        if (r.boolean_value === 'null') {
            delete r.boolean_value;
        }
    });

    const answers = [];
    const indexAnswers = {};
    const assessmentIndex = {};
    const jsonByAssessment = _.groupBy(lines, 'hb_assessment_id');
    const assessments = Object.keys(jsonByAssessment);
    assessments.forEach((assessment, assessIndex) => {
        const current = jsonByAssessment[assessment];
        jsonByAssessment[assessment] = current.reduce((r, p) => {
            delete p.hb_assessment_id;
            const index = `${p.pillar_hash}\t${p.hb_user_id}\t${p.updated_at}`;
            if (assessmentIndex[index] !== undefined && assessmentIndex[index] !== assessIndex) {
                return r;
            }
            assessmentIndex[index] = assessIndex;
            let record = indexAnswers[index];
            if (!record) {
                record = {
                    user_id: p.hb_user_id,
                    pillar_hash: p.pillar_hash,
                    updated_at: p.updated_at,
                    answers: []
                };
                answers.push(record);
                indexAnswers[index] = record;
            }
            const answer = { answer_hash: p.answer_hash };
            if (p.hasOwnProperty('string_value')) {
                answer.string_value = p.string_value;
            } else if (p.hasOwnProperty('boolean_value')) {
                answer.boolean_value = p.boolean_value;
            }
            record.answers.push(answer);
            return r;
        }, []);
    });
    result.answers = answers;
    result.assesmentAnswers = jsonByAssessment;
};

const postAction = {
    answers: answersPost,
    surveys: surveysPost
};

const importFile = function (filepaths, result, key) {
    const filepath = filepaths[key];
    const converter = converters[key]();
    return converter.fileToRecords(filepath)
        .then(json => {
            result[key] = json;
        });
};

const importFiles = function (filepaths) {
    const result = {};
    const keys = ['surveys', 'assessments', 'answers'];
    const pxs = keys.map(key => importFile(filepaths, result, key));
    return SPromise.all(pxs)
        .then(() => {
            keys.forEach(key => {
                const fn = postAction[key];
                if (fn) {
                    fn(result, key, result[key]);
                }
            });
            return result;
        });
};

const importToDb = function (jsonDB) {
    const choiceMap = new Map(jsonDB.choices.map(choice => [choice.id, [choice.value, choice.toggle, choice.answerKey, choice.tag]]));
    const csv = jsonDB.questions.reduce((r, question) => {
        let id = question.id;
        const type = questionTypes[question.type];
        let questionType = type;
        let ccType = question.type;
        let text = question.text;
        let instruction = question.instruction || '';
        let key = question.key;
        if (type === 'choice' || type === 'choices' || Array.isArray(type)) {
            question.choices.forEach((choiceId, index) => {
                const [choiceText, choiceToggle, answerKey, tag] = choiceMap.get(choiceId);
                let choiceType = '';
                if (type === 'choices') {
                    choiceType = 'bool';
                    if (choiceToggle && (choiceToggle === 'checkalloff')) {
                        choiceType = 'bool-sole';
                    }
                }
                if (Array.isArray(type)) {
                    questionType = 'choices';
                    choiceType = type[index];
                }
                const line = `${id},${questionType},"${text}","${instruction}",${ccType},${key},${choiceId},"${choiceText}",${choiceType},${answerKey},${tag}`;
                r.push(line);
                questionType = text = instruction = key = '';
            });
            return r;
        }
        const line = [id, questionType, text, instruction, ccType, key, '', '', '', question.answerKey, question.tag].join(',');
        r.push(line);
        return r;
    }, ['id,type,text,instruction,ccType,key,choiceId,choiceText,choiceType,answerKey,tag']);
    const options = { meta: [{ name: 'ccType', type: 'question' }], sourceType: 'cc' };
    const stream = intoStream(csv.join('\n'));
    return models.question.import(stream, options)
        .then(idMap => {
            const surveysCsv = jsonDB.pillars.reduce((r, pillar) => {
                const id = pillar.id;
                let name = pillar.title;
                let isBHI = pillar.isBHI;
                let maxScore = pillar.maxScore;
                const description = '';
                const required = 'true';
                pillar.questions.forEach(question => {
                    const questionId = question.questionId;
                    const skipCount = question.skipCount || '';
                    const skipValue = question.skipValue || '';
                    const line = `${id},${name},${description},${isBHI},${maxScore},${questionId},${required},${skipCount},${skipValue}`;
                    r.push(line);
                    name = '';
                });
                return r;
            }, ['id,name,description,isBHI,maxScore,questionId,required,skipCount,skipValue']);
            const stream = intoStream(surveysCsv.join('\n'));
            const options = { meta: [{ name: 'isBHI' }, { name: 'id' }, { name: 'maxScore' }] };
            return models.survey.import(stream, idMap, options);
        });
};

module.exports = {
    converters,
    importFiles,
    importToDb
};
