'use strict';

const SPromise = require('../lib/promise');

const textTableMethods = require('./text-table-methods');

module.exports = function (sequelize, DataTypes) {
    const textHandler = textTableMethods(sequelize, 'section_text', 'sectionId', ['name']);

    const Section = sequelize.define('rr_section', {
        indices: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
        },
        deletedAt: {
            type: DataTypes.DATE,
            field: 'deleted_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        deletedAt: 'deletedAt',
        paranoid: true,
        classMethods: {
            createSectionTx({ name, indices }, tx) {
                return Section.create({ indices }, { transaction: tx })
                    .then(({ id, indices }) => textHandler.createTextTx({ id, indices, name }, tx));
            },
            bulkCreateSectionsForSurveyTx(surveyId, sections, tx) { // TODO: Use sequelize bulkCreate with 4.0
                const pxs = sections.map(({ name, indices }) => Section.createSectionTx({ name, indices }, tx));
                return SPromise.all(pxs)
                    .then(result => {
                        const SurveySection = sequelize.models.survey_section;
                        return SurveySection.destroy({ where: { surveyId }, transaction: tx })
                            .then(() => {
                                const pxs = result.map(({ id }, line) => SurveySection.create({ surveyId, sectionId: id, line }, { transaction: tx }));
                                return SPromise.all(pxs)
                                    .then(() => result);
                            });
                    });
            },
            getSectionsForSurveyTx(surveyId, language) {
                const SurveySection = sequelize.models.survey_section;
                return SurveySection.findAll({
                        where: { surveyId },
                        raw: true,
                        order: 'line',
                        attributes: ['sectionId']
                    })
                    .then(sections => {
                        const ids = sections.map(({ sectionId }) => sectionId);
                        return Section.findAll({
                            where: { id: { $in: ids } },
                            raw: true,
                            attributes: ['id', 'indices']
                        });
                    })
                    .then(sections => textHandler.updateAllTexts(sections, language));
            },
            updateMultipleSectionNamesTx(sections, language, tx) {
                const inputs = sections.map(({ id, name }) => ({ id, name, language }));
                return textHandler.createMultipleTextsTx(inputs, tx);
            }
        }
    });

    return Section;
};
