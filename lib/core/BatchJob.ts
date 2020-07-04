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
import { StepExecutionResult, STEP_RESULT_STATUS } from './StepExecutionResult';
import BatchStep from './BatchStep';
import BatchRecord from './BatchRecord';
import BatchStatus from './BatchStatus';
import { BATCH_STATUS } from './BATCH_STATUS';
import recoveredPersistanceContextSingleton from '../persistence/RecoveredPersistanceContext';
// import MiscellaneousUtils from '../utils/Miscellaneous';
// Debug log, used to debug features using env var NODE_DEBUG.
const debuglog = require('util').debuglog('[BATCH-ENGINE:CORE]');

/**
 *  Batch Engine main class. This class controls all the execution logic.
 */
export default abstract class BatchJob {
  private concurrencyMultiplier: number = 0;

  private maxConcurrentRecords: number = 0;

  // Attribute used to store the number o records that are being processed at execution time.
  private currentConcurrency: number = 0;

  // Attribute used to store the steps chain.
  // It uses a Chain of Responsibility pattern (https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern).
  private stepsChain!: BatchStep;

  private batchStatus!: BatchStatus;


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
    }

    /**
     * Set name in Batch Job.
     * @param batchName The batch name.
     */
    public name(batchName: String) {
      if (this.batchJob.batchStatus !== null
        && this.batchJob.batchStatus !== undefined) {
        this.batchJob.batchStatus.batchName = batchName;
        return this;
      }
      this.batchJob.batchStatus = new BatchStatus(batchName);
      return this;
    }


    public executionResumeLimit(limit: number) {
      if (this.batchJob.batchStatus !== null
        && this.batchJob.batchStatus !== undefined) {
        this.batchJob.batchStatus.failedRecordsResumeLimit = limit;
        return this;
      }
      this.batchJob.batchStatus = new BatchStatus('my-batch-job');
      this.batchJob.batchStatus.failedRecordsResumeLimit = limit;
      return this;
    }

    /**
     * Set max concurrency in BatchJob.
     * @param concurrency Max concurrency.
     */
    public concurrencyMultiplier(concurrencyMultiplier: number): Builder<T> {
      this.batchJob.concurrencyMultiplier = concurrencyMultiplier;
      return this;
    }

    /**
     * Add a new step to the chain.
     * @param step The step that you want to add.
     */
    public addStep(step: BatchStep) {
      if (this.batchJob.stepsChain === undefined) {
        // eslint-disable-next-line no-param-reassign
        step.setNumber = 1;
        this.batchJob.stepsChain = step;
      } else {
        // eslint-disable-next-line no-param-reassign
        step.setNumber = this.batchJob.stepsChain.getStepsCount() + 1;
        this.batchJob.stepsChain.addSuccessor(step);
      }
      return this;
    }

    /**
     * Build the BatchJob after set up all the attributes.
     */
    public build(): T {
      this.batchJob.maxConcurrentRecords = this.batchJob.getTotalStepsNeeded()
        * this.batchJob.concurrencyMultiplier;
      return this.batchJob;
    }
  };

  constructor() {
    process.on('exit', async () => {
      BatchStatus.exit();
      debuglog('BATCH-EXEC-FINISHED:\n', this.batchStatus);
    });
  }

  /**
   *  Method used to start batch execution.
   */
  public run() {
    // Do common and client defined pre all exec tasks.
    this.doPreBatchCommonTasks('RUN');
    this.doPreBatchTasks();
    // Start async all the workers until max concurrency.
    for (let i = 0; i < this.maxConcurrentRecords; i += 1) {
      this.doNextObj();
    }
  }

  /**
   *  Execute common pre batch tasks.
   */
  private doPreBatchCommonTasks(execType: String) {
    this.batchStatus.startBatchExecution(execType);
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
    if (this.batchStatus.status === BATCH_STATUS.PROCESSING_INJECTING) {
      // Get new record.
      const batchRecord: BatchRecord | null = await this.getNext();
      // Check available currency and batch record.
      if (batchRecord != null) {
        // Do pre and post step common tasks and execute the step chain.
        this.doPreCommonRecordTasks(batchRecord);
        debuglog(`EXECUTING-NEW-RECORD (CONCURRENCY: ${this.currentConcurrency}): \n`, batchRecord);
        const successfulDependentRecords = await this.executeRecordSteps(batchRecord);
        this.doPostCommonRecordTasks(successfulDependentRecords);
        // If we don't have more records to process and the current concurrency is 0,
        // the batch process has finished.
      } else if (batchRecord === null
        && this.batchStatus.status === BATCH_STATUS.PROCESSING_INJECTING) {
        //
        this.batchStatus.status = BATCH_STATUS.PROCESSING_WAITING;
        this.batchStatus.save();
      }
    }
  }

  /**
   * Abstract method to be implemented for client, It should return a new record
   *  from the source that the client wants to get for batch execution.
   *  It has to return a null when there are no more records.
   */
  protected abstract async getNext(): Promise<BatchRecord | null>;


  /**
   * Common pre record execution tasks.
   * @param batchRecord The bach record to be executed.
   */
  private doPreCommonRecordTasks(batchRecord: BatchRecord) {
    // Increment concurrency and save the record id as the last record loaded in status.
    this.currentConcurrency += 1;
    this.batchStatus.addOneToLoadedRecords();
    this.batchStatus.lastLoadedRecordId = batchRecord.getId.valueOf();
    this.batchStatus.save();
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
      [],
      batchRecord.getObject,
      false);

    const returnedResult: StepExecutionResult = await this.stepsChain.execute(bootStrapStepResult);
    if (returnedResult.getStepResultStatus === STEP_RESULT_STATUS.FAILED) {
      this.batchStatus.addOneFailedRecords(returnedResult.getDependentRecords.length);
      return returnedResult.getDependentRecords.length;
    } if (returnedResult.getStepResultStatus === STEP_RESULT_STATUS.SUCCESSFUL
      && returnedResult.getStepNumber === this.stepsChain.getStepsCount()) {
      // The quantity o dependent records is the finished.
      return returnedResult.getDependentRecords.length;
    }
    // Always returns 0, because it did not finish all the steps
    // for any record (Processing and Accumulating).
    return 0;
  }

  /**
   * Common post record execution tasks.
   */
  private async doPostCommonRecordTasks(successfulDependentRecords: number) {
    // Decrement concurrency.
    this.currentConcurrency -= successfulDependentRecords;
    if (this.batchStatus.status === BATCH_STATUS.PROCESSING_INJECTING) {
      // Have to send to execute the number of returned successfully executed records.
      for (let i = 0; i < successfulDependentRecords; i += 1) {
        this.doNextObj();
      }
    } else if (this.batchStatus.status === BATCH_STATUS.PROCESSING_WAITING) {
      // We have to see how many records are in the chain
      // and compare it with the minimum quantity needed,
      // to finish the complete job.
      if (this.stepsChain.recordsInTheChain() < this.stepsChain.getTotalStepsNeeded()
        && this.stepsChain.recordsInTheChain() === this.currentConcurrency) {
        this.resume();
      }
      if (this.currentConcurrency <= 0
        && this.stepsChain.recordsInTheChain() === 0) {
        this.doPostCommonBatchTasks();
        this.doPostBatchTasks();
      }
    }
  }

  /**
   * Post batch execution tasks to be implemented by client like close a file.
   */
  protected abstract doPostBatchTasks(): void;

  /**
   * Common ended batch tasks.
   */
  private async doPostCommonBatchTasks() {
    // Update batch exec status and debug log.
    this.batchStatus.endBatchExecution();
  }

  /**
   * Method to be implemented by client to move the cursor until some record number.
   * @param recordNumber The objective record number.
   */
  protected abstract async moveToRecord(recordNumber: number): Promise<void>;

  /**
   * This method is used to finish the execution.
   * At the end maybe some aggregators does not have enough
   * quantity of accumulated payloads to execute, so, resume will force the execution.
   */
  private async resume() {
    this.currentConcurrency += this.stepsChain.recordsInTheChain();

    const returnedResult: StepExecutionResult = await this.stepsChain
      .executeClientStep(this.stepsChain
        .getStepsCount() - 1);
    if (returnedResult.getStepResultStatus === STEP_RESULT_STATUS.FAILED) {
      this.batchStatus.addOneFailedRecords(returnedResult.getDependentRecords.length);
    }

    this.doPostCommonRecordTasks(returnedResult.getDependentRecords.length);
  }

  public getTotalStepsNeeded(): number {
    return this.stepsChain.getTotalStepsNeeded();
  }

  set setMaxConcurrentRecordsAtSameTime(value: number) {
    this.maxConcurrentRecords = value;
  }


  public retry(statusPath: String): void {
    recoveredPersistanceContextSingleton.recoverExecutionPersistanceContext(statusPath);


    // Do common and client defined pre all exec tasks.
    this.doPreBatchCommonTasks('RETRY');

    const alreadyReMake: string[] = [];

    for (let i = 1; i <= this.stepsChain.getStepsCount(); i += 1) {
      recoveredPersistanceContextSingleton.getIncompleteTasksStream()
        .on('data', async (data: any) => {
          const dataObj = JSON.parse(JSON
            .stringify(data)
            .replace(/\\/g, '')
            .replace(/"{/g, '{')
            .replace(/}"/g, '}'));

          if (!alreadyReMake.includes(dataObj.value.id)
            && dataObj.value.step === i) {
            alreadyReMake.push(dataObj.value.id);
            const stepResult = await recoveredPersistanceContextSingleton
              .getStepResultKey(dataObj.value.id);
            this.stepsChain.injectRecoveredState(stepResult, i);
            this.batchStatus.addLoadedRecords(stepResult.dependentRecords.length);
            this.resumeRecover();
          }
        });
    }

    this.doPostCommonBatchTasks();
  }

  private async resumeRecover() {
    this.currentConcurrency += this.stepsChain.recordsInTheChain();
    const returnedResult: StepExecutionResult = await this.stepsChain
      .executeClientStep(this.stepsChain
        .getStepsCount() - 1);
    if (returnedResult.getStepResultStatus === STEP_RESULT_STATUS.FAILED) {
      this.batchStatus.addOneFailedRecords(returnedResult.getDependentRecords.length);
    }
    this.currentConcurrency -= returnedResult.getDependentRecords.length;
  }
}
