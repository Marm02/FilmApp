const {Router} = require('express');
const {token, password} = require('../../services/passport');
const {index, showMe, show, create, update, destroy, auth, forgot, reset, updateMeta, showMyPlaylists, showMyFilms} = require("./controller");

const router = new Router();

router.get('/',
    token({required: true, roles: ['admin']}),
    index);

router.get('/me',
    token({required: true}),
    showMe);

router.get('/me/playlists',
    token({required: true}),
    showMyPlaylists);

router.get('/me/films',
    token({required: true}),
    showMyFilms);

router.get('/:id',
    //token({required: true, roles: ['admin']}),
    show);

router.post('/',
    create);

router.post('/auth',
    password(),
    auth);

router.put('/',
    token({required: true}),
    update);

router.put('/update/meta',
    token({required: true}),
    updateMeta);

router.delete('/:id',
    token({required: true, roles: ['admin']}),
    destroy);


router.post('/password/forgot', forgot);

router.post('/password/reset/:token', reset);

module.exports = router;