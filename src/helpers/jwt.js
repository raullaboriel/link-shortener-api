const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const checkForToken = (req, res, next) => {
    const cookie = req.headers['cookie'];
    if (typeof cookie !== 'undefined') {
        const token = cookie.split('=')[1];
        req.token = token;
        next();
    } else {
        req.token = undefined;
        next();
    }
}

const token = async (user) => {
    return new Promise(async (resolve, reject) => {
        jwt.sign({ authData: { user } }, process.env.ACCESS_KEY, (err, token) => {
            if (err) {
                return reject(err);
            }
            return resolve(token);
        });
    })
}

const verifyToken = async (token) => {
    let user;
    jwt.verify(token, process.env.ACCESS_KEY, async (err, data) => {
        if (err) {
            user = undefined;
        } else {
            user = data.authData.user;
        }
    });
    return user;
}

module.exports = {
    token,
    checkForToken,
    verifyToken
}