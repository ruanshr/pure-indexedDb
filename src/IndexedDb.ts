
export type IIndexedDbOption = {
  dbName: string;
  version: number;
  tables?: DbTable[];
}

export type DbIndex = { key: string, option?: IDBObjectStoreParameters };

export type DbTable = {
  tableName: string;
  option?: IDBObjectStoreParameters;
  indexs?: DbIndex[];
}

export type AtleastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

interface MapCondition {
  equal: (value: any) => IDBKeyRange;
  gt: (lower: any, open?: boolean) => IDBKeyRange;
  lt: (upper: any, open?: boolean) => IDBKeyRange;
  between: (lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) => IDBKeyRange;
}

export interface DbOperate<T> {
  tableName: string;
  key: string;
  data: T | T[];
  value: string | number;
  countCondition: { type: "equal" | "gt" | "lt" | "between", rangeValue: [any, any?, any?, any?] };
  condition(data: T): boolean;
  success(res: T | T[]): void;
  handle(res: T): void;
}

interface ICursorSuccessOption<T> {
  condition?: (data: T) => boolean
  handler: (param: any) => void,
  success?: () => void;
}
/**
 * 获取window.indexedDb
 * @returns 
 */
function getIndexedDb() {
  return window.indexedDB;
}

const indexedDbCache = new Map<string, IndexedDb>();

/**
 * 获取indexedDb
 * @param dbOptions 
 * @returns 
 */
export function getIndexedDbInstance(dbOptions: IIndexedDbOption) {
  const { dbName, version } = dbOptions;
  const key = `${dbName}_${version}`;
  let instance = indexedDbCache.get(key);
  if (!instance) {
    instance = new IndexedDb(dbOptions);
    indexedDbCache.set(key, instance)
  }
  return instance;
}

/**
 * 移除indexedDb
 * @param dbOptions 
 */
function removeIndexedDb(dbOptions: Pick<IIndexedDbOption, "dbName" | "version">) {
  const { dbName, version } = dbOptions;
  const key = `${dbName}_${version}`;
  indexedDbCache.delete(key);
}

export class IndexedDb {
  private dbName: string = ""; // 数据库名称
  private version: number = 1; // 数据库版本
  private tableList: DbTable[] = []; // 表单列表
  private db: IDBDatabase | null = null;
  private queue: (() => void)[] = []; // 事务队列，实例化一次以后下次打开页面时数据库自启动

