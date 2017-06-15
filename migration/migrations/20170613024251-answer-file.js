'use strict';

const config = require('../../config');

const sql = 'INSERT INTO question_type (name) VALUES (\'file\')';

const file = function file(queryInterface, Sequelize) {
    return queryInterface.createTable('file', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        content: {
            type: Sequelize.BLOB,
            allowNull: false,
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
    }, {
        freezeTableName: true,
        schema: config.db.schema,
        createdAt: 'createdAt',
        updatedAt: false,
    });
};

const answerFileIdColumn = function (queryInterface, Sequelize) {
    return queryInterface.addColumn('answer', 'file_id', {
        type: Sequelize.INTEGER,
        references: {
            model: 'file',
            key: 'id',
        },
    });
};

module.exports = {
    up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(sql)
            .then(() => file(queryInterface, Sequelize))
            .then(() => answerFileIdColumn(queryInterface, Sequelize));
    },
};
