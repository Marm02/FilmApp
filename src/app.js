const http = require('http');
const {env, port, ip, apiRoot, mongo} = require('./config');
const express = require('./services/express');

const api = require('./api');

const mongoose = require('./services/mongoose');


const app = express(apiRoot, api);

const server = http.createServer(app);

mongoose.connect(mongo.uri);

setImmediate(function () {
    server.listen(port, ip, function () {
        console.log('Express server listening on http://%s:%d, in %s mode', ip, port, env)

    })
});

module.exports = app;
