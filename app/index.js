require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT | 3000

function authentication(req, res, next) {
    const authheader = req.headers.authorization;

    if (!authheader) {
        let err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err)
    }

    const auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user == process.env.USERNAME && pass == process.env.PASSWORD) {
        next();
    } else {
        let err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err);
    }
}

app.get('/', (req, res) => {
    res.send('Hello, world!')
})

app.get('/secret', authentication,(req, res) => {
    res.send(process.env.SECRET_MESSAGE)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
