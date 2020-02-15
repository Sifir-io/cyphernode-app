"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3 = __importStar(require("sqlite3"));
const migrate_1 = __importDefault(require("migrate"));
const debug = require("debug")("sifir:db");
let db;
const getClient = (filename = process.env.SIFIR_SQLLITE_FILE || ":memory:") => {
    if (db && db.then) {
        return db;
    }
    db = new Promise((res, rej) => {
        const sql = new sqlite3.Database(filename, err => {
            if (err)
                rej(err);
            res(sql);
        });
    });
    return db;
};
exports.getClient = getClient;
const closeClient = async () => {
    const _db = await db;
    return new Promise((res, rej) => _db.close(res));
};
exports.closeClient = closeClient;
const migrationsStore = {
    async load(cb) {
        debug("loading migrations");
        const _db = await getClient();
        _db.get("SELECT * FROM _migrations ORDER BY id DESC", (err, migration) => {
            if (migration && migration.migrationJson) {
                const parsedMigrations = JSON.parse(migration.migrationJson);
                debug("migrations loaded", parsedMigrations);
                cb(null, parsedMigrations);
            }
            else
                cb(err && err.errno == 1 ? null : err, {});
        });
    },
    async save(state, cb) {
        const _db = await getClient();
        debug("saving migrations");
        _db.run("INSERT INTO _migrations (migrationJson) values ($state)", {
            $state: JSON.stringify(state)
        }, err => (err ? cb(err) : cb()));
    }
};
// Migration check
const doMigrations = () => new Promise((res, rej) => migrate_1.default.load({
    stateStore: migrationsStore,
    migrationsDirectory: "./stores/migrations"
}, (err, set) => {
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
}));
exports.doMigrations = doMigrations;
