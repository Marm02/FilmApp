const {success, notFound} = require('../../services/response');

const User = require('./model').model;
const Playlist = require('../playlist/model').model;
const Film = require('../film/model').model;

const {sign} = require('../../services/jwt');
const _ = require('lodash');
const catchDuplicateEmail = require("./helpers").catchDuplicateEmail;
const {ip} = require('../../config');


const async = require('async');
const crypto = require('crypto');
const sendmail = require('../../services/email');

const port = "3000";

const index = (req, res, next) =>
    User.find()
        .then((users) => users.map((user) => user.view(true)))
        .then(success(res))
        .catch(next);

const show = ({params}, res, next) =>
    User.findById(params.id)
        .then(notFound(res))
        .then((user) => user ? user.view(false) : null)
        .then(success(res))
        .catch(next);

const showMe = ({user}, res) =>
    res.json(user.view(true));

const showMyPlaylists = ({user}, res, next) => {
    let myPlaylists = user.playlists;

    const requests = [];

    myPlaylists.forEach(playlist => {
        requests.push(
            Playlist.findById(playlist)
                .then(notFound(res))
                .then(res => {
                    return {
                        id: playlist,
                        title: res.title,
                        films: res.films,
                        createdAt: res.createdAt
                    }
                })
                .catch(next)
        );
    });

    Promise.all(requests)
        .then(success(res))
        .catch(next);

};

const showMyFilms = ({user}, res, next) => {
    let myFilms = user.films;

    const requests = [];

    myFilms.forEach(film => {
        requests.push(
            Film.findById(film)
                .then(notFound(res))
                .then(res => {
                    return {
                        id: film,
                        title: res.title,
                        thumbnail: res.thumbnail,
                        views: res.meta.views,
                        createdAt: res.createdAt,
                    }
                })
                .catch(next)
        );
    });

    Promise.all(requests)
        .then(success(res))
        .catch(next);

};

const create = ({body}, res, next) => {
    User.create(body)
        .then(user => {
            sign(user)
                .then((token) => ({token, user: user.view(true)}))
                .then(success(res, 201))
        })
        .catch((err) => catchDuplicateEmail(res, err, next));
};


const auth = (req, res, next) => {

    const {user} = req;

    sign(user)
        .then((token) => ({token, user: user.view(true)}))
        .then(success(res, 201))
        .catch(next);
};


const forgot =
    function (req, res, next) {
        async.waterfall([

            function (done) {
                crypto.randomBytes(20, function (err, buf) {
                    let token = buf.toString('hex');
                    done(err, token);
                });

            },
            function (token, done) {

                User.findOne({email: req.body.email}, function (err, user) {
                    if (!user) {
                        return res.status(404).json({errors: 'No account with that email address exists.'}).end();
                    }

                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000;

                    user.save(function (err) {
                        done(err, token, user);
                    });
                });

            },
            function (token, user, done) {

                const content = 'Change password link:\n\n' +
                    `https://marm02.github.io/filmapp_frontend/reset/` + token + '\n\n';

                sendmail(user.email, 'Reset password!', content, function (err) {
                    done(err, 'done');
                });
            }
        ], function (err) {
            if (err) return next(err);
            return res.status(200).end();
        });
    };


const reset = function (req, res, next) {
    async.waterfall([
        function (done) {

            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: {$gt: Date.now()}
            }, function (err, user) {
                if (!user) {
                    return res.status(401).json({
                        errors: ['Reset password token has expired.']
                    }).end();
                }

                user.password = req.body.password;

                if (user.password === undefined || user.password === null || user.password === "")
                    return res.status(404).json({
                        errors: ['Path password is required.']
                    }).end();

                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                    sign(user)
                        .then((token) => ({token, user: user.view(true)}))
                        .then(done(err, user))
                });
            });

        },
        function (user, done) {

            const content = 'Hello,\n\n' +
                'Password for your account ' + user.email + ' has just been changed.\n';

            sendmail(user.email, 'Your password has been changed', content, function (err) {
                done(err);
            });
        }
    ], function (err) {

        if (err) return next(err);

        return res.status(200).end();
    });
};

const update = ({body, user}, res, next) =>
    User.findById(user.id)
        .then(notFound(res))
        .then((user) => user ? Object.assign(user, body).save() : null)
        .then((user) => user ? user.view(true) : null)
        .then(success(res))
        .catch((err) => catchDuplicateEmail(res, err, next));


const destroy = ({params}, res, next) =>
    User.findById(params.id)
        .then(notFound(res))
        .then((user) => user ? user.remove() : null)
        .then(success(res, 204))
        .catch(next);


const updateMeta = async (req, res, next) => {

    const user = req.user;
    const {body} = req;

    let likes = 0;
    let dislikes = 0;

    if (!Object.keys(body).length)
        return res.status(400).json({
            errors: '`body` cannot be empty'
        }).end();

    if (!user) {
        return res.status(403).json({
            errors: 'unauthorized'
        }).end()
    }

    if (body.disliked) {

        if (user.meta.disliked.indexOf(body.disliked) <= -1) {
            user.meta.disliked.push(body.disliked);
            dislikes = 1;
            if (user.meta.liked.indexOf(body.disliked) > -1) {
                user.meta.liked.splice(user.meta.liked.indexOf(body.disliked), 1);
                likes = -1;
            }
        } else {
            return res.status(400).json({
                errors: 'film already disliked'
            }).end();
        }
    }

    if (body.liked) {
        if (user.meta.liked.indexOf(body.liked) <= -1) {
            user.meta.liked.push(body.liked);
            likes = 1;
            if (user.meta.disliked.indexOf(body.liked) > -1) {
                user.meta.disliked.splice(user.meta.disliked.indexOf(body.liked), 1);
                dislikes = -1;
            }
        } else {
            return res.status(400).json({
                errors: 'film already liked'
            }).end();
        }
    }


    {
        await user.save();
        success(res)({likes: likes, dislikes: dislikes})
    }

};

module.exports = {
    create, index, show, update, destroy, showMe, auth, forgot, reset, updateMeta, showMyPlaylists, showMyFilms
};