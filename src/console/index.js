import DbService from '../services/db';
import PopulateService from '../services/populate';
import PostgresService from '../services/postgres';

async function db(action) {
  switch (action) {
    case 'reset':
      await DbService.resetDatabase();
      break;
    case 'setup':
      await DbService.setupDatabase();
      break;
    case 'populate':
      await PopulateService.populate();
      break;
    default:
      process.exit(1);
      break;
  }
}

async function initialise() {
  try {
    PostgresService.load();
    switch (process.argv[2]) {
      case 'db':
        await db(process.argv[3]);
        break;
      default:
        process.exit(1);
        break;
    }
    process.exit();
  } catch (err) {
    process.exit(1);
  }
}

initialise();
