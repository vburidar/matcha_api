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

    // Update pictures
    const tmpPictures = [];
    const picturesPromises = [];
    picturesData.forEach(async (pictureData) => {
      if (pictureData.data.match(/^data:image\/(png|jpeg|gif);base64,/) !== null) {
        picturesPromises.push(PicturesService.uploadPicture(pictureData));
      } else if (pictureData.data.match(/^https?:\/\/localhost:8080\/pictures\//) !== null) {
        tmpPictures.push({
          data: pictureData.data.replace(/^https?:\/\/localhost:8080\/pictures\//, ''),
          isProfile: pictureData.isProfile,
        });
      } else {
        tmpPictures.push(pictureData);
      }
    });

    tmpPictures.push(...await Promise.all(picturesPromises));

    let pictures = tmpPictures.map((picture) => ({
      path: picture.data,
      isProfile: picture.isProfile,
    }));

    pictures.sort((el) => ((el.isProfile === true) ? 1 : -1));

    const { images, deletedImages } = await Image.update(
      userId,
      pictures,
      { inTransaction: true },
    );

    pictures = images;

    // Delete images from storage system
    const deleteImagesPromises = [];
    deletedImages.forEach((imageToDelete) => {
      deleteImagesPromises.push(
        PicturesService.deletePicture(imageToDelete.path),
      );
    });
    await Promise.all(deleteImagesPromises);

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

      return (user);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch complete profile' });
    }
  }
}
