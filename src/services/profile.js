import config from '../config';
import Location from '../models/Location';
import Image from '../models/Image';
import Interest from '../models/Interest';
import User from '../models/User';
import PostgresService from './postgres';
import PicturesService from './pictures';

import { ErrException } from '../api/middlewares/errorHandler';

export default class ProfileService {
  static async completeProfile(userId, userData, interestsData, locationsData, picturesData) {
    await PostgresService.createTransaction();

    // Update user settings
    const user = await User.update(
      userId,
      userData,
      { inTransaction: true },
    );

    // Replace all locations
    const locations = await Location.replace(
      userId,
      locationsData,
      { inTransaction: true },
    );

    // Add pictures
    const pictures = [];
    picturesData.forEach(async (pictureData) => {
      const fileName = await PicturesService.uploadPicture(pictureData.data);

      const image = await Image.create(
        userId,
        fileName,
        pictureData.isProfile,
        { inTransaction: true },
      );

      pictures.push(image);
    });

    // Add not existing interests and get both existing and newly created ones
    const interests = await Interest.create(interestsData, { inTransaction: true });

    // Add not existing users_interests and get both existing and newly created ones
    const usersInterests = await User.attachInterests(
      userId,
      interests,
      { inTransaction: true },
    );

    await PostgresService.commitTransaction();

    return {
      user,
      locations,
      pictures,
      interests,
      usersInterests,
    };
  }

  static async getCompletePrivateProfile(userId) {
    try {
      const user = await User.getCompletePrivateProfile(userId);
      user.images = user.images.map((image) => {
        let newPath = image.path;
        if (/^[a-z]+\.(png|jpg|gif)$/.test(image.path)) {
          newPath = `${config.url}/pictures/${image.path}`;
        }
        return {
          ...image,
          path: newPath,
        };
      });

      return (user);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch complete profile' });
    }
  }
}
