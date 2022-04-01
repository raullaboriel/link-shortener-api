const express = require('express');
const pool = require('./Database');
const router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('../helpers/jwt.js')

let corsOptions = {
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}

var allowlist = ['http://localhost:3000', 'https://raullaboriel.github.io', 'https://lilink.herokuapp.com']
var corsOptionsDelegate = function (req, callback) {
    if (allowlist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { ...corsOptions, origin: true } // reflect (enable) the requested origin in the CORS response
    } else {
        corsOptions = { ...corsOptions, origin: false } // disable CORS for this request
    }
    callback(null, corsOptions) // callback expects two parameters: error and options
}

router.use(cors(corsOptionsDelegate));

const isEmailValid = (email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as idCount FROM users WHERE email = ?';
        pool.query(query, [email], async (err, rows) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(rows[0].idCount === 0);
            }
        })
    });

}

const isUsernameValid = async (username) => {
    return new Promise(async (resolve, reject) => {
        const query = 'SELECT COUNT(*) as idCount FROM users WHERE username = ?';
        pool.query(query, [username], async (err, rows) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(rows[0].idCount === 0);
            }
        })
    });
}

//Routes

router.post('/user/check', async (req, res) => {
    const { username, email } = req.body;
    const validUsername = await isUsernameValid(username);
    const validEmail = await isEmailValid(email);

    res.send({ validUsername, validEmail });
})

router.post('/user', async (req, res) => {
    const validEmail = await isEmailValid(req.body.email);
    const validUsername = await isUsernameValid(req.body.username);

    if (validEmail && validUsername) {
        bcrypt.genSalt(10, async (err, salt) => {
            if (err) {
                console.log(err);
                return;
            }
            bcrypt.hash(req.body.password, salt, async (err, hash) => {
                if (err) {
                    console.log(err);
                    return;
                }

                let user = {
                    id: 0,
                    username: req.body.username,
                    password: hash,
                    email: (req.body.email).toLowerCase()
                }

                const query = 'INSERT INTO users VALUES(?, ?, ?, ?)'
                pool.query(query, [user.id, user.username, user.password, user.email], (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    delete user.password;
                    res.send({ status: 'User successfully registered', ...user })
                })
            })
        })
    } else {
        res.statusCode = 400;
        res.send({ status: 'Email or username its not available' })
    }
})

router.post('/user/login', async (req, res) => {
    const credentials = {
        username: req.body.username,
        password: req.body.password
    }

    let user = await new Promise(async (resolve, reject) => {
        const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
        pool.query(query, [credentials.username], (err, rows) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(rows[0]);
            }
        })
    });

    if (typeof user !== 'undefined') {
        bcrypt.compare(credentials.password, user.password, async (err, isOk) => {
            if (err) {
                console.log(err);
                return;
            }

            if (!isOk) {
                res.sendStatus(403, { status: 'Invalid credentials' });
            } else {
                delete user.password;
                let token = await jwt.token(user);

                //Cookie expiration time (1 hour) 
                let now = new Date();
                now.setFullYear(now.getFullYear() + 10);
                //let time = now.getTime();
                //time += 3600 * 1000;
                //now.setTime(time);

                res.cookie("link-shortener", token, {
                    httpOnly: true,
                    expires: now,
                    domain: 'raullaboriel.github.io'
                });

                delete user.id;
                res.send(user);
            }
        });
    } else {
        res.statusCode = 403;
        res.send({ status: 'Incorrect username or password' });
    }
})

router.post('/user/shorteredlinks', jwt.checkForToken, async (req, res) => {
    let user = await jwt.verifyToken(req.token);

    if (typeof user !== 'undefined') {
        const query = 'SELECT * FROM shorteredlinks where user = ?';
        pool.query(query, [user.id], async (err, rows) => {
            if (err) {
                console.log(err);
            } else {
                res.json(rows);
            }
        });
    } else {
        res.sendStatus(403);
    }

});

router.post('/user/restoresession', jwt.checkForToken, async (req, res) => {
    const user = await jwt.verifyToken(req.token);
    if (typeof user !== 'undefined') {
        res.send({ user });
    } else {
        res.send({ user: null });
    }
});

router.post('/user/logout', async (req, res) => {
    res.clearCookie('link-shortener');
    res.end();
});

module.exports = router;