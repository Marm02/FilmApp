const {createModel} = require("mongoose-gridfs");

const _ = require("lodash");

const {success, notFound} = require('../../services/response/');

const Film = require('./model').model;
const User = require('../user/model').model;
const Comment = require('../comment/model').model;

const handleGridFsUpload = require('./upload-db');

const fileType = require('file-type');
const mime = require('mime-types');
const ObjectId = require('mongoose').Types.ObjectId;

const sharp = require('sharp');


const create = async (req, res, next) => {


    handleGridFsUpload(req, res, async (err) => {

        if (err) {
            return res.status(404).send({error: err.message});
        }

        const user = req.user;

        if (!req.files || !req.files.thumbnail || !req.files.file)
            return res.status(404).send({error: 'File or thumbnail not found'});


        const mongoose = require('../../services/mongoose');

        const ThumbnailGridFs = createModel({
            modelName: 'thumbnails',
            bucketName: 'thumbnails',
            connection: mongoose.connection
        });

        const ThumbnailGridFsSmall = createModel({
            modelName: 'thumbnails',
            bucketName: 'thumbnails',
            connection: mongoose.connection
        });

        ThumbnailGridFs.findById({_id: req.files.thumbnail[0].id}, (err, thumbnail) => {
            const [originalName, mime] = thumbnail.metadata.originalname.split('.');
            let filmStream = ThumbnailGridFs.read({filename: thumbnail.filename});

            let buffer = [];

            filmStream.on('data', function (chunk) {
                buffer.push(chunk);
            });

            filmStream.on('end', async function () {

                let all = new Buffer.concat(buffer);

                const previewName = originalName + Date.now() + '_preview.' + mime;
                const fileName = originalName + Date.now() + '_thumbnail.' + mime;
                const posterName = originalName + Date.now() + '_poster.' + mime;

                await sharp(all)
                    .resize(50, Math.round(50 * 9 / 16))
                    .toBuffer(previewName, (err, buff) => {

                        let stream = require('stream');

                        let bufferStream = new stream.PassThrough();

                        bufferStream.end(buff);

                        ThumbnailGridFsSmall.write({filename: previewName}, bufferStream,
                            async (error, file) => {
                                let thumbnailBody = {
                                    _id: req.files.thumbnail[0].id,
                                    preview: file._id,
                                };

                                await sharp(all)
                                    .resize(250, Math.round(250 * 9 / 16))
                                    .toBuffer(fileName, (err, buff) => {

                                        let stream = require('stream');

                                        let bufferStream = new stream.PassThrough();

                                        bufferStream.end(buff);

                                        ThumbnailGridFsSmall.write({filename: fileName}, bufferStream,
                                            async (error, file) => {

                                                thumbnailBody.small = file._id;

                                                await sharp(all)
                                                    .resize(500, Math.round(500 * 9 / 16))
                                                    .toBuffer(posterName, (err, buff) => {
                                                        let stream = require('stream');

                                                        let bufferStream = new stream.PassThrough();

                                                        bufferStream.end(buff);
                                                        ThumbnailGridFsSmall.write({filename: posterName}, bufferStream,
                                                            async (error, file) => {

                                                                const filmBody = {
                                                                    _id: req.files.file[0].id,
                                                                    author: user.id,
                                                                    description: req.body.description,
                                                                    title: req.body.title
                                                                };

                                                                let film = null;

                                                                thumbnailBody.poster = file._id;
                                                                filmBody.thumbnail = thumbnailBody;
                                                                try {
                                                                    film = await Film.create(filmBody)
                                                                        .then((film) => film.view(true));
                                                                } catch (e) {

                                                                    const FilmGridFs = createModel({
                                                                        modelName: 'films',
                                                                        bucketName: 'films',
                                                                        connection: mongoose.connection
                                                                    });

                                                                    return FilmGridFs.unlink(req.files.file[0].id, (err, doc) => {
                                                                        res.status(400).send(e).end();
                                                                    });
                                                                }

                                                                if (film) {
                                                                    user.films.push(film.id);

                                                                    {
                                                                        await user.save();
                                                                        success(res, 201)(film);
                                                                    }
                                                                }
                                                            });
                                                    });

                                            });
                                    });
                            });
                    })
            });
        });
    });
    //});
};


