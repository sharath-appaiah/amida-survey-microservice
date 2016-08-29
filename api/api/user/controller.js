'use strict';

const jwt = require('jsonwebtoken');

const config = require('../../config');
const db = require('../../db');

const User = db.User;

// Create standalone functions for callbacks of each async request.
const createUserIfNonExistent = (res, req) => {
    const username = req.body.username;
    User.findOne({
        where: {
            username
        }
    }).then(data => {
        if (data) {
            res.status(400).send('An existing user has already used that username address.');
        } else {
            User.create(req.body).then(user => {
                res.status(201).json({
                    id: user.id,
                    username: user.username
                });
            });
        }
    });
};

const userController = {
    createNewUser: (req, res) => {
        createUserIfNonExistent(res, req);
    },
    showCurrentUser: (req, res) => {
        if (req.user) {
            const currentUser = {
                username: req.user.username,
                email: req.user.email,
                zip: req.user.zip
            };
            res.status(200).json(currentUser);
        } else {
            res.status(401);
        }
    },
    createToken: function(req, res) {
        const token = createUserJWT(req.user);
        if (token) {
            res.status(200).json({
                token
            }); // This is for development. We will probably want to return as a cookie.
        } else {
            console.log("Error producing JWT: ", token);
            res.status(400);
        }
    }
};

function createJWT(payload) {
    const options = {
        expiresIn: "30d"
    };
    // replace 'development' with process ENV.
    return jwt.sign(payload, config.jwt.secret, options);
}

function createUserJWT(user) {
    const payload = {
        id: user.id,
        username: user.username,
        admin: user.admin
    };
    return createJWT(payload);
}

module.exports = userController;