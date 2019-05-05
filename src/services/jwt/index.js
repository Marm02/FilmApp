const jwt = require('jsonwebtoken');
const {jwtSecret} = require('../../config');
const util = require('util');

const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);

const sign = (user, options, method = jwtSign) => {

    const {id, role} = user;
    const payload = {id, role};

    return method(payload, jwtSecret, options);
};


module.exports = {

    sign

};