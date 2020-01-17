import express from 'express';
import config from './config';
import loaders from './loaders';
import EmailService from './services/email';

async function startServer() {
  const app = express();

  await loaders(app);

  EmailService.load();

  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
}
startServer();
