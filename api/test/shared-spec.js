'use strict';

const chai = require('chai');
const _ = require('lodash');

const models = require('../models');

const RRError = require('../lib/rr-error');
const entityGen = require('./entity-generator');

const expect = chai.expect;

exports.setUpFn = function () {
    return function () {
        return models.sequelize.sync({
            force: true
        });
    };
};

exports.createUser = function (store) {
    return function () {
        const inputUser = entityGen.genNewUser();
        return models.User.create(inputUser)
            .then(function (user) {
                store.userIds.push(user.id);
            });
    };
};

exports.createQuestion = function (store) {
    return function () {
        const inputQx = entityGen.genNewQuestion();
        const type = inputQx.type;
        return models.Question.createQuestion(inputQx)
            .then(function (id) {
                const qx = {
                    id,
                    choices: null,
                    type
                };
                if ((type === 'choices') || (type === 'choice')) {
                    return models.QuestionChoice.findAll({
                            where: {
                                questionId: id
                            },
                            raw: true,
                            attributes: ['id', 'type']
                        })
                        .then(function (choices) {
                            if (type === 'choice') {
                                qx.choices = _.map(choices, choice => ({ id: choice.id }));
                            } else {
                                qx.choices = _.map(choices, choice => ({ id: choice.id, type: choice.type }));
                            }
                            return qx;
                        });
                } else {
                    return qx;
                }
            })
            .then(function (qx) {
                store.questions.push(qx);
            });
    };
};

exports.createSurvey = function (store, qxIndices) {
    return function () {
        const inputSurvey = entityGen.genNewSurvey({ addQuestions: false });
        inputSurvey.questions = qxIndices.map(index => ({
            id: store.questions[index].id,
            required: false
        }));
        return models.Survey.createSurvey(inputSurvey)
            .then(id => {
                store.surveys.push(id);
            });
    };
};

exports.createDocumentTypeFn = (function () {
    let index = -1;

    return function (store) {
        return function () {
            ++index;
            const docType = {
                name: `type_${index}`,
                description: `description_${index}`
            };
            return models.DocumentType.createDocumentType(docType)
                .then(({ id }) => {
                    const newDocType = Object.assign({}, docType, { id });
                    store.documentTypes.push(newDocType);
                    store.activeDocuments.push(null);
                });
        };
    };
})();

exports.createDocumentFn = (function () {
    let index = -1;

    return function (store, typeIndex) {
        return function () {
            ++index;
            const typeId = store.documentTypes[typeIndex].id;
            const doc = {
                typeId,
                content: `Sample document content ${index}`
            };
            store.clientDocuments.push(doc);
            return models.Document.createDocument(doc)
                .then(({ id }) => {
                    const docToStore = Object.assign({}, doc, { id });
                    store.documents.push(docToStore);
                    store.activeDocuments[typeIndex] = docToStore;
                });
        };
    };
})();

exports.signDocumentTypeFn = function (store, userIndex, typeIndex) {
    return function () {
        const documentId = store.activeDocuments[typeIndex].id;
        const userId = store.userIds[userIndex];
        store.signatures[userIndex].push(documentId);
        return models.DocumentSignature.createSignature(userId, documentId);
    };
};

exports.throwingHandler = function () {
    throw new Error('Unexpected no error.');
};

exports.expectedErrorHandler = function (code) {
    return function (err) {
        expect(err).to.be.instanceof(RRError);
        expect(err.code).to.equal(code);
        expect(!!err.message).to.equal(true);
        return err;
    };
};
