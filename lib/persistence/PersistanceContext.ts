/** ********************************************************************* */
/*  PersistanceContext.ts                                                 */
/** ********************************************************************* */
/*                       This file is part of:                            */
/*                           BATCH ENGINE                                 */
/** ********************************************************************* */
/* Copyright © 2020 Batch Engine contributors (cf. CONTRIBUTORS.md).      */
/*                                                                        */
/* Permission is hereby granted, free of charge, to any person obtaining  */
/* a copy of this software and associated documentation files (the        */
/* "Software"), to deal in the Software without restriction, including    */
/* without limitation the rights to use, copy, modify, merge, publish,    */
/* distribute, sublicense, and/or sell copies of the Software, and to     */
/* permit persons to whom the Software is furnished to do so, subject to  */
/* the following conditions:                                              */
/*                                                                        */
/* The above copyright notice and this permission notice shall be         */
/* included in all copies or substantial portions of the Software.        */
/*                                                                        */
/* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,        */
/* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF     */
/* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. */
/* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY   */
/* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,   */
/* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE      */
/* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                 */
/** ********************************************************************* */

import FileUtils from '../utils/FileUtils';
// eslint-disable-next-line import/no-cycle
import BatchStatus from '../core/BatchStatus';

const level = require('level');

// Debug log, used to debug features using env var NODE_DEBUG.
// const debuglog = require('util').debuglog('[BATCH-ENGINE:PERSISTANCE]');

class PersistanceContext {
  private statusDB!: any;

  private recordsDB!: any;

  private stepsResultsDB: any;

  private currentFilePath!: String;


  public async createExecutionPersistanceContext(batchName: String,
    execType: String) {
    this.currentFilePath = `${process.cwd()}/${batchName}-[${execType}]-${(new Date()).toISOString()}`;

    FileUtils.createFolderSync(this.currentFilePath);

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);
    this.stepsResultsDB = level(`${this.currentFilePath}/steps-results`);
    this.openAllDBs();
  }

  public async recoverExecutionPersistanceContext(execFolder: String) {
    this.currentFilePath = `${process.cwd()}/${execFolder}`;

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);

    const stepsQuantity = FileUtils.getFoldersCountSync(this.currentFilePath) - 2;

    for (let i = 1; i <= stepsQuantity; i += 1) {
      this.stepsResultsDB = level(`${this.currentFilePath}/steps-results`);
    }
    this.openAllDBs();
  }

  private openAllDBs(): void {
    this.recordsDB.open();
    this.recordsDB.open();
    this.stepsResultsDB.open();
  }

  public closeAllDBs() {
    this.statusDB.close();
    this.recordsDB.close();
    this.stepsResultsDB.close();
  }

  public async putBatchStatus(key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.statusDB.put(key.valueOf(), value.valueOf(), { sync: false }, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putRecordStatus(key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.recordsDB.put(key.valueOf(), value.valueOf(), { sync: false }, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putStepResult(stepNumber: number, key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.stepsResultsDB.put(key.valueOf(), value.valueOf(),
        { sync: false }, (err: any) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
    });
  }

  public async getBatchStatus(key: String): Promise<String | null | any> {
    return new Promise((resolve, reject) => {
      this.statusDB.get(key, (err: any, value: any) => {
        if (err) {
          if (err.name === 'NotFoundError') {
            resolve(undefined);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getRecordStatus(key: String): Promise<String | null | any> {
    return new Promise((resolve, reject) => {
      this.recordsDB.get(key, (err: any, value: any) => {
        if (err) {
          if (err.name === 'NotFoundError') {
            resolve(undefined);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getStepResultKey(key: String): Promise<String | null | any> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDB.get(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delRecordStatus(key: String): Promise<String | any> {
    return new Promise((resolve, reject) => {
      this.recordsDB.del(key, { sync: false }, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delStepResultKey(stepNumber: number, key: String): Promise<String | any> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDB.del(key, { sync: false }, (err: any, value: String) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async saveAllRecord(status: BatchStatus): Promise<any> {
    return new Promise((resolve, reject) => {
      this.statusDB.batch()
        .put('batchName', status.batchName)
        .put('execType', status.execType)
        .put('status', status.status)
        .put('lastLoadedRecordId', status.lastLoadedRecordId)
        .put('loadedRecords', status.loadedRecords)
        .put('failedRecords', status.failedRecords)
        .put('startDate', status.startDate)
        .put('startDateISO', status.startDateISO)
        .put('endDate', status.endDate)
        .put('endDateISO', status.endDateISO)
        .put('duration', status.duration)
        .write((err: any) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
    });
  }

  public async getAllIncompleteTasks() {
    const tasks: Array<Object> = [];
    return new Promise((resolve) => {
      this.recordsDB.createReadStream()
        .on('data', (data: any) => {
          tasks.push(data);
        })
        .on('end', () => {
          resolve(JSON.parse(JSON
            .stringify(tasks)
            .replace(/\\/g, '')
            .replace(/"{/g, '{')
            .replace(/}"/g, '}')));
        });
    });
  }

  public async getAllIncompleteTasksDetails(tasks: any) {
    const detailedTasks: Array<any> = [];
    const alreadyPut: Array<any> = [];

    for (let i = 0; i < tasks.length; i += 1) {
      if (!alreadyPut.includes(tasks[i].value.id)) {
        // eslint-disable-next-line no-await-in-loop
        detailedTasks.push(await this.getStepResultKey(tasks[i].value.id));
        alreadyPut.push(tasks[i].value.id);
      }
    }

    return JSON.parse(JSON
      .stringify(detailedTasks)
      .replace(/\\/g, '')
      .replace(/"{/g, '{')
      .replace(/}"/g, '}'));
  }

  public generateExecutionResume(output: Object) {
    FileUtils.generateExecutionResume(`${this.currentFilePath.toString()}/execution-resume.json`, JSON.stringify(output, null, 1));
  }
}

// Singleton persistence context.
const persistanceContextSingleton = new PersistanceContext();
export default persistanceContextSingleton;
