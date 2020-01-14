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

import * as fs from 'fs';
import { StepExecutionResult, STEP_RESULT_STATUS } from './StepExecutionResult';

// Batch status status enum.
export enum BATCH_STATUS {
  STOPPED,
  PROCESSING,
  FINISHED_ERRORS,
  FINISHED_SUCCESSFULLY
}

/**
 * The Class that define all batch execution status.
 */
export class BatchStatus {
  // The batch name.
  private batchName!: String;

  // The current batch execution status.
  private status: BATCH_STATUS = BATCH_STATUS.STOPPED;

  // What was the last loaded record,
  // it could be useful to recover an failed an interrupted execution.
  private lastLoadedRecord!: String;

  // The quantity of processed (not successfully only loaded) records.
  private processedRecords: number = 0;

  // The execution start date in unix number format.
  private startDate!: number;

  // The execution end date in unix number format.
  private endDate!: number;

  // The execution start date in ISO format.
  private startDateISO!: String;

  // The execution end date in ISO format.
  private endDateISO!: String;

  // Execution duration time.
  private duration!: number;

  // Dictionary to get the las step execution result for one record.
  private recordsToStepExecResult: { [recordId: string]: String; } = {};

  // Dictionary to get all the data about one step execution result.
  private stepExecResultToRecords: { [stepExecResultId: string]: StepExecutionResult; } = {};

  /**
   * Update the status adding the last step execution result.
   * @param stepExecResult The execution result.
   */
  public updateAddingStepExecResult(stepExecResult: StepExecutionResult): void {
    // We don't want to save SUCCESSFUL LAST ONES steps executions.
    // We only want to track unfinished executions in the file.
    if (stepExecResult.getStepResultStatus !== STEP_RESULT_STATUS.SUCCESSFUL_LAST_ONE) {
      this.stepExecResultToRecords[stepExecResult.getId.valueOf()] = stepExecResult;
    }

    /**
     * But we will update previous data.
     * For the record, the new step or delete if it is the last one step executed successfully.
     * And delete all non referenced step executions results. Then save the file.
     */
    stepExecResult.getDependentRecords.forEach((item) => {
      const lastStepExecResId = this.recordsToStepExecResult[item.valueOf()];
      if (stepExecResult.getStepResultStatus !== STEP_RESULT_STATUS.SUCCESSFUL_LAST_ONE) {
        this.recordsToStepExecResult[item.valueOf()] = stepExecResult.getId;
      } else {
        delete this.recordsToStepExecResult[item.valueOf()];
      }
      if (lastStepExecResId !== undefined) {
        delete this.stepExecResultToRecords[lastStepExecResId.valueOf()];
      }
    });

    this.save();
  }

  /**
   *  Set the batch name for the status.,
   */
  public set setBatchName(batchName: String) {
    this.batchName = batchName;
  }

  /**
   * Batch execution tasks.
   */
  public startBatchExecution(): void {
    this.status = BATCH_STATUS.PROCESSING;
    this.startDate = Date.now();
    this.startDateISO = (new Date()).toISOString();
    this.save();
  }

  /**
   * Set the last loaded record.
   */
  public set setLastLoadedRecord(lastLoadedRecord: String) {
    this.lastLoadedRecord = lastLoadedRecord;
    this.processedRecords += 1;
    this.save();
  }

  /**
   * End batch execution tasks.
   */
  public endBatchExecution(): void {
    if (Object.keys(this.recordsToStepExecResult).length > 0
      || Object.keys(this.stepExecResultToRecords).length > 0) {
      this.status = BATCH_STATUS.FINISHED_ERRORS;
    } else {
      this.status = BATCH_STATUS.FINISHED_SUCCESSFULLY;
    }

    this.endDate = Date.now();
    this.endDateISO = (new Date()).toISOString();
    this.duration = (Date.now() - this.startDate) / 1000;
    this.save();
  }

  /**
   * Save the status of the current execution in a file.
   */
  private save() {
    fs.writeFileSync(`${this.batchName}-${this.startDateISO}.json`, JSON.stringify(this));
  }

  /**
   * Uses to load a batch execution status from a status file.
   * @param statusPath The path to the status file.
   */
  public static load(statusPath: String): BatchStatus {
    const fileString = fs.readFileSync(statusPath.valueOf()).toString();
    const loadedBatchStatus: BatchStatus = JSON.parse(fileString);
    return loadedBatchStatus;
  }

  /**
   * Get the loaded records of this status.
   */
  public get getProcessedRecords() {
    return this.processedRecords;
  }

  /**
   * Get the status of this status.
   */
  public get getStatus() {
    return this.status;
  }
}
