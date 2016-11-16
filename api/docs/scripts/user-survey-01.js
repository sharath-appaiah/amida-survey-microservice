'use strict';

const request = require('superagent');

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);
    const jwtUser2 = locals.jwtUser2;

    return request
        .get('http://localhost:9005/api/v1.0/user-surveys')
        .set('Authorization', 'Bearer ' + jwtUser2)
        .then(res => {
            console.log(res.status); // 200
            console.log(JSON.stringify(res.body, undefined, 4)); // survey list with status with answers
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