  constructor(param: IIndexedDbOption) {
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
  queryAll<T>({ tableName }: Pick<DbOperate<T>, "tableName">) {
    let res: T[] = [];
    return this.commitDb<T[]>(tableName, (transaction: IDBObjectStore) => {
      return transaction.openCursor()
    }, "readonly", (e: any, resolve: (data: T[]) => void) => {
      this.cursorSuccess<T>(e, {
        condition: () => true,
        handler: ({ currentValue }) => res.push(currentValue),
        success: () => resolve(res)
      })
    })
  }

  /**
   * @method 查询(返回具体数组)
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {Function} condition 查询的条件
   */
  query<T>({ tableName, condition }: Pick<DbOperate<T>, "condition" | "tableName">) {
    let res: T[] = [];
    return this.commitDb<T[]>(tableName, (transacton: IDBObjectStore) => {
      return transacton.openCursor();
    }, "readonly", (e: any, resolve: (data: T[]) => void) => {
      this.cursorSuccess<T>(e, {
        condition,
        handler: ({ currentValue }: any) => res.push(currentValue),
        success: () => resolve(res)
      })
    })
  }

  /**
  * @method 查询满足key条件的个数(返回满足条件的数字个数)
  * @param {Object}
  *   @property {String} tableName 表名
  *   @property {Number|String} key 查询的key
  *   @property {Object} countCondition 查询条件
  */
  count<T>({ tableName, key, countCondition }: Pick<DbOperate<T>, "key" | "tableName" | "countCondition">) {
    const mapCondition: MapCondition = {
      equal: IDBKeyRange.only,
      gt: IDBKeyRange.lowerBound,
      lt: IDBKeyRange.upperBound,
      between: IDBKeyRange.bound
    }
    return this.commitDb<T>(tableName, (transaction: IDBObjectStore) => {
      return transaction.index(key).count(mapCondition[countCondition.type](...countCondition.rangeValue))
    }, "readonly", (e: any, resolve: (data: T[]) => void) => {
      resolve(e.target.result);
    })
  }

  /**
   * @method 查询数据(更具表具体属性)返回具体某一个
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {Number|String} key 名
   *   @property {Number|String} value 值
   */
  queryByKeyValue<T>({ tableName, key, value }: Pick<DbOperate<T>, "tableName" | "key" | "value">) {
    return this.commitDb<T>(tableName, (transaction: IDBObjectStore) => {
      return transaction.index(key).get(value)
    }, "readonly", (e: any, resolve: (data: T[]) => void) => {
      resolve(e.target.result);
    })
  }

  /**
   * @method 查询数据（主键值）
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {Number|String} value 主键值
   */
  queryByPrimaryKey<T>({ tableName, value }: Pick<DbOperate<T>, "tableName" | "value">) {
    return this.commitDb<T>(tableName, (transaction) => {
      return transaction.get(value)
    }, "readonly", (e: any, resolve: (data: T[]) => void) => {
      resolve(e.target.result);
    })
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
  update<T>({ tableName, condition, handle }: Pick<DbOperate<T>, "tableName" | "condition" | "handle">) {
    let res: T[] = [];
    return this.commitDb(tableName, (transaction) => {
      return transaction.openCursor();
    }, "readwrite", (e: any, resolve: (data: T[]) => void) => {
      this.cursorSuccess<T>(e, {
        condition,
        handler: ({ currentValue, cursor }: any) => {
          const value = handle(currentValue);
          res.push(value as any);
          cursor.update(value)
        },
        success: () => {
          resolve(res);
        }
      })
    })
  }

  /**
   * @method 修改某条数据(主键)返回修改的对象
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {String\|Number} value 目标主键值
   *   @property {Function} handle 处理函数，接收本条数据的引用，对其修改
   */
  updateByPrimaryKey<T>({ tableName, value, handle }: Pick<DbOperate<T>, "tableName" | "value" | "handle">) {
    return this.commitDb<T>(tableName, (transaction) => {
      return transaction.openCursor()
    }, "readwrite", (e: any, resolve: (data: T | null) => void, store: IDBObjectStore) => {
      const currentValue = e.target.value;
      if (!currentValue) {
        resolve(null);
        return;
      }
      const value = handle(currentValue);
      store.put(value);
      resolve(value as any);
    })
  }

  /**
   * @method 增加数据
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {Object} data 插入的数据
   */
  insert<T>({ tableName, data }: Pick<DbOperate<T>, "tableName" | "data">) {
    return this.commitDb<T>(tableName, undefined, "readwrite", (_: any, resolve: () => void, store: IDBObjectStore) => {
      data instanceof Array ? data.forEach(v => store.put(v)) : store.put(data);
      resolve();
    })
  }

  /**
   * @method 删除数据(返回删除数组)
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {Function} condition 查询的条件，遍历，与filter类似
   *      @arg {Object} 每个元素
   *      @return 条件
   */
  delete<T>({ tableName, condition }: Pick<DbOperate<T>, "tableName" | "condition">) {
    let res: T[] = [];
    return this.commitDb<T>(tableName, (transaction) => {
      return transaction.openCursor();
    }, "readwrite", (e: any, resolve: (data: T[]) => void) => {
      this.cursorSuccess<T>(e, {
        handler: ({ currentValue, cursor }: any) => {
          res.push(currentValue);
          cursor.delete();
        },
        success: () => {
          resolve(res);
        }
      })
    })
  }

  /**
   * @method 删除数据(主键)
   * @param {Object}
   *   @property {String} tableName 表名
   *   @property {String\|Number} value 目标主键值
   */
  deleteByPrimaryKey<T>({ tableName, value }: Pick<DbOperate<T>, "tableName" | "value">) {
    return this.commitDb<T>(tableName, (transaction: IDBObjectStore) => transaction.delete(value),
      "readwrite", (e: any, resolve: () => void) => {
        resolve();
      })
  }

  /**
   * @method 打开数据库
   * @returns 
   */
  openDb() {
    return new Promise<IndexedDb>((resolve, reject) => {
      const idb = getIndexedDb();
      const request = idb.open(this.dbName, this.version);
      request.onerror = (e) => {
        reject(e)
      }
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        let task: () => void;
        while (task = this.queue.shift() as any) {
          task()
        }
        resolve(this);
      }

      request.onupgradeneeded = (e: any) => {
        this.tableList.forEach((element: DbTable) => {
          this.createTable(e.target.result, element);
        })
      }
    })
  }

  /**
   * @method 关闭数据库
   * @param  {[type]} db [数据库名称]
   */
  closeDb() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          this.db!.close();
          this.db = null;
          const { dbName, version } = this;
          removeIndexedDb({ dbName, version });
          resolve(true);
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * @method 删除数据库
   * @param {String}name 数据库名称
   */
  deleteDb(name: string) {
    return new Promise((resolve, reject) => {
      const idb = getIndexedDb();
      const request = idb.deleteDatabase(name);
      request.onerror = (e) => {
        reject(e);
      }
      request.onsuccess = (e) => {
        resolve(e);
      }
    })
  }

  /**
    * @method 删除表数据
    * @param {String}name 数据库名称
    */
  deleteTable(tableName: string) {
    return this.commitDb(tableName, (transaction: IDBObjectStore) => {
      return transaction.clear();
    }, "readwrite", (_: any, resolve: () => void) => {
      resolve();
    })
  }

  private createTable(idb: any, { tableName, option, indexs = []}: DbTable) {
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
  private commitDb<T>(
    tableName: string,
    commit?: (transaction: IDBObjectStore) => IDBRequest<any>,
    mode: IDBTransactionMode = "readwrite",
    backF?: (request: any, resolve: any, store: IDBObjectStore) => void
  ) {
    return new Promise((resolve, reject) => {
      const task = () => {
        try {
          if (this.db) {
            let store = this.db.transaction(tableName, mode).objectStore(tableName);
            if (!commit) {
              backF?.(null, resolve, store)
              return;
            }
            let res = commit(store);
            res!.onsuccess = (e: any) => {
              if (backF) {
                backF(e, resolve, store);
              } else {
                resolve(e);
              }
            }
            res!.onerror = (e: any) => {
              reject(e);
            }
          } else {
            reject(new Error("请开启数据库"))
          }
        } catch (e) {
          reject(e)
        }
      }

      if (!this.db) {
        this.queue.push(task);
      } else {
        task();
      }

    })
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
  private cursorSuccess<T>(e: any, { condition, handler, success }: ICursorSuccessOption<T>): void {
    const cursor: IDBCursorWithValue = e.target.result;
    if (cursor) {
      const currentValue = cursor.value;
      if (condition?.(currentValue)) {
        handler({ cursor, currentValue });
      }
      cursor.continue();
    } else {
      success?.();
    }
  }

}