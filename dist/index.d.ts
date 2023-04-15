import { IndexedDb, IIndexedDbOption } from "./IndexedDb";
/**
 * 初始化函数
 * @param param
 * @returns
 */
export declare function init({ dbName, version, tables }: IIndexedDbOption): Promise<IndexedDb>;
/**
 * 获取单例对象
 * @param param
 * @returns
 */
export declare function getInstance(param: IIndexedDbOption): IndexedDb;
