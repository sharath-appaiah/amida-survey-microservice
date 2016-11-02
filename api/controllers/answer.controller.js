'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');

exports.createAnswers = function (req, res) {
    const answers = req.body;
    answers.userId = req.user.id;
    const language = _.get(req, 'swagger.params.language.value');
    if (language) {
        answers.language = language;
    }
    models.answer.createAnswers(answers)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.getAnswers = function (req, res) {
    const surveyId = _.get(req, 'swagger.params.surveyId.value');
    const userId = req.user.id;
    models.answer.getAnswers({ userId, surveyId })
        .then(answers => res.status(200).json(answers))
        .catch(shared.handleError(res));
};