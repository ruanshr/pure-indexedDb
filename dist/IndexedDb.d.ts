export declare type IIndexedDbOption = {
    dbName: string;
    version: number;
    tables?: DbTable[];
};
export declare type DbIndex = {
    key: string;
    option?: IDBObjectStoreParameters;
};
export declare type DbTable = {
    tableName: string;
    option?: IDBObjectStoreParameters;
    indexs?: DbIndex[];
};
export declare type AtleastOne<T, U = {
    [K in keyof T]: Pick<T, K>;
}> = Partial<T> & U[keyof U];
export interface DbOperate<T> {
    tableName: string;
    key: string;
    data: T | T[];
    value: string | number;
    countCondition: {
        type: "equal" | "gt" | "lt" | "between";
        rangeValue: [any, any?, any?, any?];
    };
    condition(data: T): boolean;
    success(res: T | T[]): void;
    handle(res: T): void;
}
/**
 * 获取indexedDb
 * @param dbOptions
 * @returns
 */
export declare function getIndexedDbInstance(dbOptions: IIndexedDbOption): IndexedDb;
export declare class IndexedDb {
    private dbName;
    private version;
    private tableList;
    private db;
    private queue;
    constructor(param: IIndexedDbOption);
    /**
     * @method 查询
     * @param {Object}
     *   @property {String} tableName 表名
     */
    queryAll<T>({ tableName }: Pick<DbOperate<T>, "tableName">): Promise<unknown>;
    /**
     * @method 查询(返回具体数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件
     */
    query<T>({ tableName, condition }: Pick<DbOperate<T>, "condition" | "tableName">): Promise<unknown>;
    /**
    * @method 查询满足key条件的个数(返回满足条件的数字个数)
    * @param {Object}
    *   @property {String} tableName 表名
    *   @property {Number|String} key 查询的key
    *   @property {Object} countCondition 查询条件
    */
    count<T>({ tableName, key, countCondition }: Pick<DbOperate<T>, "key" | "tableName" | "countCondition">): Promise<unknown>;
    /**
     * @method 查询数据(更具表具体属性)返回具体某一个
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Number|String} key 名
     *   @property {Number|String} value 值
     */
    queryByKeyValue<T>({ tableName, key, value }: Pick<DbOperate<T>, "tableName" | "key" | "value">): Promise<unknown>;
    /**
     * @method 查询数据（主键值）
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Number|String} value 主键值
     */
    queryByPrimaryKey<T>({ tableName, value }: Pick<DbOperate<T>, "tableName" | "value">): Promise<unknown>;
    /**
     * @method 修改数据(返回修改的数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件，遍历，与filter类似
     *      @arg {Object} 每个元素
     *      @return 条件
     *   @property {Function} handle 处理函数，接收本条数据的引用，对其修改
     */
    update<T>({ tableName, condition, handle }: Pick<DbOperate<T>, "tableName" | "condition" | "handle">): Promise<unknown>;
    /**
     * @method 修改某条数据(主键)返回修改的对象
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {String\|Number} value 目标主键值
     *   @property {Function} handle 处理函数，接收本条数据的引用，对其修改
     */
    updateByPrimaryKey<T>({ tableName, value, handle }: Pick<DbOperate<T>, "tableName" | "value" | "handle">): Promise<unknown>;
    /**
     * @method 增加数据
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Object} data 插入的数据
     */
    insert<T>({ tableName, data }: Pick<DbOperate<T>, "tableName" | "data">): Promise<unknown>;
    /**
     * @method 删除数据(返回删除数组)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {Function} condition 查询的条件，遍历，与filter类似
     *      @arg {Object} 每个元素
     *      @return 条件
     */
    delete<T>({ tableName, condition }: Pick<DbOperate<T>, "tableName" | "condition">): Promise<unknown>;
    /**
     * @method 删除数据(主键)
     * @param {Object}
     *   @property {String} tableName 表名
     *   @property {String\|Number} value 目标主键值
     */
    deleteByPrimaryKey<T>({ tableName, value }: Pick<DbOperate<T>, "tableName" | "value">): Promise<unknown>;
    /**
     * @method 打开数据库
     * @returns
     */
    openDb(): Promise<IndexedDb>;
    /**
     * @method 关闭数据库
     * @param  {[type]} db [数据库名称]
     */
    closeDb(): Promise<unknown>;
    /**
     * @method 删除数据库
     * @param {String}name 数据库名称
     */
    deleteDb(name: string): Promise<unknown>;
    /**
      * @method 删除表数据
      * @param {String}name 数据库名称
      */
    deleteTable(tableName: string): Promise<unknown>;
    private createTable;
    /**
     * 提交Db请求
     * @param {string} tableName  表名
     * @param {Function} commit 提交具体函数
     * @param {"readwrite" | "readonly"} mode 事物方式
     * @param {Function} backF 游标方法
     */
    private commitDb;
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
    private cursorSuccess;
}
