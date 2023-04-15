"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IndexedDb_1 = require("./IndexedDb");
/**
 * 初始化函数
 * @param param
 * @returns
 */
function init({ dbName, version = 1, tables = [] }) {
    const db = getInstance({
        dbName,
        version,
        tables
    });
    return db.openDb();
}
exports.init = init;
/**
 * 获取单例对象
 * @param param
 * @returns
 */
function getInstance(param) {
    const { dbName, version = 1, tables = [] } = param;
    const db = IndexedDb_1.getIndexedDbInstance({
        dbName,
        version,
        tables
    });
    return db;
}
exports.getInstance = getInstance;
