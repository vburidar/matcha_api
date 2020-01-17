import nodemailer from 'nodemailer';
import config from '../config';


export default class EmailService {
  static async load() {
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        pool: true,
        host: config.smtp.host,
        port: 465,
        secure: true,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });

      try {
        await this.transport.verify();
        console.log('EmailService loaded');
      } catch (err) {
        throw new Error('EmailService could not load, SMTP connection failed');
      }
    }
  }

  static async sendMail({ to, subject, text }) {
    const email = {
      from: config.smtp.user,
      to,
      subject,
      text,
    };

    try {
      await this.transport.sendMail(email);
    } catch (err) {
      console.log(err);
    }
  }
}
