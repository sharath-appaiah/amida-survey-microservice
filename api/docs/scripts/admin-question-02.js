const request = require('superagent');
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJzdXBlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTQ3Nzk2MTYxNSwiZXhwIjoxNDgwNTUzNjE1fQ.HJubwTIVEf7Z-83oUTWDVu0AEx-_8DZL46lmZo2WVTo';

let boolQx = {
	type: 'bool',
	text: 'Do you own a pet?'
};

let boolQxId = null;
request
	.post('http://localhost:9005/api/v1.0/questions')
	.set('Authorization', 'Bearer ' + jwt)
	.send(boolQx)
	.end(function (err, res) {
		console.log(res.status);  // 201
		console.log(res.body.id); // Expected to be internal id of question
		boolQxId = res.body.id;
	});
