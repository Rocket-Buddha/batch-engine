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

import { BATCH_STATUS } from './BATCH_STATUS';
import PersistanceContext from '../persistence/PersistanceContext';

/**
 * The Class that define all batch execution status.
 */
export default class BatchStatus {
  // Attribute to set the batch job name to be printed in resume.
  public batchName!: String;

  // Quantity of loaded records from the source.
  public loadedRecords: number = 0;

  // The last loaded record id.
  public lastLoadedRecordId: String = '';

  // The execution type, could be RUN, RETRY, etc...
  public execType: String = 'RUN';

  // The current batch status.
  public status: BATCH_STATUS = BATCH_STATUS.NOT_STARTED;

  // Batch execution start date in ms unix.
  public startDate: number = 0;

  // Batch execution start date in ms ISO.
  public startDateISO: String = '';

  // Batch execution end date in ms unix.
  public endDate: number = 0;

  // Batch execution end date in ms ISO.
  public endDateISO: String = '';

  // Quantity current failed records.
  public failedRecords: number = 0;

  // Total duration of batch execution.
  // Will be updated at the end.
  public duration: number = 0;

  // Limit failed records to print in execution-resume.json file.
  public failedRecordsResumeLimit: number = 10000;

  // Current persistance context.
  private persistanceContext!: PersistanceContext;

  /**
   * Default constructor
   * @param batchName The Job name.
   */
  public constructor(batchName: String) {
    this.batchName = batchName;
  }

  /**
   * Method used to start execution.
   * @param execType The execution type string.
   */
  public startBatchExecution(execType: String) {
    if (this.persistanceContext !== undefined) {
      this.persistanceContext.createExecutionPersistanceContext(this.batchName,
        execType);
    } else {
      throw (new Error('No persistance context assigned to the BatchStatus'));
    }
    this.execType = execType;
    this.status = BATCH_STATUS.PROCESSING_INJECTING;
    this.startDate = Date.now();
    this.startDateISO = new Date().toISOString();
    this.save();
  }

  /**
   * Method used to finish the batch execution.
   */
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
    if (this.failedRecords < this.failedRecordsResumeLimit) {
      this.getCompleteExecutionResume();
    } else {
      this.getExecutionResume();
    }
  }

  /**
   * Method used to exit the program.
   */
  public exit() {
    this.persistanceContext.closeAllDBs();
  }

  /**
   * Method used to add a loaded record.
   */
  public addOneToLoadedRecords() {
    this.loadedRecords += 1;
  }

  /**
   * Method used to add more than 1 loaded record.
   * @param recordsNumber The number of records.
   */
  public addLoadedRecords(recordsNumber: number) {
    this.loadedRecords += recordsNumber;
  }

  /**
   * Method used to add failed records to the status.
   * @param failedRecords
   */
  public addFailedRecords(failedRecords: number) {
    this.failedRecords += failedRecords;
  }

  /**
   * Method used to save in persistance context the status.
   */
  public async save() {
    this.persistanceContext.saveAllRecord(this);
  }

  /**
   * Method to generate the complete execution resume file.
   */
  public async getCompleteExecutionResume() {
    const incompleteTasks: any = await this.persistanceContext.getAllIncompleteRecords();
    const incompleteTasksDetails = await this.persistanceContext
      .getAllIncompleteRecordsDetails(incompleteTasks);

    const output = {
      batchStatus: this.getNiceObjectToLog(),
      incompleteTasks,
      incompleteTasksDetails,
    };
    this.persistanceContext.generateExecutionResume(output);
  }

  /**
   * Get a bounded execution resume.
   */
  public async getExecutionResume() {
    const output = {
      batchStatus: this.getNiceObjectToLog(),
      incompleteTasks: `More than ${this.failedRecordsResumeLimit} defined limit records to show. Check records db using a LevelDB client.`,
      incompleteTasksDetails: `More than ${this.failedRecordsResumeLimit} defined limit records to show. Check steps db using a LevelDB client.`,
    };
    this.persistanceContext.generateExecutionResume(output);
  }

  /**
   * Set the persistance context.
   * @param context The persistance context.
   */
  public setPersistanceContext(context: PersistanceContext) {
    this.persistanceContext = context;
  }

  /**
   * Get a nice object to log in debugger.
   */
  getNiceObjectToLog(): Object {
    return {
      batchName: this.batchName,
      loadedRecords: this.loadedRecords,
      lastLoadedRecordId: this.lastLoadedRecordId,
      failedRecords: this.failedRecords,
      execType: this.execType,
      status: this.status,
      startDate: this.startDateISO,
      endDate: this.endDateISO,
      duration: `${this.duration} seconds`,
    };
  }
}