// TODO zmienic nazwe na showFilmsWithComments

const index = ({query}, res, next) => {

    let projection = {
        title: 'title', meta: 'meta', id: '_id', thumbnail: 'thumbnail', author: 'author',
        description: 'description', createdAt: 'createdAt'
    };

    let exclude = {};

    if (query.exclude && !ObjectId.isValid(query.exclude)) {
        return res.status(400).end();
    }

    if (query.exclude)
        exclude = {_id: {$nin: [query.exclude]}};


    Film.find(exclude, projection).skip(parseInt(query.start)).limit(parseInt(query.limit))
        .then(films => {
            const requests = [];

            films.map((film) => {
                requests.push(
                    User.findById(film.author, 'nick')
                        .then(author => {
                            film.set('author_name', author.nick, {strict: false});
                            return film;
                        }).catch(next))
            });

            Promise.all(requests).then((films) => {
                return films;
            })
                .then((films) => films.map((film) => {

                    return {
                        author: film.author,
                        title: film.title,
                        description: film.description,
                        views: film.meta.views,
                        thumbsUp: film.meta.likes,
                        thumbsDown: film.meta.dislikes,
                        thumbnail: film.thumbnail,
                        id: film._id,
                        createdAt: film.createdAt,
                        author_name: film.get('author_name')
                    };
                }))
                .then(success(res))
                .catch(next);


        });
};


const showFilm = (req, res, next) => {

    const {params} = req;
    const mongoose = require('../../services/mongoose');

    const FilmGridFs = createModel({
        modelName: 'films',
        bucketName: 'films',
        connection: mongoose.connection
    });


    FilmGridFs.findById({start: 10, end: 20, _id: params.id}, (err, film) => {
        if (err || film === null) return notFound(res)();

        if (req.headers['range']) {

            console.log("HEAD RANGE");
            let positions = req.headers['range'].replace(/bytes=/, "").split("-");
            let start = parseInt(positions[0], 10);
            let total = film.length;
            let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
            let chunksize = (end - start) + 1;

            let maxChunk = 1024 * 1024; // 1MB at a time
            if (chunksize > maxChunk) {
                end = start + maxChunk - 1;
                chunksize = (end - start) + 1;
            }

            res.writeHead(206, {
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': film.contentType
            });


            let filmStream = FilmGridFs.read({start: start, end: end, filename: film.filename});
            filmStream.pipe(res);

        } else {
            console.log("NORMAl REQUEST");
            res.header('Content-Type', film.contentType);
            res.header('Content-Length', film.length);
            let filmStream = FilmGridFs.read({filename: film.filename});
            filmStream.pipe(res);
        }
    });

};

const showOneFilmDescriptionWithoutComments = (req, res, next) => {


    let projection = {
        title: 'title', meta: 'meta', id: '_id', thumbnail: 'thumbnail', author: 'author',
        description: 'description', createdAt: 'createdAt'
    };

    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).end();
    }

    Film.findById(req.params.id, projection)
        .then(notFound(res))
        .then(film => {
            if (film !== null) {
                const requests = [];


                User.findById(film.author, 'nick')
                    .then(author => {
                        return {
                            author: film.author,
                            title: film.title,
                            description: film.description,
                            views: film.meta.views,
                            thumbsUp: film.meta.likes,
                            thumbsDown: film.meta.dislikes,
                            thumbnail: film.thumbnail,
                            id: film._id,
                            createdAt: film.createdAt,
                            author_name: author.nick
                        };
                    })
                    .then(film => {
                        Film.aggregate([{$match: {_id: film.id}}, {$project: {commentsLength: {$size: '$comments'}}}])
                            .then(commentsLength => {
                                film.commentsLength = commentsLength[0].commentsLength;
                                return film;
                            })
                            .then(success(res))
                            .catch(next);
                    })
                    .catch(next);
            }
        })
        .then((film) => film ? film.view(true) : null)
        .then(success(res))
        .catch(next);


};

