import socketio from 'socket.io';
import cookie from 'cookie';
import cookieSign from 'cookie-signature';

import config from '../config';
import { ErrException } from '../api/middlewares/errorHandler';

import User from '../models/User';
import PostgresService from './postgres';

export default class SocketService {
  static async load(server) {
    this.io = socketio(server, {
      pingInterval: 1000,
      pingTimeout: 5000,
    });
    this.timeout = null;

    this.io.on('connection', async (s) => {
      try {
        const socket = s;

        /** Reconnection */
        if (this.timeout !== null) {
          clearTimeout(this.timeout);
          this.timeout = null;
          console.log('reconnection');
        } else {
          console.log('connection');
        }


        console.log('CONNECTED');
        const user = await this.checkSession(socket.handshake.headers.cookie);
        socket.userId = user.id;

        console.log(socket.userId);

        User.update(user.id, { is_online: true }, { inTransaction: false });

        socket.join('general');
        // socket.on('connect', async () => {
        //   console.log('CONNECTED');
        // });


        /** Disconnection */
        socket.on('disconnect', async () => {
          console.log('disconnection pending...');
          this.timeout = setTimeout(async () => {
            console.log('disconnection');
            User.update(
              user.id,
              { is_online: false, last_time_online: new Date() },
              { inTransaction: false },
            );
            this.timeout = null;
          }, 2000);
        });
      } catch (err) {
        console.log(err);
      }
    });
  }

  static async checkSession(cookiesStr) {
    const cookies = cookie.parse(cookiesStr);
    const sessionCookieSigned = cookies['connect.sid'].split('s:')[1];
    const sid = cookieSign.unsign(
      sessionCookieSigned,
      config.expressSession.secret,
    );

    const session = await PostgresService.query(
      `SELECT users.* FROM users
      INNER JOIN sessions ON (sessions.sess->>'user_id')::INTEGER = users.id
      WHERE sessions.sid = $1`,
      [sid],
    );

    if (session.rows.length === 0) {
      throw new ErrException({ id: 'not-connected', description: 'Not connected' });
    }
    return session.rows[0];
  }
}
