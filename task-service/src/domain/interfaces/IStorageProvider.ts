export interface IStorageProvider {
  upload(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string>;
}
