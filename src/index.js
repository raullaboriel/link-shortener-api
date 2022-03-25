const express = require('express');
const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());

app.use(require('./routes/ShorteredLink'));
app.use(require('./routes/User'));

app.listen(port, () => {
    console.log(`LinkShortener API listen on port ${port}`)
})

app.get('/', async (req, res) => {
    res.json({status: 'Welcome to LinkShortener! :D'})
})