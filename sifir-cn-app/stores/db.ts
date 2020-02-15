import * as sqlite3 from "sqlite3";
import migrate from "migrate";
const debug = require("debug")("sifir:db");
let db: Promise<sqlite3.Database>;
const getClient = (filename = process.env.SIFIR_SQLLITE_FILE || ":memory:") => {
  if (db && db.then) {
    return db;
  }
  db = new Promise((res, rej) => {
    const sql = new sqlite3.Database(filename, err => {
      if (err) rej(err);
      res(sql);
    });
  });
  return db;
};
const closeClient = async () => {
  const _db = await db;
  return new Promise((res, rej) => _db.close(res));
};
const migrationsStore = {
  async load(cb: Function) {
    debug("loading migrations");
    const _db = await getClient();
    _db.get("SELECT * FROM _migrations ORDER BY id DESC", (err, migration) => {
      if (migration && migration.migrationJson) {
        const parsedMigrations = JSON.parse(migration.migrationJson);
        debug("migrations loaded", parsedMigrations);
        cb(null, parsedMigrations);
      } else cb(err && err.errno == 1 ? null : err, {});
    });
  },
  async save(state, cb: Function) {
    const _db = await getClient();
    debug("saving migrations");
    _db.run(
      "INSERT INTO _migrations (migrationJson) values ($state)",
      {
        $state: JSON.stringify(state)
      },
      err => (err ? cb(err) : cb())
    );
  }
};
// Migration check
const doMigrations = () =>
  new Promise((res, rej) =>
    migrate.load(
      {
        stateStore: migrationsStore,
        migrationsDirectory: "./stores/migrations"
      },
      (err, set) => {
        if (err) {
          rej(err);
          return;
        }
        set.up(err => {
          if (err) {
            rej(err);
            return;
          }
          debug("migrations successfully ran");
          res();
        });
      }
    )
  );
export { getClient, closeClient, doMigrations };
