import multer from "multer";
import path from "path";

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, 'imagenes');
    },
    filename: (req, file, cb) => {
        const extention = path.extname(file.originalname);
        const onlyName = path.basename(file.originalname, extention).replace(/\s+/g, '-').toLowerCase();
        const timeStamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
        const fullName = `${onlyName}${timeStamp}${extention}`;
        cb(null, fullName);
    }
});

export const uploadSingleImage = multer({
    storage
}).single('Foto'); 

export const uploadImage = uploadSingleImage;