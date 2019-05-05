const {Router} = require('express');
const {
    create, index, showFilm, showOneFilmDescriptionWithoutComments, showOneFilmDescriptionAndComments,
    showThumbnail, update, destroy, showAllSortByViews, showAllSortByLikes, filterByTitle, showAllSortByCreationDate, updateMeta
}
    = require('./controller');

const {
    createComment, destroyComment, updateComment, showAllCommentsSortByCreationDate,
    showAllSortByAuthorName, showAllSortByText, filterByAuthorName, filterByDateBetween, filterByTextContains
} = require('../comment/controller');

const {token} = require('../../services/passport');
const router = new Router();

router.post('/',
    token({required: true}),
    create);

router.get('/',
    index);

router.get('/:id',
    showFilm);

router.get('/:id/desc/no',
    showOneFilmDescriptionWithoutComments);

router.get('/:id/desc',
    showOneFilmDescriptionAndComments);

router.put('/:id',
    token({required: true}),
    update);

router.delete('/:film_id',
    token({required: true}),
    destroy);


router.put('/:id/meta',
    updateMeta);

router.get('/:film_id/thumbnail/:id',
    showThumbnail);


router.post('/:film_id/comments',
    token({required: true}),
    createComment);

router.put('/:film_id/comments/update/:commentId',
    token({required: true}),
    updateComment);

router.delete('/:film_id/comments/:commentId',
    token({required: true}),
    destroyComment);


router.get('/:film_id/comments/sort/author/:dir',
    showAllSortByAuthorName);

router.get('/:film_id/comments/sort/text/:dir',
    showAllSortByText);

router.get('/:film_id/comments/sort/date/:dir',
    showAllCommentsSortByCreationDate);


router.get('/:film_id/comments/filter/author/:name',
    filterByAuthorName);

router.get('/:film_id/comments/filter/date/',
    filterByDateBetween);

router.get('/:film_id/comments/filter/text/:text',
    filterByTextContains);


router.get('/sort/views/:dir',
    showAllSortByViews);

router.get('/sort/likes/:dir',
    showAllSortByLikes);

router.get('/sort/date/:dir',
    showAllSortByCreationDate);


router.get('/filter/title',
    filterByTitle);


module.exports = router;
