/** ********************************************************************* */
/*  BatchJob.ts                                                           */
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

// Set max classes per file 2 to allow nested builder class.
/* eslint max-classes-per-file: ["error", 2] */

// OS module to get cpu quantity.
import * as OS from 'os';
import { StepExecutionResult, STEP_RESULT_STATUS } from './StepExecutionResult';
import BatchStep from './BatchStep';
import BatchRecord from './BatchRecord';
import BatchStatus from './BatchStatus';
// Debug log, used to debug features using env var NODE_DEBUG.
const debuglog = require('util').debuglog('[BATCH-ENGINE:CORE]');

/**
 *  Batch Engine main class. This class controls all the execution logic.
 */
export default abstract class BatchJob {
  // Attribute used to set max available concurrency.
  // It will be set up as the number of CPU * 2 by default.
  private maxConcurrency: number = OS.cpus().length * 2;

  // Attribute used to store the number o records that are being processed at execution time.
  private currentConcurrency: number = 0;

  // Attribute used to store the steps chain.
  // It uses a Chain of Responsibility pattern (https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern).
  private stepsChain!: BatchStep;

  // Attribute used to store the batch execution status at execution time.
  // It has a lot important data used to understand how to recover a failed batch execution.
  private status!: BatchStatus;

  /**
   *  Class used by framework clients to build new BatchJobs easily.
   *  It uses Builder pattern (https://en.wikipedia.org/wiki/Builder_pattern).
   */
  static Builder = class Builder<T extends BatchJob> {
    // JS doesn't know nothing about types, so we have to store the Class Type
    // to do a new of that class at runtime.
    // Anyway we have to use <T> to say to TypeScript what type do we want.
    private batchJob: T;

    /**
     * BatchJob Builder constructor.
     * @param TestType Used to define the new type in runtime.
     */
    constructor(private TestType: new () => T) {
      this.batchJob = new this.TestType();
      this.batchJob.status = new BatchStatus();
    }

    /**
     * Set name in Batch Job.
     * @param batchName The batch name.
     */
    public name(batchName: String) {
      this.batchJob.status.setBatchName = batchName;
      return this;
    }

    /**
     * Set max concurrency in BatchJob.
     * @param concurrency Max concurrency.
     */
    public concurrency(concurrency: number): Builder<T> {
      this.batchJob.maxConcurrency = concurrency;
      return this;
    }

    /**
     * Add a new step to the chain.
     * @param step The step that you want to add.
     */
    public addStep(step: BatchStep) {
      if (this.batchJob.stepsChain === undefined) {
        step.setNumber(1);
        this.batchJob.stepsChain = step;
      } else {
        step.setNumber(this.batchJob.stepsChain.getStepsCount() + 1);
        this.batchJob.stepsChain.addSuccessor(step);
      }
      return this;
    }

    /**
     * Build the BatchJob after set up all the attributes.
     */
    public build(): T {
      return this.batchJob;
    }
  };

  /**
   *  Method used to start batch execution.
   */
  public run() : void{
    // Do common and client defined pre all exec tasks.
    this.doPreBatchCommonTasks();
    this.doPreBatchTasks();
    // Start async all the workers until max concurrency.
    for (let i = 0; i < this.maxConcurrency; i += 1) {
      this.doNextObj();
    }
  }

  /**
   *  Execute common pre batch tasks.
   */
  private doPreBatchCommonTasks(): void {
    this.status.startBatchExecution();
  }

  /*
   * Abstract method to be defined by clients to put some logic
   * to be executed before batch execution starts.
   */
  protected abstract doPreBatchTasks(): void;

  /**
   * Start one worker that will process all the steps of the chain.
   * This should be the only async point.
   */
  public async doNextObj(): Promise<any> {
    // Check (https://eslint.org/docs/rules/no-async-promise-executor).
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async () => {
      // Get new record.
      const batchRecord: BatchRecord | null = this.getNext();
      // Check available currency and batch record.
      if (this.isConcurrencyAvailable()
                && batchRecord != null) {
        // Do pre and post step common tasks and execute the step chain.
        this.doPreCommonRecordTasks(batchRecord);
        debuglog(`EXECUTING-NEW-RECORD (CONCURRENCY: ${this.currentConcurrency}): `, batchRecord);
        await this.executeRecordSteps(batchRecord);
        this.doPostCommonRecordTasks();
      // If we don't have more records to process and the concurrency is 0,
      // the batch process has finished.
      } else if (this.currentConcurrency <= 0
                && batchRecord === null) {
        // We have to resume accumulated records in aggregators and update exec status,
        // using record exec result.
        this.status.updateAddingStepExecResult(await this.stepsChain.resume());
        this.doPostCommonBatchTasks();
        this.doPostBatchTasks();
      }
    });
  }

  /**
   * Abstract method to be implemented for client, It should return a new record
   *  from the source that the client wants to get for batch execution.
   *  It has to return a null when there are no more records.
   */
  protected abstract getNext(): BatchRecord | null;

  /**
   * Method to check if is there concurrency available to start a new record execution.
   */
  private isConcurrencyAvailable() {
    return this.currentConcurrency < this.maxConcurrency;
  }

  /**
   * Common pre record execution tasks.
   * @param batchRecord The bach record to be executed.
   */
  private doPreCommonRecordTasks(batchRecord: BatchRecord) {
    // Increment concurrency and save the record id as the last record loaded in status.
    this.currentConcurrency += 1;
    this.status.setLastLoadedRecord = batchRecord.getId;
  }

  /**
   * Execute the steps for that record.
   * @param batchRecord
   */
  private async executeRecordSteps(batchRecord: BatchRecord) {
    // Build a bootstrap step result to start the steps chain.
    const bootStrapStepResult = new StepExecutionResult('Bootstrap',
      0,
      STEP_RESULT_STATUS.SUCCESSFUL,
      [batchRecord.getId],
      null,
      batchRecord.getObject);
    // Have to update exec status, using record exec result.
    const returnedResult : StepExecutionResult = await this.stepsChain.execute(bootStrapStepResult);
    this.status.updateAddingStepExecResult(returnedResult);

    if (returnedResult.getStepResultStatus === STEP_RESULT_STATUS.FAILED
      || returnedResult.getStepResultStatus === STEP_RESULT_STATUS.BAD_INPUT) {
      this.handleError(returnedResult.getError);
    }
  }

  /**
   * Common post record execution tasks.
   */
  private doPostCommonRecordTasks() {
    // Decrement concurrency and load de next record.
    this.currentConcurrency -= 1;
    this.doNextObj();
  }

  /**
   * Post batch execution tasks to be implemented by client like close a file.
   */
  protected abstract doPostBatchTasks(): void;

  /**
   * Common ended batch tasks.
   */
  private doPostCommonBatchTasks(): void {
    // Update batch exec status and debug log.
    this.status.endBatchExecution();
    debuglog('BATCH-EXEC-FINISHED', this.status);
  }

  /**
   * To be implemented for clients to handle errors during step execution.
   * @param error The error.
   */
  protected abstract handleError(error: Error) : void;
}
