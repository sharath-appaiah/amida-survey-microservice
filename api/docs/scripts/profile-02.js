'use strict';

const request = require('superagent');

module.exports = function(locals) {
	console.log(`------ start ${module.filename}`);
	const jwtUser = locals.jwtUser;

	const user = {
		email: 'test2@example2.com'
	};

	const answers = [{
		questionId: 6,
		answer: { choice: 14 }
	}, {
		questionId: 7
	}, {
		questionId: 8,
		answer: { boolValue: false }
	}, {
		questionId: 9,
		answer: {
			choices: [{
				id: 15,
				boolValue: true
			}, {
				id: 23,
				textValue: 'Community event'
			}]
		}
	}];

	return request
		.patch('http://localhost:9005/api/v1.0/profiles')
		.set('Authorization', 'Bearer ' + jwtUser)
		.send({ user, answers })
		.then(res => {
			console.log(res.status);  // 204
		})
		.then(() => {
			console.log(`------ end ${module.filename}`);
	    	return locals;
	    });
};
