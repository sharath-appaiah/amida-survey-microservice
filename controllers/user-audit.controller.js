'use strict';

const shared = require('./shared.js');

exports.listUserAudits = function (req, res) {
    req.models.userAudit.listUserAudits()
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};
