const multer = require('multer');
const path = require('path');
const mime = require('mime-types');
const GridFsStorage = require('multer-gridfs-storage');

const config = require('../../config');

const storage = new GridFsStorage({
    url: config.mongo.uri,
    thumbnail: (req, thumbnail) => {
        return {
            filename: path.parse(thumbnail.originalname).name + Date.now() + '.' + mime.extension(thumbnail.mimetype),
            bucketName: 'thumbnails',
            metadata: {
                originalname: thumbnail.originalname
            }
        };
    },

    file: (req, file) => {
        return {
            filename: path.parse(file.originalname).name + Date.now() + '.' + mime.extension(file.mimetype),
            bucketName: 'films',
            metadata: {
                originalname: file.originalname
            }
        };
    }
});


function fileFilter(req, file, done) {


    if (file.mimetype === mime.types.mp4 || file.mimetype === mime.types.ogg
        || file.mimetype === mime.types.jpeg || file.mimetype === mime.types.png) {
        return done(null, true)
    }

    done(new Error(`File type: ${file.mimetype} is not allowed!`))
}

const uploadDrive = multer({storage: storage, fileFilter: fileFilter}).fields([{name: 'file', maxCount: 1},
    {name: 'thumbnail', maxCount: 1}
]);

module.exports = uploadDrive;