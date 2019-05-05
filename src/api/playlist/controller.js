const mongoose = require('mongoose');

const {success, notFound} = require('../../services/response/');

const catchFilmNonExists = require('./helper').catchFilmNonExists;

const Playlist = require('./model').model;
const User = require('../user/model').model;
const Film = require('../film/model').model;

const create = async ({user, body}, res, next) => {

    let films = body.films;
    body.films = await [...new Set(films)];
    body.author = user.id;

    let playlist = await Playlist.create(body)
        .then((playlist) => playlist.view(true))
        .catch(next);

    if (playlist) {
        user.playlists.push(playlist.id);

        {
            await user.save();

            success(res, 201)(playlist);
        }
    }
};

const index = (req, res, next) =>
    Playlist.find()
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);

const showAll = async (req, res, next) => {

    const {query} = req;

    Playlist.find({films: {$exists: true, $ne: []}}).skip(parseInt(query.start)).limit(parseInt(query.limit))
        .then(playlists => {
            const requests = [];

            playlists.map((playlist) => {
                requests.push(
                    Film.findById(playlist.films[0], 'thumbnail')
                        .then(thumbnail => {
                            playlist.set('thumbnail', thumbnail._id, {strict: false});
                            return playlist;
                        })
                        .then(async res => {
                            await User.findById(playlist.author, 'nick')
                                .then(author => {
                                    const name = author && author.nick ? author.nick : 'user deleted';
                                    playlist.set('author_name', name, {strict: false});
                                    return playlist;
                                })
                                .catch(next);
                            return playlist;
                        })
                        .catch(async next => {

                            let thumbnailSet = false;

                            for (let film of playlist.films) {
                                Film.findById(film, 'thumbnail').then(film => {
                                    playlist.set('filmThumbnail', film._id, {strict: false});
                                    playlist.set('thumbnail', film.thumbnail._id, {strict: false});
                                    thumbnailSet = true;
                                });

                                if (thumbnailSet)
                                    break;
                            }

                            await User.findById(playlist.author, 'nick')
                                .then(author => {
                                    const name = author && author.nick ? author.nick : 'user deleted';
                                    playlist.set('author_name', name, {strict: false});
                                    return playlist;
                                })
                                .catch(next);
                            return playlist;

                        }))
            });

            Promise.all(requests).then((playlists) => {
                return playlists;
            })
                .then((playlists) => playlists.map((playlist) => {
                    return {
                        id: playlist._id,
                        films: playlist.films,
                        author: playlist.author,
                        title: playlist.title,
                        isPublic: playlist.isPublic,
                        thumbnail: playlist.get('thumbnail'),
                        authorName: playlist.get('author_name'),
                        filmThumbnail: playlist.get('filmThumbnail')
                    };
                }))
                .then(success(res))
                .catch(next);


        });
};


const show = ({params}, res, next) =>
    Playlist.findById(params.id)
        .then(notFound(res))
        .then((playlist) => playlist ? playlist.view(true) : null)
        .then(success(res))
        .catch(next);


const updateTitle = ({user, body, params}, res, next) => {

    if (body.title === undefined || body.title === null)
        return res.status(400).json({
            errors:
                "Path title is required!"
        }).end();

    if (!(typeof body.title === 'string' || body.title instanceof String))
        return res.status(400).json({
            errors:
                "Path title must be of type String!"
        }).end();

    if (user.role === 'admin' || (user.playlists.indexOf(params.id) > -1)) {

        Playlist.findById(params.id)
            .then(notFound(res))
            .then((playlist) => playlist ? Object.assign(playlist, body.title).save() : null)
            .then((playlist) => playlist ? playlist.view(true) : null)
            .then(success(res))
            .catch(next);

    } else {
        return res.status(403).end()
    }

};

