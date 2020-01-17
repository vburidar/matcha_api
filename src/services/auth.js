import crypto from 'crypto';
import User from '../models/User';
import { ErrException } from '../api/middlewares/errorHandler';

export default class AuthService {
  static async signup(userInput) {
    const [hashedPwd, salt] = this.hashPwd(userInput.password);
    try {
      const user = await User.create(
        userInput.login,
        hashedPwd,
        salt,
        userInput.email,
      );
      return user;
    } catch (err) {
      throw new ErrException({ id: 'Value_already_exists', description: 'This value is already set in the database' });
    }
  }

  static hashPwd(rawPwd) {
    const salt = crypto.randomBytes(Math.ceil(8)).toString('hex').slice(0, 16);
    const hashedPwd = crypto.createHash('whirlpool').update(rawPwd + salt).digest('hex');
    return ([hashedPwd, salt]);
  }

  static hashPwdWithSalt(rawPwd, salt) {
    const hashedPwd = crypto.createHash('whirlpool').update(rawPwd + salt).digest('hex');
    return (hashedPwd);
  }

  static async signin(userInput) {
    const user = await User.getUserByLogin(userInput.login);
    if (user && user.hashpwd === this.hashPwdWithSalt(userInput.password, user.salt)) {
      return (user);
    }
    if (user) {
      throw new ErrException({ id: 'Password_invalid', description: 'the password entered is different from the one in database' });
    } else {
      throw new ErrException({ id: 'Login_invalid', description: 'the login entered does not exist in the database' });
    }
  }
}
