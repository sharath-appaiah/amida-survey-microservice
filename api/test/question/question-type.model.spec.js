/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');

const expect = chai.expect;

const QuestionType = models.QuestionType;

describe('question-type unit', function () {
    before(function () {
        return models.sequelize.sync({
            force: true
        });
    });

    it('default names', function () {
        return QuestionType.findAll({
            raw: true
        }).then(function (result) {
            const expected = QuestionType.possibleNames().sort();
            const actual = _.map(result, 'name').sort();
            expect(actual).to.deep.equal(expected);
            const name1st = QuestionType.possibleNames()[1];
            expect(QuestionType.idByName(name1st)).to.equal(2);
            expect(QuestionType.nameById(2)).to.equal(name1st);
        });
    });

    it('sync without force keeps default names', function () {
        const possibleNames = QuestionType.possibleNames();
        const removeName = possibleNames.splice(0, 1)[0];
        return QuestionType.destroy({
            where: {
                name: removeName
            }
        }).then(function () {
            return QuestionType.sync();
        }).then(function () {
            return QuestionType.findAll({
                raw: true
            });
        }).then(function (result) {
            const expected = possibleNames.sort();
            const actual = _.map(result, 'name').sort();
            expect(actual).to.deep.equal(expected);
        });
    });
});
