import crypto from 'crypto';
import User from '../models/User';

export default class AuthService {
  static async signup(userInput) {
    const [hashedPwd, salt] = this.hashPwd(userInput.password);

    const user = await User.create(
      userInput.login,
      hashedPwd,
      salt,
      userInput.email,
    );

    return user;
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
    return (false);
  }
}
