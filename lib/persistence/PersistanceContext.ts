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

const level = require('level');

// Debug log, used to debug features using env var NODE_DEBUG.
// const debuglog = require('util').debuglog('[BATCH-ENGINE:PERSISTANCE]');

/**
 * Class that define the persistance context for executions.
 */
export default class PersistanceContext {
  // DB that saves bath execution status.
  private statusDB!: any;

  // DB that saves the record id and the step result id (UUID).
  private recordsDB!: any;

  // The complete step execution result.
  private stepsResultsDB: any;

  // The place where all the execution context is persisted.
  private currentFilePath!: String;

  // Cache of records DB.
  private recordsDBCache: { [key: string] : Object; } = {};

  /**
   * Create an execution persistance context.
   * @param batchName
   * @param execType
   */
  public async createExecutionPersistanceContext(batchName: String,
    execType: String) {
    this.currentFilePath = `${process.cwd()}/${batchName}-[${execType}]-${(new Date()).toISOString()}`;

    FileUtils.createFolderSync(this.currentFilePath);

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);
    this.stepsResultsDB = level(`${this.currentFilePath}/steps-results`);
    this.openAllDBs();
  }

  /**
   * Recover a previous execution context.
   * @param execFolder The folder path.
   */
  public async recoverExecutionPersistanceContext(execFolder: String) {
    this.currentFilePath = `${process.cwd()}/${execFolder}`;

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);
    this.stepsResultsDB = level(`${this.currentFilePath}/steps-results`);

    await this.openAllDBs();
  }

  /**
   * Open all DB for the persistance context.
   */
  private async openAllDBs() {
    let statusDBFlag = false;
    let recordsDBFlag = false;
    let stepsResultsDBFlag = false;
    return new Promise((resolve, reject) => {
      this.statusDB.open((err: any) => {
        if (err) {
          reject(err);
        } else {
          statusDBFlag = true;
          if (statusDBFlag && recordsDBFlag && stepsResultsDBFlag) {
            resolve();
          }
        }
      });
      this.recordsDB.open((err: any) => {
        if (err) {
          reject(err);
        } else {
          recordsDBFlag = true;
          if (statusDBFlag && recordsDBFlag && stepsResultsDBFlag) {
            resolve();
          }
        }
      });
      this.stepsResultsDB.open((err: any) => {
        if (err) {
          reject(err);
        } else {
          stepsResultsDBFlag = true;
          if (statusDBFlag && recordsDBFlag && stepsResultsDBFlag) {
            resolve();
          }
        }
      });
    });
  }

  /**
   * Closes all DBs from the persistance context.
   */
  public closeAllDBs() {
    this.statusDB.close();
    this.recordsDB.close();
    this.stepsResultsDB.close();
  }

  /**
   * Put a batch a batch status key.
   * @param key The key, for instance "failedRecords".
   * @param value The value, for instance "100".
   */
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

  /**
   * Put a batch record status.
   * @param key The record id.
   * @param value The last step execution result that has this record id as dependant record.
   */
  public async putRecordStatus(key: String, value: Object) {
    // Cache the key, value.
    this.recordsDBCache[key.toString()] = value;
    return new Promise((resolve, reject) => {
      this.recordsDB.put(key.valueOf(),
        JSON.stringify(value).valueOf(),
        { sync: false },
        (err: any) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
    });
  }

  /**
   * Put an step execution result.
   * @param key The step execution result UUID.
   * @param value All the steep execution result object.
   */
  public async putStepResult(key: String, value: String) {
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

  /**
   * Get a key from the batch status.
   * @param key The key, for instance "duration".
   */
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

  /**
   * Get the record last step execution result.
   * @param key
   */
  public getRecordStatus(key: String): any {
    return this.recordsDBCache[key.toString()];
  }

  /**
   * Get an step execution result.
   * @param key The UUID of that step execution result.
   */
  public async getStepResultKey(key: String): Promise<String | null | any> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDB.get(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(JSON.parse(JSON
          .stringify(value)
          .replace(/\\/g, '')
          .replace(/"{/g, '{')
          .replace(/}"/g, '}')));
      });
    });
  }

  /**
   * Delete a record from records db.
   * @param key The record id.
   */
  public async delRecordStatus(key: String): Promise<String | any> {
    delete this.recordsDBCache[key.toString()];
    return new Promise((resolve, reject) => {
      this.recordsDB.del(key, { sync: false }, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  /**
   * Delete an step execution result.
   * @param key The step execution number result.
   */
  public async delStepResultKey(key: String): Promise<String | any> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDB.del(key, { sync: false }, (err: any, value: String) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  /**
   * Save all records from batch status in batch mode.
   * @param status
   */
  public async saveAllRecord(status: any): Promise<any> {
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

  /**
   * Get all the incomplete records.
   */
  public async getAllIncompleteRecords() {
    const records: Array<Object> = [];
    return new Promise((resolve) => {
      this.recordsDB.createReadStream()
        .on('data', (data: any) => {
          records.push(data);
        })
        .on('end', () => {
          resolve(JSON.parse(JSON
            .stringify(records)
            .replace(/\\/g, '')
            .replace(/"{/g, '{')
            .replace(/}"/g, '}')));
        });
    });
  }

  /**
   * Get all the incomplete records details from step execution results DB.
   * @param tasks
   */
  public async getAllIncompleteRecordsDetails(tasks: any) {
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

  /**
   * Generate an execution resume.
   * @param output The execution resume object.
   */
  public generateExecutionResume(output: Object) {
    FileUtils.generateExecutionResume(`${this.currentFilePath.toString()}/execution-resume.json`, JSON.stringify(output, null, 1));
  }

  /**
   * Returns an stream to incomplete records DB.
   */
  public getIncompleteRecordsStream() {
    return this.recordsDB.createReadStream();
  }
}
