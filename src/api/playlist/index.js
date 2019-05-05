const {Router} = require('express');
const {
    create, index, show, updateTitle, insertFilms, destroy, showAllSortByCreationDate, showAllSortByTitle, showAllSortByFilmsSize,
    filterByTitle, filterByTitleStartsWith, filterByDateBetween, deleteFilms, showAll
} = require('./controller');
const {token} = require('../../services/passport');
const router = new Router();

const {Schema} = require('mongoose');

const bodymen = require("bodymen");

const {errorHandler} = require("bodymen");

router.post('/',
    token({required: true}),
    create);


router.get('/',
    index);

router.get('/all',
    showAll);

router.get('/:id',
    show);

router.put('/:id',
    token({required: true}),
    updateTitle);

router.put('/:id/films', token({required: true}),
    insertFilms);

router.put('/:id/films/delete', token({required: true}),
    deleteFilms);


router.delete('/:id',
    token({required: true}),
    destroy);


router.get('/sort/date/:dir',
    showAllSortByCreationDate);

router.get('/sort/title:dir',
    showAllSortByTitle);

router.get('/sort/films:dir',
    showAllSortByFilmsSize);


router.get('/filter/title/:title',
    filterByTitle);

router.get('/filter/title/start/:start',
    filterByTitleStartsWith);

router.get('/filter/date/:date',
    filterByDateBetween);

module.exports = router;
