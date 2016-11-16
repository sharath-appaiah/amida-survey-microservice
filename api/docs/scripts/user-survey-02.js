'use strict';

const request = require('superagent');

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);
    const jwtUser2 = locals.jwtUser2;

    const answers = [{
        questionId: 2,
        answer: { boolValue: true }
    }, {
        questionId: 5,
        answer: { choice: 6 }
    }];

    return request
        .post('http://localhost:9005/api/v1.0/user-surveys/1/answers')
        .set('Authorization', 'Bearer ' + jwtUser2)
        .send({ status: 'in-progress', answers })
        .then(res => {
            console.log(res.status); // 204
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
