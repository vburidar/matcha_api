import Location from '../models/Location';
import Image from '../models/Image';
import Interest from '../models/Interest';
import User from '../models/User';
import PostgresService from './postgres';
import PicturesService from './pictures';


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
}
