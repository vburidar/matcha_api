import socketio from 'socket.io';
import cookie from 'cookie';
import cookieSign from 'cookie-signature';

import config from '../config';
import { ErrException } from '../api/middlewares/errorHandler';

import User from '../models/User';
import UserService from './users';
import Event from '../models/Event';
import EventService from './event';
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

        const user = await this.checkSession(socket.handshake.headers.cookie);

        /** Reconnection */
        if (this.timeout !== null) {
          clearTimeout(this.timeout);
          this.timeout = null;
          console.log('reconnection');
        } else {
          console.log('connection');
          User.update(user.id, { is_online: true }, { inTransaction: false });
          this.io
            .to('/general')
            .emit('userConnected', { userId: user.id });
        }

        /** Get user matches to join channels */
        const matches = await Event.getMatches(user.id);
        matches.forEach((match) => {
          socket.join(`/${Math.min(match.id, user.id)}-${Math.max(match.id, user.id)}`);
        });

        /** Join channel for self only */
        socket.join(`/${user.id}`);
        socket.join('/general');

        /** createMessage */
        socket.on('createMessage', async ({ receiverId, content }) => {
          const message = await UserService.createMessage(
            user.id,
            receiverId,
            content,
          );

          const notification = await Event.createNotification(
            receiverId,
            user.id,
            'message',
          );

          this.io
            .to(`/${Math.min(receiverId, user.id)}-${Math.max(receiverId, user.id)}`)
            .emit('messageReceived', { message });

          this.io
            .to(`/${receiverId}`)
            .emit('notificationReceived', { notification });
        });

        /** createVisit */
        socket.on('createVisit', async ({ receiverId }) => {
          const visit = await Event.createVisit(
            receiverId,
            user.id,
          );

          const notification = await Event.createNotification(
            receiverId,
            user.id,
            'visit',
          );

          this.io
            .to(`/${receiverId}`)
            .emit('notificationReceived', { notification });
        });

        /** createLike */
        socket.on('createLike', async ({ receiverId }) => {
          await EventService.createLike(
            receiverId,
            user.id,
          );

          const matchesData = await Event.getMatches(receiverId);

          const notification = await Event.createNotification(
            receiverId,
            user.id,
            (matchesData.findIndex((el) => el.id === user.id) > -1) ? 'match' : 'like',
          );

          this.io
            .to(`/${receiverId}`)
            .emit('notificationReceived', { notification });
        });

        /** deleteLike */
        socket.on('deleteLike', async ({ receiverId }) => {
          await EventService.deleteLike(
            receiverId,
            user.id,
          );

          const notification = await Event.createNotification(
            receiverId,
            user.id,
            'unlike',
          );

          this.io
            .to(`/${receiverId}`)
            .emit('notificationReceived', { notification });
        });

        /** getNotifications */
        socket.on('getNotifications', async () => {
          const notifications = await Event.getAllNotificationsFromUser(user.id);
          socket.emit('allNotifications', { notifications });
        });
        /** getUsersConnected */
        socket.on('getUsersConnected', async () => {
          const userIds = await User.getUsersConnected();
          socket.emit('allUsersConnected', { userIds });
        });

        /** markAllNotificationsAsRead */
        socket.on('markAllNotificationsAsRead', async () => {
          const notifications = await Event.markAllNotificationsAsRead(user.id);
          socket.emit('allNotifications', { notifications });
        });

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
            this.io
              .to('/general')
              .emit('userDisconnected', { userId: user.id });
            this.timeout = null;
          }, 4000);
        });
      } catch (err) {
        console.log(err);
      }
    });
  }

  static async checkSession(cookiesStr) {
    const cookies = cookie.parse(cookiesStr);
    if (!cookies['connect.sid']) {
      throw new ErrException({ id: 'not-connected', description: 'Not connected' });
    }
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
