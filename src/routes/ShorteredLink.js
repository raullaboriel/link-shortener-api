const express = require('express');
const pool = require('./database');
const router = express.Router();
const cors = require('cors');
const jwt = require('../helpers/jwt.js')
const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}

router.use(cors(corsOptions));

//Validation functions
const validURL = (str) => {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

const validShorteredRoute = (shorteredRoute) => {
    return new Promise((resolve, reject) => {

        const query = 'SELECT COUNT(*) as idCount FROM shorteredlinks WHERE shorteredroute = ?';
        pool.query(query, [shorteredRoute], async (err, rows) => {
            if (err) {
                return reject(err);
            }
            return resolve(rows[0].idCount === 0);
        });

    })
}

//Funtions
const generateShorteredRoute = async () => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let shorteredRoute = ''
    let isValid = false;

    do {
        for (var i = 0; i < 7; ++i) {
            shorteredRoute += possible.charAt(parseInt(Math.random() * ((possible.length + 1) - 0) + 0));
        }
        try {
            isValid = await validShorteredRoute(shorteredRoute);
        } catch (e) {
            console.log(e);
        }
    } while (!isValid);

    return shorteredRoute;
}

//Routes
router.get('/shorteredlink/:shorteredRoute', async (req, res) => {
    const { shorteredRoute } = req.params;

    const query = 'SELECT * FROM shorteredlinks WHERE shorteredroute = ?';
    pool.query(query, [shorteredRoute], (err, rows) => {
        if (err) {
            console.log(err);
            return;
        }
        if (rows.length >= 1) {
            res.statusCode = 200;
            res.json(rows[0]);
            return;
        }
        res.statusCode = 404;
        res.send({ status: 'Not found' });
    });
})

router.post('/shorteredlink', jwt.checkForToken, async (req, res) => {
    let { originalLink } = req.body;
    let user = await jwt.verifyToken(req.token)

    let userId;
    if (typeof user === 'undefined') {
        userId = null;
        console.log(userId);
    } else {
        userId = user.id;
    }

    const query = 'INSERT INTO shorteredlinks VALUES(?, ?, ?, ?)';
    const shorteredRoute = await generateShorteredRoute();

    if (originalLink.substring(0, 7) !== 'http://' && originalLink.substring(0, 8) !== 'https://') {
        originalLink = 'http://' + originalLink;
    }

    if (validURL(originalLink)) {
        pool.query(query, [0, originalLink, shorteredRoute, userId], (err) => {
            if (err) {
                console.log(err);
            } else {
                res.statusCode = 200;
                res.send({ status: 'Link shortered successfully', shorteredLink: { shorteredRoute, userId } });
            }
        })
    } else {
        res.statusCode = 400;
        res.send({ status: `Error invalid link` })
    }
});

router.delete('/shorteredlink', jwt.checkForToken, async (req, res) => {
    const { shorteredRoute } = req.body;
    const id = (await jwt.verifyToken(req.token)).id || undefined;

    if (typeof id !== 'undefined') {
        const query = 'DELETE FROM shorteredlinks WHERE shorteredroute = ? AND user = ?'
        pool.query(query, [shorteredRoute, id], async (err, rows) => {
            const affectedRows = (await rows).affectedRows || 0;
            if (err) {
                console.log(err);
                return;
            } else if (affectedRows === 1) {
                res.statusCode = 200;
                res.send({ status: 'Shortered revomed link successfully' });
            } else {
                res.statusCode = 400;
                res.send({ status: 'Failed when trying to remove the shortered link' });
            }
        });
    } else {
        res.sendStatus(403);
    }
});



module.exports = router;