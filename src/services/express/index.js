const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const expressConfig = (apiRoot, routes) => {
    const app = express();

    app.use(cors({origin: 'https://marm02.github.io'}));

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, "client/build")));

    app.use(apiRoot, routes);

    return app
};


module.exports = expressConfig;