'use strict';


module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    const consentTypeConsentTurkish = {
        id: 2,
        title: 'İzin Metni'
    };

    return locals.agent
        .patch('http://localhost:9005/api/v1.0/consent-types/text/tr')
        .send(consentTypeConsentTurkish)
        .then(res => {
            console.log(res.status); // 204
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
