'use strict';

const answerRuleValue = function (queryInterface, Sequelize) {
    return queryInterface.createTable('answer_rule_value', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ruleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: 'answer_rule_id',
            references: {
                model: 'answer_rule',
                key: 'id'
            }
        },
        questionChoiceId: {
            type: Sequelize.INTEGER,
            field: 'question_choice_id',
            references: {
                model: 'question_choice',
                key: 'id'
            }
        },
        value: {
            type: Sequelize.TEXT
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
        deletedAt: {
            type: Sequelize.DATE,
            field: 'deleted_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        updatedAt: false,
        deletedAt: 'deletedAt',
        paranoid: true
    });
};

const answerRule = function (queryInterface, Sequelize) {
    return queryInterface.createTable('answer_rule', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        logic: {
            type: Sequelize.ENUM('equals', 'exists'),
            allowNull: false
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        updatedAt: false
    });
};

const skipRuleId = function (queryInterface, Sequelize) {
    return queryInterface.addColumn('survey_question', 'answer_rule_id', {
        type: Sequelize.INTEGER,
        field: 'answer_rule_id',
        references: {
            model: 'answer_rule',
            key: 'id'
        }
    });
};

const skipCount = function (queryInterface, Sequelize) {
    return queryInterface.addColumn('survey_question', 'skip_count', {
        type: Sequelize.INTEGER,
        field: 'skip_count',
    });
};

module.exports = {
    up: function (queryInterface, Sequelize) {
        return answerRule(queryInterface, Sequelize)
            .then(() => answerRuleValue(queryInterface, Sequelize))
            .then(() => skipRuleId(queryInterface, Sequelize))
            .then(() => skipCount(queryInterface, Sequelize));

    },
    down: function (queryInterface) {
        return queryInterface.removeColumn('survey_question', 'skip_count')
            .then(() => queryInterface.removeColumn('survey_question', 'skip_rule_id'))
            .then(() => queryInterface.dropTable('answer_rule_value'))
            .then(() => queryInterface.dropTable('answer_rule'));
    }
};
