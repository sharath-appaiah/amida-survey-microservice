'use strict';

const _ = require('lodash');

const singleQuestionTypes = [
    'text', 'choice', 'bool',
    'integer', 'zip', 'pounds',
    'date', 'year', 'month', 'day',
    'feet-inches', 'blood-pressure',
];

const virtualQuestionTypes = [
    'dateChoices', 'integerChoices', 'choicesMeta', 'choiceMeta',
];

const questionTypes = ['choices', ...singleQuestionTypes, ...virtualQuestionTypes];

module.exports = class QuestionGenerator {
    constructor(predecessor) {
        if (predecessor) {
            const { index, choiceIndex, typeChoiceIndex, typeChoicesIndex } = predecessor;
            Object.assign(this, { index, choiceIndex, typeChoiceIndex, typeChoicesIndex });
        } else {
            this.index = -1;
            this.choiceIndex = 0;
            this.typeChoiceIndex = -1;
            this.typeChoicesIndex = -1;
            this.choicesCode = false;
        }
    }

    static singleQuestionTypes() {
        return singleQuestionTypes;
    }

    static questionTypes() {
        return questionTypes;
    }

    body(type) {
        this.index += 1;
        const index = this.index;
        const result = { text: `text_${index}`, type };
        if (index % 2 === 0) {
            result.instruction = `instruction_${index}`;
        }
        const metaIndex = index % 3;
        if (metaIndex > 0) {
            result.meta = {
                someBool: metaIndex === 1,
                someOtherBool: metaIndex === 2,
            };
        }
        return result;
    }

    newChoices() {
        const startIndex = this.choiceIndex;
        const endIndex = this.choiceIndex + 5;
        this.choiceIndex = endIndex;
        return _.range(startIndex, endIndex).map(i => `choice_${i}`);
    }

    choice() {
        this.typeChoiceIndex += 1;
        const typeChoiceIndex = this.typeChoiceIndex;
        const question = this.body('choice');
        const choices = this.newChoices();
        if ((typeChoiceIndex % 3) === 0) {
            question.oneOfChoices = choices;
        } else if ((typeChoiceIndex % 3) === 1) {
            question.choices = choices.map(choice => ({ text: choice, code: `code_${choice}` }));
        } else {
            question.choices = choices.map(choice => ({ text: choice }));
        }
        return question;
    }

    choiceMeta() {
        const question = this.body('choice');
        const choices = this.newChoices();
        question.choices = choices.map((choice, index) => ({ text: choice, meta: { tag: index * 10 + 10 } }));
        return question;
    }

    choices() {
        const question = this.body('choices');
        let choices;
        if (this.choicesCode) {
            this.choicesCode = false;
            choices = this.newChoices().map(choice => ({ text: choice, code: `code_${choice}` }));
        } else {
            this.choicesCode = true;
            choices = this.newChoices().map(choice => ({ text: choice }));
        }
        choices.forEach((choice) => {
            this.typeChoicesIndex += 1;
            const choiceType = this.typeChoicesIndex % 4;
            switch (choiceType) {
            case 2:
                choice.type = 'bool';
                break;
            case 3:
                choice.type = 'text';
                break;
            }
        });
        question.choices = choices;
        return question;
    }

    choicesMeta() {
        const question = this.body('choices');
        const choices = this.newChoices().map((choice, index) => ({ text: choice, type: 'bool', meta: { tag: index * 10 + 10 } }));
        question.choices = choices;
        return question;
    }

    dateChoices() {
        const question = this.body('choices');
        question.choices = [{
            text: 'year text',
            type: 'year',
        }, {
            text: 'month text',
            type: 'month',
        }, {
            text: 'day text',
            type: 'day',
        }];
        return question;
    }

    integerChoices() {
        const question = this.body('choices');
        question.choices = [{
            text: 'feet',
            type: 'integer',
        }, {
            text: 'inches',
            type: 'integer',
        }];
        return question;
    }

    allChoices() {
        const question = this.body('choices');
        question.choices = [{
            text: 'feet',
            type: 'integer',
        }, {
            text: 'inches',
            type: 'integer',
        }, {
            text: 'year text',
            type: 'year',
        }, {
            text: 'month text',
            type: 'month',
        }, {
            text: 'day text',
            type: 'day',
        }, {
            text: 'text text',
            type: 'text',
        }, {
            text: 'bool text',
            type: 'bool',
        }, {
            text: 'zip text',
            type: 'zip',
        }, {
            text: 'date text',
            type: 'date',
        }, {
            text: 'pounds text',
            type: 'pounds',
        }, {
            text: 'zip text',
            type: 'zip',
        }, {
            text: 'feet-inches text',
            type: 'feet-inches',
        }, {
            text: 'blood-pressure text',
            type: 'blood-pressure',
        }];
        return question;
    }

    boolSoleChoices() {
        const question = this.body('choices');
        const choices = this.newChoices().map(choice => ({ text: choice, type: 'bool' }));
        choices[choices.length - 1].type = 'bool-sole';
        question.choices = choices;
        return question;
    }

    newBody(type) {
        return this[type] ? this[type]() : this.body(type);
    }

    newQuestion(type) {
        type = type || questionTypes[(this.index + 1) % questionTypes.length];
        const result = this.newBody(type);
        return result;
    }

    newMultiQuestion(type, max) {
        if (!type) {
            const types = QuestionGenerator.singleQuestionTypes();
            type = types[(this.index + 1) % types.length];
        }
        const result = this.newBody(type);
        result.multiple = true;
        max = max || this.index % 5;
        if (max < 3) {
            result.maxCount = 8 - max;
        }
        return result;
    }
};