const insertFilms = ({user, body, params}, res, next) => {

    if (body.films === undefined || body.films === null || body.films.length === 0)
        return res.status(400).json({
            errors:
                "Path films array is required!"
        }).end();

    if (!(body.films instanceof Array))
        return res.status(400).json({
            errors:
                "Path films must be of type Array!"
        }).end();

    if (user.role === 'admin' || (user.playlists.indexOf(params.id) > -1)) {


        for (let film of body.films) {
            if (!(mongoose.Types.ObjectId.isValid(film))) {
                return res.status(400).json({
                    errors: "Film with id " + film + " is not ObjectID type"
                });
            }
        }

        const films = body.films.map(s => mongoose.Types.ObjectId(s));

        Playlist.findOneAndUpdate({_id: params.id},
            {"$addToSet": {"films": films}}, {new: true})
            .then(notFound(res))
            .then((playlist) => playlist.view(true))
            .then(success(res))
            .catch((err) => catchFilmNonExists(res, err, next));

    } else {
        return res.status(403).end()
    }

};

const deleteFilms = ({user, body, params}, res, next) => {

    if (body.films === undefined || body.films === null || body.films.length === 0)
        return res.status(400).json({
            errors:
                "Path films array is required!"
        }).end();

    if (!(body.films instanceof Array))
        return res.status(400).json({
            errors:
                "Path films must be of type Array!"
        }).end();

    if (user.role === 'admin' || (user.playlists.indexOf(params.id) > -1)) {


        for (let film of body.films) {
            if (!(mongoose.Types.ObjectId.isValid(film))) {
                return res.status(400).json({
                    errors: "Film with id " + film + " is not ObjectID type"
                });
            }
        }

        const films = body.films.map(s => mongoose.Types.ObjectId(s));

        Playlist.findOneAndUpdate({_id: params.id},
            {"$pull": {"films": {$in: films}}}, {new: true})
            .then(notFound(res))
            .then((playlist) => playlist.view(true))
            .then(success(res))
            .catch((err) => catchFilmNonExists(res, err, next));

    } else {
        return res.status(403).end()
    }

};


const destroy = async (req, res, next) => {

    const {id} = req.params;

    let user = await User.findById(req.user._id);

    let playlist = await Playlist
        .findOne({_id: id});

    if (playlist === null)
        return notFound(res)(null);


    let userPromise = null;

    if (user.playlists.indexOf(id) > -1) {
        userPromise = User.findOneAndUpdate({_id: user.id},
            {"$pull": {"playlists": id}}).exec();
    } else if (user.role === 'admin') {
        userPromise = User.findOneAndUpdate({"playlists": {$in: id}},
            {"$pull": {"playlists": id}}).exec();
    }

    if (userPromise === null)
        return notFound(res)(null);


    const playlistPromise = playlist.remove();

    {
        await Promise.all([
            playlistPromise,
            userPromise
        ]);

        try {
            success(res, 200)("Playlist removed successfully!")
        } catch (e) {
            res.status(400).end()
        }
    }
};


const showAllSortByCreationDate = ({params}, res, next) =>
    Playlist.find({}, null, {sort: {createdAt: params.dir}})
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);


const showAllSortByTitle = ({params}, res, next) =>
    Playlist.find({}, null, {sort: {title: params.dir}})
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);

const showAllSortByFilmsSize = ({params}, res, next) =>
    Playlist.find({}, null, {sort: {films: params.dir}})
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);


const filterByTitle = ({params}, res, next) =>
    Playlist.find({title: params.title})
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);


const filterByTitleStartsWith = ({params}, res, next) =>
    Playlist.find({title: new RegExp("^" + params.start)})
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);


const filterByDateBetween = ({params}, res, next) =>
    Playlist.find({
        createdAt: {
            "$gte": new Date(2018, 11, 15),
            "$lt": new Date(2018, 11, 17)
        }
    })
        .then((playlist) => playlist.map((playlist) => playlist.view(true)))
        .then(success(res))
        .catch(next);


module.exports = {
    create,
    index,
    show,
    updateTitle,
    insertFilms,
    destroy,
    showAllSortByCreationDate,
    showAllSortByTitle,
    showAllSortByFilmsSize,
    filterByTitle,
    filterByTitleStartsWith,
    filterByDateBetween,
    deleteFilms,
    showAll
};
