const express = require('express');
const pool = require('./database');
const router = express.Router();
const cors = require('cors');

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}

router.use(cors(corsOptions));

router.get('/:shorteredRoute', async (req, res) => {
    const { shorteredRoute } = req.params;

    const query = 'SELECT * FROM shorteredlinks WHERE shorteredroute = ?';
    pool.query(query, [shorteredRoute], (err, rows) => {
        if(err){
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

const validURL = (str) => {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

router.post('/', async (req, res) => {
    let { id, originalLink, user } = req.body;
    const query = 'INSERT INTO shorteredlinks VALUES(?, ?, ?, ?)';
    const shorteredRoute = await generateShorteredRoute();

    if (originalLink.substring(0, 7) !== 'http://' && originalLink.substring(0, 8) !== 'https://') {
        originalLink = 'http://' + originalLink;
    }

    if (validURL(originalLink)) {
        pool.query(query, [id, originalLink, shorteredRoute, user], (err, rows) => {
            if (!err) {
                res.statusCode = 200;
                res.json({ status: 'Link shortered successfully', shorteredRoute });
                return;
            }
            console.log(err);
        })
    } else {
        res.statusCode = 400;
        res.send({ status: `Error invalid link` })
    }
});

router.delete('/', async (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'
    });

    const { shorteredRoute } = req.body;
    const query = 'DELETE FROM shorteredlinks WHERE shorteredroute = ?'
    pool.query(query, [shorteredRoute], (err) => {
        if (err) {
            console.log(err);
            return;
        }
        res.statusCode = 200;
        res.json({ status: 'Shortered link successfully deleted' });
    })
});

module.exports = router;