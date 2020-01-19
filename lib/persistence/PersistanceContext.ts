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

export default class PersistanceContext {
  private statusDB!: any;

  private recordsDB!: any;

  private stepsResultsDBs: { [stepNumber: number]: any; } = {};

  private currentFilePath!: String;

  public async createExecutionPersistanceContext(batchName: String,
    execType: String,
    stepsQuantity: number) {
    this.currentFilePath = `${process.cwd()}/${batchName}-[${execType}]-${(new Date()).toISOString()}`;

    await FileUtils.createFolder(this.currentFilePath);

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);

    for (let i = 1; i <= stepsQuantity; i += 1) {
      this.stepsResultsDBs[i] = level(`${this.currentFilePath}/step-${i}`);
    }
    this.openAllDBs();
  }

  public async recoverExecutionPersistanceContext(execFolder: String) {
    this.currentFilePath = `${process.cwd()}/${execFolder}`;

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);

    const stepsQuantity = await FileUtils.getFoldersCount(this.currentFilePath) - 2;

    for (let i = 1; i <= stepsQuantity; i += 1) {
      this.stepsResultsDBs[i] = level(`${this.currentFilePath}/step-${i}`);
    }
    this.openAllDBs();
  }

  private openAllDBs(): void {
    this.recordsDB.open();
    this.recordsDB.open();
    // eslint-disable-next-line no-restricted-syntax
    for (const key in this.stepsResultsDBs) {
      if (Object.prototype.hasOwnProperty.call(this.stepsResultsDBs, key)) {
        this.stepsResultsDBs[key].open();
      }
    }
  }

  public closeAllDBs(): void {
    this.statusDB.close();
    this.recordsDB.close();
    // eslint-disable-next-line no-restricted-syntax
    for (const key in this.stepsResultsDBs) {
      if (Object.prototype.hasOwnProperty.call(this.stepsResultsDBs, key)) {
        this.stepsResultsDBs[key].close();
      }
    }
  }

  public async putBatchStatusSync(key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.statusDB.put(key.valueOf(), value.valueOf(), (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putRecordStatusSync(key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.recordsDB.put(key.valueOf(), value.valueOf(), (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putStepResultSync(stepNumber: number, key: String, value: String) {
    return new Promise((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].put(key.valueOf(), value.valueOf(), (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async getBatchStatus(key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.statusDB.get(key, (err: any, value: any) => {
        if (err) {
          if (err.name === 'NotFoundError') {
            resolve(null);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getRecordStatus(key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.recordsDB.get(key, (err: any, value: any) => {
        if (err) {
          if (err.name === 'NotFoundError') {
            resolve(null);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getStepResultKey(stepNumber: number, key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].get(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delRecordStatus(key: String): Promise<String> {
    return new Promise((resolve, reject) => {
      this.recordsDB.del(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delStepResultKey(stepNumber: number, key: String): Promise<String> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].del(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }
}
