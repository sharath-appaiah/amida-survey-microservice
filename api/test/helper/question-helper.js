'use strict';

const _ = require('lodash');

const models = require('../../models');

exports.buildServerQuestion = function (question, id) {
    return models.sequelize.query('select id, text from question_choices where question_id = :id', {
        replacements: {
            id
        },
        type: models.sequelize.QueryTypes.SELECT
    }).then(function (result) {
        return result.reduce(function (r, choice) {
            r[choice.text] = choice.id;
            return r;
        }, {});
    }).then(function (choiceMap) {
        const result = _.cloneDeep(question.content || question);
        result.id = id;
        if (result.choices) {
            result.choices = result.choices.map(function (choice) {
                return {
                    text: choice,
                    id: choiceMap[choice]
                };
            });
        }
        return result;
    });
};

exports.buildServerQuestions = function (questions, ids) {
    return models.sequelize.Promise.all(_.range(0, questions.length).map(function (index) {
        return exports.buildServerQuestion(questions[index], ids[index]);
    }));
};

exports.prepareServerQuestion = function (question) {
    delete question.id;
    const choices = question.choices;
    if (choices && choices.length) {
        question.choices = _.map(choices, 'text');
    }
    return question;
};

exports.prepareClientQuestions = function (questions, ids, indices) {
    const testIds = _.pullAt(ids.slice(), indices);
    const samples = _.pullAt(questions.slice(), indices);
    return exports.buildServerQuestions(samples, testIds);
};