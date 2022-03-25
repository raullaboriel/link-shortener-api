const express = require('express');
const pool = require('./Database');
const router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const appsettings = require('../../appsettings.json')

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}

router.use(cors(corsOptions));

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

const isValidUsername = async (username) => {
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

router.post('/user', async (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'
    });

    const validEmail = await isEmailValid(req.body.email);
    const validUsername = await isValidUsername(req.body.username);

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
    console.log(appsettings.keys.ACCESS_SECRET_KEY);

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
                let token = await new Promise(async (resolve, reject) => {
                    jwt.sign({ authData: { user } }, appsettings.keys.ACCESS_SECRET_KEY, (err, token) => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(token);
                    });
                })

                //Cookie expiration time (1 hour) 
                let now = new Date();
                let time = now.getTime();
                time += 3600 * 1000;
                now.setTime(time);

                res.cookie("link-shortener", token, {
                    secure: false,
                    httpOnly: true,
                    expires: now,
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

//Authorization: Bearer <token>
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization']
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }
}

router.post('/user/post', verifyToken, (req, res) => {
    jwt.verify(req.token, appsettings.keys.ACCESS_SECRET_KEY, (err, data) => {
        if (err) {
            res.sendStatus(403);
        } else {
            res.send({ status: 'User is ok', ...data })
        }
    })
})

module.exports = router;