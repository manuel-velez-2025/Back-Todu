import multer from 'multer';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten archivos de imagen'));
      return;
    }
    cb(null, true);
  },
}).single('evidencia');
