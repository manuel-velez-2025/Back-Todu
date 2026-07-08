import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider } from '../../domain/interfaces/IStorageProvider';

export class CloudinaryAdapter implements IStorageProvider {
  constructor() {
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ secure: true });
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
