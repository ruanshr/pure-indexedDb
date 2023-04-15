"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 获取window.indexedDb
 * @returns
 */
function getIndexedDb() {
    return window.indexedDB;
}
const indexedDbCache = new Map();
/**
 * 获取indexedDb
 * @param dbOptions
 * @returns
 */
function getIndexedDbInstance(dbOptions) {
    const { dbName, version } = dbOptions;
    const key = `${dbName}_${version}`;
    let instance = indexedDbCache.get(key);
    if (!instance) {
        instance = new IndexedDb(dbOptions);
        indexedDbCache.set(key, instance);
    }
    return instance;
}
exports.getIndexedDbInstance = getIndexedDbInstance;
/**
 * 移除indexedDb
 * @param dbOptions
 */
function removeIndexedDb(dbOptions) {
    const { dbName, version } = dbOptions;
    const key = `${dbName}_${version}`;
    indexedDbCache.delete(key);
}
class IndexedDb {
    constructor(param) {
        this.dbName = ""; // 数据库名称
        this.version = 1; // 数据库版本
        this.tableList = []; // 表单列表
        this.db = null;
        this.queue = []; // 事务队列，实例化一次以后下次打开页面时数据库自启动
        const { dbName, version = 1, tables = [] } = param;
        this.dbName = dbName;
        this.version = version;
        this.tableList = tables;
    }
    /**
     * @method 查询
     * @param {Object}
     *   @property {String} tableName 表名
     */
    queryAll({ tableName }) {
        let res = [];
        return this.commitDb(tableName, (transaction) => {
            return transaction.openCursor();
        }, "readonly", (e, resolve) => {
            this.cursorSuccess(e, {
                condition: () => true,
                handler: ({ currentValue }) => res.push(currentValue),
                success: () => resolve(res)
            });
        });
    }
    /**
     * @method 查询(返回具体数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件
     */
    query({ tableName, condition }) {
        let res = [];
        return this.commitDb(tableName, (transacton) => {
            return transacton.openCursor();
        }, "readonly", (e, resolve) => {
            this.cursorSuccess(e, {
                condition,
                handler: ({ currentValue }) => res.push(currentValue),
                success: () => resolve(res)
            });
        });
    }
    /**
    * @method 查询满足key条件的个数(返回满足条件的数字个数)
    * @param {Object}
    *   @property {String} tableName 表名
    *   @property {Number|String} key 查询的key
    *   @property {Object} countCondition 查询条件
    */
    count({ tableName, key, countCondition }) {
        const mapCondition = {
            equal: IDBKeyRange.only,
            gt: IDBKeyRange.lowerBound,
            lt: IDBKeyRange.upperBound,
            between: IDBKeyRange.bound
        };
        return this.commitDb(tableName, (transaction) => {
            return transaction.index(key).count(mapCondition[countCondition.type](...countCondition.rangeValue));
        }, "readonly", (e, resolve) => {
            resolve(e.target.result);
        });
    }
    /**
     * @method 查询数据(更具表具体属性)返回具体某一个
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Number|String} key 名
     *   @property {Number|String} value 值
     */
    queryByKeyValue({ tableName, key, value }) {
        return this.commitDb(tableName, (transaction) => {
            return transaction.index(key).get(value);
        }, "readonly", (e, resolve) => {
            resolve(e.target.result);
        });
    }
    /**
     * @method 查询数据（主键值）
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Number|String} value 主键值
     */
    queryByPrimaryKey({ tableName, value }) {
        return this.commitDb(tableName, (transaction) => {
            return transaction.get(value);
        }, "readonly", (e, resolve) => {
            resolve(e.target.result);
        });
    }
    /**
     * @method 修改数据(返回修改的数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件，遍历，与filter类似
     *      @arg {Object} 每个元素
     *      @return 条件
     *   @property {Function} handle 处理函数，接收本条数据的引用，对其修改
     */
    update({ tableName, condition, handle }) {
        let res = [];
        return this.commitDb(tableName, (transaction) => {
            return transaction.openCursor();
        }, "readwrite", (e, resolve) => {
            this.cursorSuccess(e, {
                condition,
                handler: ({ currentValue, cursor }) => {
                    const value = handle(currentValue);
                    res.push(value);
                    cursor.update(value);
                },
                success: () => {
                    resolve(res);
                }
            });
        });
    }
    /**
     * @method 修改某条数据(主键)返回修改的对象
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {String\|Number} value 目标主键值
     *   @property {Function} handle 处理函数，接收本条数据的引用，对其修改
     */
    updateByPrimaryKey({ tableName, value, handle }) {
        return this.commitDb(tableName, (transaction) => {
            return transaction.openCursor();
        }, "readwrite", (e, resolve, store) => {
            const currentValue = e.target.value;
            if (!currentValue) {
                resolve(null);
                return;
            }
            const value = handle(currentValue);
            store.put(value);
            resolve(value);
        });
    }
    /**
     * @method 增加数据
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Object} data 插入的数据
     */
    insert({ tableName, data }) {
        return this.commitDb(tableName, undefined, "readwrite", (_, resolve, store) => {
            data instanceof Array ? data.forEach(v => store.put(v)) : store.put(data);
            resolve();
        });
    }
    /**
     * @method 删除数据(返回删除数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件，遍历，与filter类似
     *      @arg {Object} 每个元素
     *      @return 条件
     */
    delete({ tableName, condition }) {
        let res = [];
        return this.commitDb(tableName, (transaction) => {
            return transaction.openCursor();
        }, "readwrite", (e, resolve) => {
            this.cursorSuccess(e, {
                handler: ({ currentValue, cursor }) => {
                    res.push(currentValue);
                    cursor.delete();
                },
                success: () => {
                    resolve(res);
                }
            });
        });
    }
    /**
     * @method 删除数据(主键)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {String\|Number} value 目标主键值
     */
    deleteByPrimaryKey({ tableName, value }) {
        return this.commitDb(tableName, (transaction) => transaction.delete(value), "readwrite", (e, resolve) => {
            resolve();
        });
    }
    /**
     * @method 打开数据库
     * @returns
     */
    openDb() {
        return new Promise((resolve, reject) => {
            const idb = getIndexedDb();
            const request = idb.open(this.dbName, this.version);
            request.onerror = (e) => {
                reject(e);
            };
            request.onsuccess = (event) => {
                this.db = event.target.reult;
                let task;
                while (task = this.queue.shift()) {
                    task();
                }
                resolve(this);
            };
            request.onupgradeneeded = (e) => {
                this.tableList.forEach((element) => {
                    this.createTable(e.target.result, element);
                });
            };
        });
    }
    /**
     * @method 关闭数据库
     * @param  {[type]} db [数据库名称]
     */
    closeDb() {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    this.db.close();
                    this.db = null;
                    const { dbName, version } = this;
                    removeIndexedDb({ dbName, version });
                    resolve(true);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * @method 删除数据库
     * @param {String}name 数据库名称
     */
    deleteDb(name) {
        return new Promise((resolve, reject) => {
            const idb = getIndexedDb();
            const request = idb.deleteDatabase(name);
            request.onerror = (e) => {
                reject(e);
            };
            request.onsuccess = (e) => {
                resolve(e);
            };
        });
    }
    /**
      * @method 删除表数据
      * @param {String}name 数据库名称
      */
    deleteTable(tableName) {
        return this.commitDb(tableName, (transaction) => {
            return transaction.clear();
        }, "readwrite", (_, resolve) => {
            resolve();
        });
    }
    createTable(idb, { tableName, option, indexs = [] }) {
        if (!idb.objectStoreNames.contains(tableName)) {
            let store = idb.createObjectStore(tableName, option);
            for (let { key, option } of indexs) {
                store.createIndex(key, key, option);
            }
        }
    }
    /**
     * 提交Db请求
     * @param {string} tableName  表名
     * @param {Function} commit 提交具体函数
     * @param {"readwrite" | "readonly"} mode 事物方式
     * @param {Function} backF 游标方法
     */
    commitDb(tableName, commit, mode = "readwrite", backF) {
        return new Promise((resolve, reject) => {
            const task = () => {
                var _a;
                try {
                    if (this.db) {
                        let store = this.db.transaction(tableName, mode).objectStore(tableName);
                        if (!commit) {
                            (_a = backF) === null || _a === void 0 ? void 0 : _a(null, resolve, store);
                            return;
                        }
                        let res = commit(store);
                        res.onsuccess = (e) => {
                            if (backF) {
                                backF(e, resolve, store);
                            }
                            else {
                                resolve(e);
                            }
                        };
                        res.onerror = (e) => {
                            reject(e);
                        };
                    }
                    else {
                        reject(new Error("请开启数据库"));
                    }
                }
                catch (e) {
                    reject(e);
                }
            };
            if (!this.db) {
                this.queue.push(task);
            }
            else {
                task();
            }
        });
    }
    /**
     * @method 游标开启成功,遍历游标
     * @param e 结果集
     * @param param
     *   @property {Function} condition 条件
     *   @property {Function} handler  满足条件的处理方式
     *      @arg {Object}
     *      @property cursor游标
     *      @property currentValue当前值
     *   @property {Function} success  游标遍历完执行的方法
     */
    cursorSuccess(e, { condition, handler, success }) {
        var _a, _b;
        const cursor = e.target.result;
        if (cursor) {
            const currentValue = cursor.value;
            if ((_a = condition) === null || _a === void 0 ? void 0 : _a(currentValue)) {
                handler({ cursor, currentValue });
            }
            cursor.continue();
        }
        else {
            (_b = success) === null || _b === void 0 ? void 0 : _b();
        }
    }
}
exports.IndexedDb = IndexedDb;
