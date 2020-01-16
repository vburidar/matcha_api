import crypto from 'crypto';
import User from '../models/User';

export default class AuthService {
  static async signup(userInput) {
    const [hashedPwd, salt] = this.hashPwd(userInput.password);

    const user = User.create(
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
}
