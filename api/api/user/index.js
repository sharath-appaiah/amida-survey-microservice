'use strict';

const express = require('express');

const auth = require('../../auth/auth.service');

const controller = require('./user.controller');

var router = new express.Router();

router.get('/', auth.isAuthenticated(), controller.showCurrentUser);
router.post('/', controller.createNewUser);
router.post('/register', controller.register);
router.get('/me-and-survey/:name', auth.isAuthenticated(), controller.meAndSurvey);

module.exports = router;
