/** ********************************************************************* */
/*  BatchStatus.ts                                                        */
/** ********************************************************************* */
/*                       This file is part of:                            */
/*                           BATCH ENGINE                                 */
/** ********************************************************************* */
/* Copyright © 2020 Batch Engine contributors (cf. CONTRIBUTORS.md)       */
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

import PersistanceContext from '../persistence/PersistanceContext';
// eslint-disable-next-line import/no-cycle
import MiscellaneousUtils from '../utils/Miscellaneous';
import { BATCH_STATUS } from './BATCH_STATUS';

/**
 * The Class that define all batch execution status.
 */
export default class BatchStatus {
  private persistanceContext: PersistanceContext;

  private batchName!: String;

  private loadedRecords: number = 0;

  private lastLoadedRecordId: String = '';

  private execType: String = 'RUN';

  private status: BATCH_STATUS = BATCH_STATUS.NOT_STARTED;

  private startDate!: number;

  private startDateISO!: String;

  private endDate!: number;

  private endDateISO!: String;

  private duration: number = 0;

  private failedRecords: number = 0;

  private handleError!: Function;

  public constructor(batchName: String,
    persistanceContext: PersistanceContext,
    errorHandler: Function) {
    this.batchName = batchName;
    this.persistanceContext = persistanceContext;
    this.handleError = errorHandler;
  }

  public async startBatchExecution(execType: String, stepsCount: number) {
    await this.persistanceContext.createExecutionPersistanceContext(this.batchName,
      execType,
      stepsCount);
    await this.setBatchName(this.batchName);
    await this.setExecType(execType);
    await this.setStatus(BATCH_STATUS.PROCESSING);
    await this.setStartDate(Date.now());
    await this.setStartDateISO(new Date().toISOString());
  }

  public async endBatchExecution() {
    if (this.failedRecords > 0) {
      await this.setStatus(BATCH_STATUS.FINISHED_WITH_ERRORS);
    } else {
      await this.setStatus(BATCH_STATUS.FINISHED_SUCCESSFULLY);
    }
    await this.setEndDate(Date.now());
    await this.setEndDateISO((new Date()).toISOString());
    await this.calculateDuration();
    this.persistanceContext.closeAllDBs();
  }

  public async addOneToLoadedRecords() {
    try {
      await this.persistanceContext.putBatchStatusSync('loadedRecords',
        (this.loadedRecords + 1)
          .toString());
      this.loadedRecords += 1;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async addOneFailedRecords(failedRecords: number) {
    try {
      await this.persistanceContext.putBatchStatusSync('failedRecords', (this.failedRecords + failedRecords).toString());
      this.failedRecords += failedRecords;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async calculateDuration() {
    try {
      const duration: number = Date.now() - this.startDate;
      await this.persistanceContext.putBatchStatusSync('duration', duration.toString());
      this.duration = duration;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setLastLoadedRecordId(lastLoadedRecordId: string) {
    try {
      await this.persistanceContext.putBatchStatusSync('lastLoadedRecordID', lastLoadedRecordId);
      this.lastLoadedRecordId = lastLoadedRecordId;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setBatchName(batchName: String) {
    try {
      await this.persistanceContext.putBatchStatusSync('batchName', batchName);
      this.batchName = batchName;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setExecType(execType: String) {
    try {
      await this.persistanceContext.putBatchStatusSync('execType', execType);
      this.execType = execType;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setStatus(status: BATCH_STATUS) {
    try {
      await this.persistanceContext.putBatchStatusSync('status', status.toString());
      this.status = status;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setStartDate(startDate: number) {
    try {
      await this.persistanceContext.putBatchStatusSync('startDate', startDate.toString());
      this.startDate = startDate;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setStartDateISO(startDateISO: String) {
    try {
      await this.persistanceContext.putBatchStatusSync('startDateISO', startDateISO.valueOf());
      this.startDateISO = startDateISO;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setEndDate(endDate: number) {
    try {
      await this.persistanceContext.putBatchStatusSync('endDate', endDate.toString());
      this.startDate = endDate;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setEndDateISO(endDateISO: String) {
    try {
      await this.persistanceContext.putBatchStatusSync('endDateISO', endDateISO.valueOf());
      this.startDateISO = endDateISO;
    } catch (err) {
      this.handleError(err);
    }
  }

  public async setDuration(duration: number) {
    try {
      await this.persistanceContext.putBatchStatusSync('duration', duration.toString());
      this.duration = duration;
    } catch (err) {
      this.handleError(err);
    }
  }

  public set setErrorHandler(handle: Function) {
    this.handleError = handle;
  }

  public async load(execName: String) {
    await this.persistanceContext.recoverExecutionPersistanceContext(execName);
    const batchName = await this.persistanceContext.getBatchStatus('batchName');
    const loadedRecords = await this.persistanceContext.getBatchStatus('loadedRecords');
    const lastLoadedRecordId = await this.persistanceContext.getBatchStatus('lastLoadedRecordId ');
    const execType = await this.persistanceContext.getBatchStatus('execType');
    const status = await this.persistanceContext.getBatchStatus('status');
    const startDate = await this.persistanceContext.getBatchStatus('startDate');
    const startDateISO = await this.persistanceContext.getBatchStatus('startDateISO');
    const endDate = await this.persistanceContext.getBatchStatus('endDate');
    const endDateISO = await this.persistanceContext.getBatchStatus('endDateISO');
    const duration = await this.persistanceContext.getBatchStatus('duration');
    const failedRecords = await this.persistanceContext.getBatchStatus('failedRecords');

    if (batchName !== null
      && batchName !== undefined) {
      this.batchName = batchName;
    }
    if (loadedRecords !== null
      && loadedRecords !== undefined) {
      this.loadedRecords = parseInt(loadedRecords.valueOf(), 10);
    }
    if (lastLoadedRecordId !== null
      && lastLoadedRecordId !== undefined) {
      this.lastLoadedRecordId = lastLoadedRecordId;
    }
    if (execType !== null
      && execType !== undefined) {
      this.execType = execType;
    }
    if (status !== null
      && status !== undefined) {
      this.status = MiscellaneousUtils.getBatchStatusFromString(status);
    }
    if (startDate !== null
      && startDate !== undefined) {
      this.startDate = parseInt(startDate.valueOf(), 10);
    }
    if (startDateISO !== null
      && startDateISO !== undefined) {
      this.startDateISO = startDateISO;
    }
    if (endDate !== null
      && endDate !== undefined) {
      this.endDate = parseInt(endDate.valueOf(), 10);
    }
    if (endDateISO !== null
      && endDateISO !== undefined) {
      this.endDateISO = endDateISO;
    }
    if (duration !== null
      && duration !== undefined) {
      this.duration = parseInt(duration.valueOf(), 10);
    }
    if (failedRecords !== null
      && failedRecords !== undefined) {
      this.failedRecords = parseInt(failedRecords.valueOf(), 10);
    }
  }

  public get getLoadedRecords() {
    return this.loadedRecords;
  }

  public get getStatus() {
    return this.status;
  }
}
