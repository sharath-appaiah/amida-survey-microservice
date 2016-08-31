/* global describe,before,after,beforeEach,afterEach,it,xit*/
'use strict';

var chai = require('chai');
var _ = require('lodash');

const helper = require('../helpers');
const db = require('../../db');

var expect = chai.expect;

var Survey = db.Survey;
var Answer = db.Answer;
var User = db.User;

describe('survey unit', function() {
	const user = {
	    username: 'test',
	    password: 'password',
	    email: 'test@example.com',
	    zip: '20850'
	};

	var userId;

	before(function() {
        return db.sequelize.sync({
            force: true
        }).then(function() {
        	return User.create(user);
        }).then(function(result) {
        	userId = result.id;
        });
	});

	const example = {
		name: 'Example',
		questions: [{
			text: 'Which sports do you like?',
			type: 'multi-choice-multi',
			choices: [
				'Football',
				'Basketball',
				'Soccer',
				'Tennis'
			]
		}, {
			text: 'What is your hair color?',
			type: 'multi-choice-single',
			choices: [
				'Black',
				'Brown',
				'Blonde',
				'Other'
			]
		}, {
			text: 'Where were you born?',
			type: 'text'
		}]
	};

	var serverSurvey;

	it('post/get survey', function() {
		return Survey.post(example).then(function(id) {
			return Survey.get(id).then(function(result) {
				const ids = _.map(result.questions, 'id');
				return helper.buildServerQuestions(example.questions, ids).then(function(expectedQuestions) {
					const expected = {
						id,
						name: example.name,
						questions: expectedQuestions
					};
					expect(result).to.deep.equal(expected);
					serverSurvey = result;
				});
			});
		});
	});

 	it('post answers, get survey with answers', function() {
 		const id = serverSurvey.id;

 		const q0 = serverSurvey.questions[0].id;
 		const a00 = serverSurvey.questions[0].choices[1].id;
 		const a01 = serverSurvey.questions[0].choices[2].id;

 		const q1 = serverSurvey.questions[1].id;
 		const a1 = serverSurvey.questions[1].choices[0].id;

 		const q2 = serverSurvey.questions[2].id;
 		const a2 = 'Washington, DC';

 		var answers = [{
 			questionId: q0,
 			answer: [a00, a01]
 		}, {
 			questionId: q1,
 			answer: a1
 		}, {
 			questionId: q2,
 			answer: a2
 		}];

 		return Answer.post({
 			userId,
 			surveyId: id,
 			answers
 		}).then(function() {
 			return Survey.getAnswered(userId, id);
 		}).then(function(survey) {
 			const expectedSurvey = _.cloneDeep(serverSurvey);
 			expectedSurvey.questions.forEach(function(question, index) {
 				question.answer = answers[index].answer;
 			});
 			expect(survey).to.deep.equal(expectedSurvey);
 		});
 	});
});
