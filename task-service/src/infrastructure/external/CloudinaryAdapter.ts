import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider } from '../../domain/interfaces/IStorageProvider';

export class CloudinaryAdapter implements IStorageProvider {
  constructor() {
    // Soporta ambas formas de configurar credenciales: la variable
    // combinada CLOUDINARY_URL, o las 3 variables separadas
    // (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET),
    // que es como estan configuradas hoy en Render.
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ secure: true });
    } else if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  async upload(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'todu-evidencias',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Error al subir a Cloudinary: ${error.message}`));
            return;
          }
          if (!result || !result.secure_url) {
            reject(new Error('Cloudinary no devolvió una URL'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}