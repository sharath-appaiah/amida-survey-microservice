'use strict';

const query = 'select question.text as text, question_type.name as type from question, question_type where question.id = :id and question.type = question_type.id';
const queryChoices = 'select id, text from question_choices where question_id = :id order by line';
const queryMultiple = 'select question.id as id, question.text as text, question_type.name as type from question, question_type where question.id in (:ids) and question.type = question_type.id';
const queryChoicesMultiple = 'select id, text, question_id as qid from question_choices where question_id in (:ids) order by line';

module.exports = function (sequelize, DataTypes) {
    const Question = sequelize.define('question', {
        text: {
            type: DataTypes.TEXT
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'question_type',
                key: 'id'
            },
            get: function () {
                const id = this.getDataValue('type');
                return sequelize.models.question_type.nameById(id);
            },
            set: function (type) {
                const id = sequelize.models.question_type.idByName(type);
                this.setDataValue('type', id);
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        classMethods: {
            postPromise: function (question, tx) {
                const qx = {
                    text: question.text,
                    type: question.type
                };
                return Question.create(qx, {
                    transaction: tx
                }).then(function (qx) {
                    const id = qx.id;
                    const choices = question.choices;
                    if (choices && choices.length) {
                        return sequelize.Promise.all(choices.map(function (c, index) {
                            const choice = {
                                questionId: id,
                                text: c,
                                line: index
                            };
                            return sequelize.models.question_choices.create(choice, {
                                transaction: tx
                            }).then(() => {
                                return id;
                            });
                        })).then(() => {
                            return id;
                        });
                    } else {
                        return id;
                    }
                });
            },
            post: function (question, transaction) {
                if (transaction) {
                    return Question.postPromise(question, transaction);
                } else {
                    return sequelize.transaction(function (t) {
                        return Question.postPromise(question, t);
                    });
                }
            },
            get: function (id) {
                return sequelize.query(query, {
                    replacements: {
                        id
                    },
                    type: sequelize.QueryTypes.SELECT
                }).then(function (questions) {
                    const question = questions[0];
                    if (!question) {
                        return sequelize.Promise.reject('No such question');
                    }
                    return question;
                }).then(function (question) {
                    return sequelize.query(queryChoices, {
                        replacements: {
                            id
                        },
                        type: sequelize.QueryTypes.SELECT
                    }).then((choices) => {
                        if (choices && choices.length) {
                            question.choices = choices;
                        }
                        return question;
                    });
                });
            },
            getMultiple: function (ids) {
                return sequelize.query(queryMultiple, {
                    replacements: {
                        ids
                    },
                    type: sequelize.QueryTypes.SELECT
                }).then(function (questions) {
                    const question = questions[0];
                    if (!question) {
                        return sequelize.Promise.reject('No such question');
                    }
                    return questions;
                }).then(function (questions) {
                    return sequelize.query(queryChoicesMultiple, {
                        replacements: {
                            ids
                        },
                        type: sequelize.QueryTypes.SELECT
                    }).then((choices) => {
                        const map = questions.reduce(function (r, q) {
                            r[q.id] = q;
                            return r;
                        }, {});
                        if (choices && choices.length) {
                            choices.forEach(function (choice) {
                                const qid = choice.qid;
                                delete choice.qid;
                                const q = map[qid];
                                if (q.choices) {
                                    q.choices.push(choice);
                                } else {
                                    q.choices = [choice];
                                }
                            });
                        }
                        return ids.map(function (id) {
                            return map[id];
                        });
                    });
                });
            }
        }
    });

    return Question;
};
