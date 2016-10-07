'use strict';

const _ = require('lodash');

exports.genNewUser = (function () {
    let index = -1;

    return function (override) {
        ++index;
        let user = {
            username: 'username_' + index,
            password: 'password_' + index,
            email: 'email_' + index + '@example.com'
        };
        if (override) {
            user = _.assign(user, override);
        }
        return user;
    };
})();

exports.genNewQuestion = (function () {
    const types = ['text', 'choice', 'choices', 'bool'];
    let index = -1;
    let choiceIndex = 1;
    let choicesTextSwitch = false;

    return function () {
        ++index;
        const type = types[index % 4];
        const question = {
            text: `text_${index}`,
            type
        };
        if ((type === 'choice') || (type === 'choices')) {
            question.choices = [];
            ++choiceIndex;
            if (type === 'choices') {
                choicesTextSwitch = !choicesTextSwitch;
            }
            for (let i = choiceIndex; i < choiceIndex + 5; ++i) {
                const choice = { text: `choice_${i}` };
                if ((type === 'choices') && choicesTextSwitch && (i === choiceIndex + 4)) {
                    choice.type = 'text';
                }
                question.choices.push(choice);
            }
        }
        return question;
    };
})();

exports.genNewSurvey = (function () {
    let index = -1;
    const defaultOptions = {
        addQuestions: true
    };
    return function (inputOptions = {}) {
        const options = Object.assign({}, defaultOptions, inputOptions);
        ++index;
        const name = options.name || `name_${index}`;
        const result = { name };
        if (options.addQuestions) {
            result.questions = _.range(5).map(() => exports.genNewQuestion());
            result.questions.forEach((qx, index) => (qx.required = Boolean(index % 2)));
        }
        return result;
    };
})();

exports.genQxAnswer = (function () {
    let answerIndex = -1;
    let choicesCountIndex = 0;

    const genAnswer = {
        text: function (question) {
            ++answerIndex;
            return {
                questionId: question.id,
                answer: {
                    textValue: `text_${answerIndex}`
                }
            };
        },
        bool: function (question) {
            ++answerIndex;
            return {
                questionId: question.id,
                answer: {
                    boolValue: answerIndex % 2 === 0
                }
            };
        },
        choice: function (question) {
            ++answerIndex;
            const choice = question.choices[answerIndex % question.choices.length];
            return {
                questionId: question.id,
                answer: {
                    choice: choice.id
                }
            };
        },
        choices: function (question) {
            ++answerIndex;
            choicesCountIndex = (choicesCountIndex + 1) % 3;
            const choices = _.range(choicesCountIndex + 1).map(function () {
                ++answerIndex;
                const choice = question.choices[answerIndex % question.choices.length];
                const answer = {
                    id: choice.id
                };
                if (choice.type === 'text') {
                    choice.textValue = `text_${answerIndex}`;
                }
                return answer;
            });

            return {
                questionId: question.id,
                answer: {
                    choices: _.sortBy(choices, 'id')
                }
            };
        }
    };

    return function (question) {
        if (question.id < 0) {
            return { questionId: -question.id };
        } else {
            return genAnswer[question.type](question);
        }
    };
})();

exports.genAnswersToQuestions = function (questions) {
    return questions.map(exports.genQxAnswer);
};
