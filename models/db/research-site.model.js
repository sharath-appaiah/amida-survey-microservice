'use strict';

module.exports = function researchSite(sequelize, Sequelize, schema) {
    return sequelize.define('research_site', {
        name: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        url: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        street: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        city: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        state: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        zip: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
        updatedAt: {
            type: Sequelize.DATE,
            field: 'updated_at',
        },
        deletedAt: {
            type: Sequelize.DATE,
            field: 'deleted_at',
        },
    }, {
        freezeTableName: true,
        schema,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        deletedAt: 'deletedAt',
        paranoid: true,
    });
};
