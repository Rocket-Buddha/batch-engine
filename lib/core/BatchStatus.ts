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

// eslint-disable-next-line import/no-cycle
import persistanceContext from '../persistence/PersistanceContext';
import { BATCH_STATUS } from './BATCH_STATUS';

/**
 * The Class that define all batch execution status.
 */
export default class BatchStatus {
  public batchName!: String;

  public loadedRecords: number = 0;

  public lastLoadedRecordId: String = '';

  public execType: String = 'RUN';

  public status: BATCH_STATUS = BATCH_STATUS.NOT_STARTED;

  public startDate: number = 0;

  public startDateISO: String = '';

  public endDate: number = 0;

  public endDateISO: String = '';

  public failedRecords: number = 0;

  public duration: number = 0;

  public constructor(batchName: String) {
    this.batchName = batchName;
    this.save();
  }

  public startBatchExecution(execType: String) {
    persistanceContext.createExecutionPersistanceContext(this.batchName,
      execType);
    this.execType = execType;
    this.status = BATCH_STATUS.PROCESSING_INJECTING;
    this.startDate = Date.now();
    this.startDateISO = new Date().toISOString();
    this.save();
  }

  public endBatchExecution() {
    if (this.failedRecords > 0) {
      this.status = BATCH_STATUS.FINISHED_WITH_ERRORS;
    } else {
      this.status = BATCH_STATUS.FINISHED_SUCCESSFULLY;
    }
    this.endDate = Date.now();
    this.endDateISO = new Date().toISOString();
    this.duration = (this.endDate - this.startDate) / 1000;
    this.save();
    this.getExecutionResume();
  }

  public static exit() {
    persistanceContext.closeAllDBs();
  }

  public addOneToLoadedRecords() {
    this.loadedRecords += 1;
  }

  public addOneFailedRecords(failedRecords: number) {
    this.failedRecords += failedRecords;
  }

  public async save() {
    persistanceContext.saveAllRecord(this);
  }

  public async getExecutionResume() {
    const incompleteTasks: any = await persistanceContext.getAllIncompleteTasks();
    const incompleteTasksDetails = await persistanceContext
      .getAllIncompleteTasksDetails(incompleteTasks);

    const output = {
      batchStatus: this,
      incompleteTasks,
      incompleteTasksDetails,
    };
    persistanceContext.generateExecutionResume(output);
  }
}
