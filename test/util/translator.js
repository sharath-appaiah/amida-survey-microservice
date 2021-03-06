'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');
const chai = require('chai');

const expect = chai.expect;

const translator = {
    translate(text, language) {
        return `${text} (${language})`;
    },
    isTranslated(texts, language) {
        const languageText = `(${language})`;
        texts.forEach((text) => {
            if (text !== null) {
                const location = text.indexOf(languageText);
                expect(location).to.be.above(0, `is not translated to ${language}`);
            }
        });
    },
    translateQuestion(question, language) {
        const text = this.translate(question.text, language);
        const translation = { id: question.id, text };
        if (question.instruction) {
            translation.instruction = question.instruction;
        }
        const choices = question.choices;
        if (choices) {
            translation.choices = choices.map(ch => ({
                id: ch.id,
                text: this.translate(ch.text, language),
            }));
        }
        return translation;
    },
    translateSurveySections(surveySections, language, result = []) {
        surveySections.forEach(({ id, name, description, sections }) => {
            const translated = {
                id,
                name: this.translate(name, language),
            };
            if (description) {
                const transDescription = this.translate(description, language);
                translated.description = transDescription;
            }
            result.push(translated);
            if (sections) {
                this.translateSurveySections(sections, language);
            }
        });
        return result;
    },
    translateSurvey(survey, language) {
        const result = _.cloneDeep(survey);
        result.name = this.translate(result.name, language);
        if (result.description) {
            result.description = this.translate(result.description, language);
        }
        delete result.meta;
        delete result.status;
        delete result.authorId;
        if (result.sections) {
            result.sections = this.translateSurveySections(result.sections, language);
        }
        delete result.questions;
        return result;
    },
    translateChoiceSet(choiceSet, language) {
        const result = {};
        result.choices = choiceSet.choices.map(({ id, text }) => ({ id, text: this.translate(text, language) }));
        return result;
    },
    isQuestionTranslated(question, language) {
        const texts = question.choices ? [] : [question.text];
        if (question.choices) {
            question.choices.forEach(choice => texts.push(choice.text));
        }
        this.isTranslated(texts, language);
    },
    isQuestionListTranslated(questions, language) {
        questions.forEach(question => this.isQuestionTranslated(question, language));
    },
    isSurveyTranslated(survey, language) {
        const texts = [survey.name];
        if (survey.description) {
            texts.push(survey.description);
        }
        if (survey.sections) {
            texts.push(...survey.sections.map(section => section.name));
        }
        this.isTranslated(texts, language);
    },
    isChoiceSetTranslated(choiceSet, language) {
        const texts = choiceSet.choices.map(({ text }) => text);
        this.isTranslated(texts, language);
    },
    isSurveyListTranslated(surveys, language) {
        const texts = surveys.map(survey => survey.name);
        const descriptions = surveys.filter(survey => survey.description).map(survey => survey.description);
        this.isTranslated([...texts, ...descriptions], language);
    },
};

module.exports = translator;
