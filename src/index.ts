import { getIndexedDbInstance, IndexedDb, IIndexedDbOption } from "./IndexedDb";

/**
 * 初始化函数
 * @param param 
 * @returns 
 */
export function init({ dbName, version = 1, tables = [] }: IIndexedDbOption): Promise<IndexedDb> {
  const db = getInstance({
    dbName,
    version,
    tables
  });
  return db.openDb();
}

/**
 * 获取单例对象
 * @param param 
 * @returns 
 */
export function getInstance(param: IIndexedDbOption): IndexedDb {
  const { dbName, version = 1, tables = [] } = param;
  const db = getIndexedDbInstance({
    dbName,
    version,
    tables
  });
  return db;
}