'use strict';

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('consent_type_text', {
        consentTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'consent_type_id',
            references: {
                model: {
                    schema: sequelize.options.schema,
                    tableName: 'consent_type'
                },
                key: 'id'
            }
        },
        language: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'language_code',
            references: {
                model: {
                    schema: sequelize.options.schema,
                    tableName: 'language'
                },
                key: 'code'
            }
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
        },
        deletedAt: {
            type: DataTypes.DATE,
            field: 'deleted_at'
        }
    }, {
        freezeTableName: true,
        schema: sequelize.options.schema,
        createdAt: 'createdAt',
        updatedAt: false,
        deletedAt: 'deletedAt',
        paranoid: true
    });
};
