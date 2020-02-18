import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import config from '../config';

export default class PicturesService {
  static async uploadPictureFs(pictureData, fileName) {
    try {
      fs.writeFileSync(
        path.join(config.storage.path, fileName),
        pictureData,
      );
      return fileName;
    } catch (err) {
      throw new Error('internal_server_error');
    }
  }

  static async checkAndResizePicture(base64) {
    if (base64.match(/^data:image\/(png|jpeg|gif);base64,/) === null) {
      throw new Error('invalid_image');
    }

    const base64Data = base64.replace(/^data:image\/(png|jpeg|gif);base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.toString('base64') !== base64Data) {
      throw new Error('invalid_image');
    }

    const pictureData = await sharp(buffer).resize(500, 500).toBuffer();

    return pictureData;
  }

  static async uploadPicture(base64) {
    const pictureData = await this.checkAndResizePicture(base64);
    const fileName = `${Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10)}.jpg`;

    if (config.storage.system === 'fs') {
      await this.uploadPictureFs(pictureData, fileName);
    }

    return fileName;
  }
}