const showOneFilmDescriptionAndComments = (req, res, next) => {

    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).end();
    }

    Film.findOne({_id: req.params.id},
        {'comments': {$slice: [parseInt(req.query.start), parseInt(req.query.limit)]}})
        .populate('comments')
        .then(notFound(res))
        .then(film => {

            let comments = film.comments;

            const requests = [];

            comments.forEach(comment => {
                requests.push(
                    User.findById(comment.author_id, 'nick')
                        .then(author => {
                            return ({
                                id: comment._id,
                                author: author.nick,
                                comment: comment.text,
                                createdAt: comment.createdAt
                            });
                        }).catch(next));

            });

            Promise.all(requests).then((comments) => {
                User.findById(film.author, 'nick')
                    .then(author => {
                        return {
                            author: film.author,
                            title: film.title,
                            description: film.description,
                            views: film.meta.views,
                            thumbsUp: film.meta.likes,
                            thumbsDown: film.meta.dislikes,
                            thumbnail: film.thumbnail,
                            id: film._id,
                            createdAt: film.createdAt,
                            comments: comments,
                            author_name: author.nick
                        };
                    })
                    .then(success(res))
                    .catch(next);
            });


        })
        .catch(next => {
            return res.status(400).json({
                errors: next.errmsg
            })
        });
};


