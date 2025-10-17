import { diskStorage } from 'multer';
import { extname } from 'path';

export function createMulterOptions(destination: string, limitMB: number = 2) {
    return {
        storage: diskStorage({
            destination: `./uploads/images/${destination}`,
            filename: (req, file, cb) => {
                const filename = `${Date.now()}${extname(file.originalname)}`;
                cb(null, filename);
            },
        }),
        limits: { fileSize: limitMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                return cb(null, false);
            }
            cb(null, true);
        },
    };
}