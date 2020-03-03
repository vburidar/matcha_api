import crypto from 'crypto';
import User from '../models/User';
import { ErrException } from '../api/middlewares/errorHandler';
import EmailService from './email';

export default class AuthService {
  static async signup(userInput) {
    const [hashedPwd, salt] = this.hashPwd(userInput.password);
    try {
      const user = await User.create(
        userInput.login,
        userInput.firstName,
        userInput.lastName,
        hashedPwd,
        salt,
        userInput.email,
      );
      try {
        const emailData = {
          to: userInput.email,
          subject: 'Subscription to See You',
          html: `Congratulations!<br/>
          You just subscribed to See You<br/>
          Click on <a href="http://localhost:3000/validate-account/${userInput.login}/${this.hashPwdWithSalt(userInput.login, salt)}">
          this link</a> to validate your account<br/> 
          Connect to your account to start meeting and dating!`,
        };
        EmailService.sendMail(emailData);
        return user;
      } catch (err) {
        throw new ErrException({ id: 'fatal_error', description: 'could not send email' });
      }
    } catch (err) {
      throw new ErrException({ id: 'value_already_exist', description: 'This value is already set in the database' });
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
    if (
      user
      && user.password === this.hashPwdWithSalt(userInput.password, user.salt)
      && user.validated
    ) {
      return user;
    }
    if (user) {
      if (user.validated) {
        throw new ErrException({ id: 'password_invalid', description: 'the password entered is different from the one in database' });
      } else {
        throw new ErrException({ id: 'account_not_validated' });
      }
    } else {
      throw new ErrException({ id: 'login_invalid', description: 'the login entered does not exist in the database' });
    }
  }

  static async validateAccount(userInput) {
    const user = await User.getUserByLogin(userInput.login);
    console.log(this.hashPwdWithSalt(user.login, user.salt));
    console.log(userInput.code);
    if (user && this.hashPwdWithSalt(user.login, user.salt) === userInput.code) {
      const validated = await User.updateValidate(userInput.login);
      return validated;
    }
    if (user) {
      throw new ErrException({ id: 'validation_code_invalid' });
    }
    throw new ErrException({ id: 'login_invalid' });
  }

  static async sendResetPwdLink(userInput) {
    const user = await User.getUserByEmail(userInput.email);
    if (user) {
      try {
        const emailData = {
          to: userInput.email,
          subject: 'Reset your See You password',
          html: `${`Hello!<br/>
          You can reset your password <a href=http://localhost:3000/reset-password/`}${user.login}/${this.hashPwdWithSalt(userInput.email, user.salt)}>
          here</a>! 
          See You soon!`,
        };
        EmailService.sendMail(emailData);
        return user;
      } catch (err) {
        throw new ErrException({ id: 'fatal_error', description: 'could not send email' });
      }
    } else throw new ErrException({ id: 'email_invalid' });
  }

  static async resetPwd(userInput) {
    const user = await User.getUserByLogin(userInput.login);
    if (user === null) {
      throw new ErrException({ id: 'login_invalid' });
    } else if (this.hashPwdWithSalt(user.email, user.salt) !== userInput.code) {
      throw new ErrException({ id: 'code_invalid' });
    } else {
      try {
        const newPwdData = this.hashPwd(userInput.password);
        const changePwd = await User.updatePwd(newPwdData, userInput.login);
        return changePwd;
      } catch (err) {
        throw new ErrException({ id: 'update_failure', description: 'could not update password in database' });
      }
    }
  }

  static async testLink(userInput) {
    const user = await User.getUserByLogin(userInput.login);
    if (user && this.hashPwdWithSalt(user.email, user.salt) === userInput.code) {
      return ('valid_link');
    }
    throw new ErrException({ id: 'reset_pwd_link_invalid' });
  }

  static async deleteSession(req) {
    req.session.user_id = undefined;
  }
}