const showThumbnail = async ({params, query}, res, next) => {

    const mongoose = require('../../services/mongoose');

    const ThumbnailGridFs = createModel({
        bucketName: 'thumbnails',
        connection: mongoose.connection
    });

    let film = await Film
        .findOne({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);


    let width = 900;
    let height = Math.round(width / 1.77777);

    let ratio = 16 / 9;

    if (query.ratio) {
        let r = query.ratio.split('/');
        ratio = parseInt(r[0]) / parseInt(r[1]);
    }

    if (query.width) {
        width = parseInt(query.width);
        height = Math.round(width / ratio);
    }
    let thumbnailId = film.thumbnail._id;

    if (query.width && query.width === 'small') {
        thumbnailId = film.thumbnail.small;
    }
    if (query.width && query.width === 'poster') {
        thumbnailId = film.thumbnail.poster;
    }
    if (query.width && query.width === 'preview') {
        thumbnailId = film.thumbnail.preview;
    }

    ThumbnailGridFs.findById({_id: ObjectId(thumbnailId)}, (err, thumbnail) => {


        if (err || thumbnail === null)
            return notFound(res)();


        let stream = thumbnail.read();

        if (query.width && query.width !== 'small' && query.width !== 'poster'  && query.width !== 'preview') {
            let buffer = [];

            stream.on('data', function (chunk) {
                buffer.push(chunk);

            });

            stream.on('end', async function () {
                let all = new Buffer.concat(buffer);
                await sharp(all)
                    .resize(width, height)
                    .toBuffer()
                    .then(data => {
                        res.set('Content-Length', data.length);
                        res.set('Content-Type', thumbnail.contentType);
                        res.write(data);
                        res.end();

                    })
                    .catch(err => {
                        console.log(err)
                    });
            });
        } else {
            res.set('Content-Length', thumbnail.length);
            res.set('Content-Type', thumbnail.contentType);
            stream.pipe(res);
        }

    });

};


const update = function ({user, body, params}, res, next) {

    if (!Object.keys(body).length)
        return res.status(400).end();

    if (user.role === 'admin' || (user.films.indexOf(params.id) > -1)) {


        Film.findById(params.id)
            .then(notFound(res))
            .then((film) => film ? Object.assign(film, body).save() : null)
            .then((film) => film ? film.view(true) : null)
            .then(success(res))
            .catch(next);

    } else {
        return res.status(403).end()
    }

};

const updateMeta = function ({body, params}, res, next) {

    if (!Object.keys(body).length)
        return res.status(400).end();


    let update = body.views ? {'meta.views': body.views} : {'meta.likes': body.likes, 'meta.dislikes': body.dislikes};

    Film.findOneAndUpdate({_id: params.id}, {$inc: update}, {new: true})
        .then(notFound(res))
        .then((film) => film ? film.view(true) : null)
        .then(success(res))
        .catch(next);


};

const destroy = async (req, res, next) => {


    const {film_id} = req.params;
    const user = req.user;

    const mongoose = require('../../services/mongoose');

    const FilmGridFs = createModel({
        modelName: 'films',
        bucketName: 'films',
        connection: mongoose.connection
    });

    const ThumbnailGridFs = createModel({
        modelName: 'thumbnails',
        bucketName: 'thumbnails',
        connection: mongoose.connection
    });


    await FilmGridFs.unlink({_id: film_id}, (err, doc) => {
        if (err || doc === null) {
            return notFound(res)(doc);
        }
    });

    let film = await Film
        .findOne({_id: film_id});

    if (film === null) {
        return notFound(res)(null);
    }

    await ThumbnailGridFs.unlink({_id: film.thumbnail.id}, (err, doc) => {
        if (err || doc === null) {
            return notFound(res)(doc);

        }

    });

    await ThumbnailGridFs.unlink({_id: film.thumbnail.small}, (err, doc) => {
        if (err || doc === null) {
            return notFound(res)(doc);

        }

    });

    await ThumbnailGridFs.unlink({_id: film.thumbnail.poster}, (err, doc) => {
        if (err || doc === null) {
            return notFound(res)(doc);

        }

    });

    await ThumbnailGridFs.unlink({_id: film.thumbnail.preview}, (err, doc) => {
        if (err || doc === null) {
            return notFound(res)(doc);

        }

    });

    let userPromise = null;

    if (user.films.indexOf(film_id) > -1) {
        userPromise = User.findOneAndUpdate({_id: user.id},
            {"$pull": {"films": film_id, "comments": {"$in": film.comments}}}).exec();
    } else if (user.role === 'admin') {
        userPromise = User.findOneAndUpdate({"films": {$in: film_id}},
            {"$pull": {"films": film_id, "comments": {"$in": film.comments}}}).exec();
    }

    if (userPromise === null) {
        return notFound(res)(null);
    }


    const filmPromise = film.remove();

    const commentPromise = Comment.deleteMany({_id: {$in: film.comments}}).exec();

    {
        await Promise.all([
            filmPromise,
            userPromise,
            commentPromise
        ]);

        try {
            success(res, 200)("Film removed successfully!")
        } catch (e) {
            res.status(400).end()
        }
    }

};


const showAllSortByCreationDate = ({params}, res, next) =>
    Film.find({}, null, {sort: {createdAt: params.dir}})
        .then((film) => film.map((film) => film.view()))
        .then(success(res))
        .catch(next);


const showAllSortByViews = ({params}, res, next) =>
    Film.find({}, null, {sort: {"meta.views": params.dir}})
        .then((film) => film.map((film) => film.view()))
        .then(success(res))
        .catch(next);

const showAllSortByLikes = ({params}, res, next) =>
    Film.find({}, null, {sort: {"meta.likes": params.dir}})
        .then((film) => film.map((film) => film.view()))
        .then(success(res))
        .catch(next);


const filterByTitle = ({params, query}, res, next) => {

    let sort = {};

    let projection = {
        title: 'title', meta: 'meta', '_id': '_id', thumbnail: 'thumbnail', author: 'author',
        description: 'description', createdAt: 'createdAt'
    };

    if (query.p)
        projection = '_id';

    if (query.sort) {
        if (query.sort === 'upload_date') {
            sort = {sort: {createdAt: query.dir}};
        } else if (query.sort === 'view_count') {
            sort = {sort: {'meta.views': query.dir}};
        } else if (query.sort === 'rating') {
            sort = {sort: {'meta.likes': query.dir}};
        }
    }


    if (query.filter && query.filter !== '') {

        let currentDate = new Date();
        let destDate = new Date();

        if (query.filter === 'last_hour') {
            destDate.setHours(currentDate.getHours() - 1);
        } else if (query.filter === 'today') {
            destDate.setHours(0);
            destDate.setMinutes(0);
            destDate.setSeconds(0);
        } else if (query.filter === 'this_week') {
            destDate.setHours(0);
            destDate.setMinutes(0);
            destDate.setSeconds(0);

            let distance = 0 - currentDate.getDay();

            destDate.setDate(currentDate.getDate() + distance);
        } else if (query.filter === 'this_month') {
            destDate.setHours(0);
            destDate.setMinutes(0);
            destDate.setSeconds(0);

            let distance = 0 - currentDate.getDate();
            destDate.setDate(currentDate.getDate() + distance + 1);
        } else if (query.filter === 'this_year') {
            destDate.setHours(0);
            destDate.setMinutes(0);
            destDate.setSeconds(0);
            destDate.setDate(0);
            destDate.setMonth(0);

            let distance = 0 - currentDate.getMonth();
            destDate.setDate(currentDate.getMonth() + distance + 2);
        }


        Film.find({title: new RegExp(query.search)}, projection, sort)
            .where('createdAt').gte(destDate).lte(currentDate)
            .skip(parseInt(query.start)).limit(parseInt(query.limit))
            .then((films) => {
                if (!query.p) {

                    const requests = [];

                    films.map((film) => {
                        requests.push(
                            User.findById(film.author, 'nick')
                                .then(author => {
                                    film.set('author_name', author.nick, {strict: false});
                                    return film;
                                }).catch(next))
                    });

                    Promise.all(requests).then((films) => {
                        return films;
                    })
                        .then((films) => films.map((film) => {

                            return {
                                author: film.author,
                                title: film.title,
                                description: film.description,
                                views: film.meta.views,
                                thumbsUp: film.meta.likes,
                                thumbsDown: film.meta.dislikes,
                                thumbnail: film.thumbnail,
                                id: film._id,
                                createdAt: film.createdAt,
                                author_name: film.get('author_name')
                            };
                        }))
                        .then(success(res));

                } else {
                    return films;
                }

            })
            .then(success(res))
            .catch(next);

        return;
    }


    Film.find({title: new RegExp(query.search)}, projection, sort)
        .skip(parseInt(query.start)).limit(parseInt(query.limit))
        .then((films) => {
            if (!query.p) {

                const requests = [];

                films.map((film) => {
                    requests.push(
                        User.findById(film.author, 'nick')
                            .then(author => {
                                film.set('author_name', author.nick, {strict: false});
                                return film;
                            }).catch(next))
                });

                Promise.all(requests).then((films) => {
                    return films;
                })
                    .then((films) => films.map((film) => {

                        return {
                            author: film.author,
                            title: film.title,
                            description: film.description,
                            views: film.meta.views,
                            thumbsUp: film.meta.likes,
                            thumbsDown: film.meta.dislikes,
                            thumbnail: film.thumbnail,
                            id: film._id,
                            createdAt: film.createdAt,
                            author_name: film.get('author_name')
                        };
                    }))
                    .then(success(res));

            } else {
                return films;
            }

        })
        .then(success(res))
        .catch(next);
};


module.exports = {
    create,
    index,
    showFilm,
    showOneFilmDescriptionWithoutComments,
    showOneFilmDescriptionAndComments,
    showThumbnail,
    update,
    destroy,
    showAllSortByCreationDate,
    showAllSortByViews,
    showAllSortByLikes,
    filterByTitle,
    updateMeta
};
