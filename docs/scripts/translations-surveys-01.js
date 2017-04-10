'use strict';

/* eslint func-names: 0, no-console: 0, no-param-reassign: 0, max-len: 0 */

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    const surveyTurkish = {
        id: 1,
        name: 'Örnek'
    };

    return locals.agent
        .patch('http://localhost:9005/api/v1.0/surveys/text/tr')
        .send(surveyTurkish)
        .then((res) => {
            console.log(res.status); // 204
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
