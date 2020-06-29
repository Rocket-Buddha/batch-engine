/** ********************************************************************* */
/*  BatchStep.ts                                                          */
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
import { StepExecutionResult, STEP_RESULT_STATUS } from './StepExecutionResult';


// Debug log, used to debug features using env var NODE_DEBUG.
const debuglog = require('util').debuglog('[BATCH-ENGINE:CORE]');

/**
 * Class that define a step to be put in the step chain.
 * It implements aggregator pattern,
 * (https://www.enterpriseintegrationpatterns.com/patterns/messaging/Aggregator.html).
 * All the steps are aggregators.
 */
export default abstract class BatchStep {
  // Next step in the chain.
  private successor!: BatchStep | undefined;

  // Description name.
  private stepName: String;

  // The step number in the chain.
  private stepNumber!: number;

  // The ids of the records that are dependent of this step execution.
  private dependentRecordsAcc: Array<String> = [];

  // The accumulated payload.
  private previousStepPayloadAcc: Array<Object> = [];

  // Define how many payload will accumulate before execute the step.
  // By default all the steps are aggregators of 1.
  private aggregationQuantity: number = 1;


  /**
   * Constructor method.
   * @param stepName A descriptive name for the step.
   * @param aggregationQuantity The number of records that it will have to process at once.
   */
  constructor(stepName: String,
    aggregationQuantity: number = 1) {
    this.stepName = stepName;
    this.aggregationQuantity = aggregationQuantity;
  }

  /**
   * Execute the step in the chain.
   * @param previousStepResult The previous step result.
   */
  public async execute(previousStepResult: StepExecutionResult,
    resumeFlagCount: number = 0): Promise<StepExecutionResult> {
    // Add the previous dependent records to this dependant records.
    this.addPreviousDependentRecordsToAcc(previousStepResult.getDependentRecords);
    // Accumulate the payload.
    this.addPreviousStepPayloadAcc(previousStepResult.getOutputPayload);
    // Check how many records have we to aggregate here.
    // If we have enoughs we have to execute the step.
    if (this.previousStepPayloadAcc.length >= this.aggregationQuantity
      || resumeFlagCount > 0) {
      return this.executeClientStep(resumeFlagCount - 1);
    }
    // Else, returns that we are accumulating.
    const stepCurrentState: StepExecutionResult = this.getCurrentStepStatus(null,
      STEP_RESULT_STATUS.ACCUMULATING);
    await stepCurrentState.updateAddingStepExecResult();
    debuglog('STEP-EXEC-ACCUMULATING\n', stepCurrentState.getNiceObjectToLogStepResult());
    return stepCurrentState;
  }

  /**
   * Execute the previous logic for client step definition.
   */
  public async executeClientStep(resumeFlagCount: number = 0): Promise<StepExecutionResult> {
    // First we need to fix the state of the step and reset the aggregator.
    // Because we will do async things and the state of the step could be changed.
    const stepCurrentState: StepExecutionResult = this.getCurrentStepStatus();
    this.resetAggregator();
    try {
      if (stepCurrentState.getAccPayload.length > 0
        && stepCurrentState.getDependentRecords.length > 0) {
        // Lets try to execute the step.
        stepCurrentState.setStepResultStatus = STEP_RESULT_STATUS.PROCESSING;
        await stepCurrentState.updateAddingStepExecResult();
        debuglog('STEP-EXEC-PROCESSING\n', stepCurrentState.getNiceObjectToLogStepResult());
        const payload = await this.step(stepCurrentState.getAccPayload);
        stepCurrentState.setOutputPayload = payload;
        //
        if (this.successor != null
          && this.successor !== undefined) {
          stepCurrentState.setStepResultStatus = STEP_RESULT_STATUS.SUCCESSFUL;
          return await this.successor.execute(stepCurrentState, resumeFlagCount);
        }
        // If this is last step in the chain, return success last one and log last step.
        stepCurrentState.setStepResultStatus = STEP_RESULT_STATUS.SUCCESSFUL;
        await stepCurrentState.updateAddingStepExecResult();
        debuglog('STEP-EXEC-SUCCESSFUL-LAST-ONE\n', stepCurrentState.getNiceObjectToLogSuccessfulStepResult());
        return stepCurrentState;
      }
      //
      if (this.successor != null
        && this.successor !== undefined) {
        return await this.successor.executeClientStep(resumeFlagCount - 1);
      }
      // If this is last step in the chain, return success last one and log last step.
      stepCurrentState.setStepResultStatus = STEP_RESULT_STATUS.SUCCESSFUL;
      await stepCurrentState.updateAddingStepExecResult();
      debuglog('STEP-EXEC-SUCCESSFUL-LAST-ONE\n', stepCurrentState.getNiceObjectToLogSuccessfulStepResult());
      return stepCurrentState;
    } catch (error) {
      // If there was an error, return failed an log.
      stepCurrentState.setStepResultStatus = STEP_RESULT_STATUS.FAILED;
      stepCurrentState.setError = error;
      await stepCurrentState.updateAddingStepExecResult();
      debuglog('STEP-EXEC-FAILED\n', stepCurrentState.getNiceObjectToLogFailedStepResult());
      return stepCurrentState;
    }
  }

  /**
   * Accumulate payload of the previous step.
   * @param previousStepResultOutputPayload The previous step result to be accumulated.
   */
  private addPreviousStepPayloadAcc(previousStepResultOutputPayload: Object | null) {
    if (previousStepResultOutputPayload != null) {
      this.previousStepPayloadAcc.push(previousStepResultOutputPayload);
    }
  }

  /**
   * Add previous step dependant records to this dependant records.
   * @param previousDependentRecords
   */
  private addPreviousDependentRecordsToAcc(previousDependentRecords: Array<String>) {
    previousDependentRecords.forEach((item) => {
      this.dependentRecordsAcc.push(item);
    });
  }

  /**
   * The step logic to be implemented by clients.
   * @param previousStepPayloadAcc The promise to be resolved by client logic.
   */
  public abstract step(previousStepPayloadAcc: Array<Object> | null): Promise<Object>;

  /**
   * Set the step number in the chain.
   * @param stepNumber The step number.
   */
  public set setNumber(stepNumber: number) {
    this.stepNumber = stepNumber;
  }

  /**
   * Set the successor in the step chain.
   * @param successor The successor step.
   */
  public addSuccessor(successor: BatchStep): BatchStep {
    if (this.successor === undefined) {
      this.successor = successor;
      return successor;
    } if (this.successor === successor) {
      throw (new Error(`You are trying to add the same instance of an step 2 times. Step instance: ${successor}`));
    } else {
      return this.successor.addSuccessor(successor);
    }
  }

  /**
   * Get the current step status. It will return a fixed image of the current status.
   * We have to do this in this way because,
   * the step state could change until the step execution be finished.
   * @param outputPayload The out payload that the step could have.
   * @param status The step execution result status, failed, successful...
   */
  private getCurrentStepStatus(outputPayload: Object | null = null,
    status: STEP_RESULT_STATUS | null = null): StepExecutionResult {
    return new StepExecutionResult(this.stepName,
      this.stepNumber.valueOf(),
      status,
      [...this.dependentRecordsAcc],
      [...this.previousStepPayloadAcc],
      JSON.parse(JSON.stringify(outputPayload)));
  }

  /**
   * Reset aggregator to keep processing new records.
   */
  private resetAggregator() {
    delete this.previousStepPayloadAcc;
    delete this.dependentRecordsAcc;
    this.previousStepPayloadAcc = [];
    this.dependentRecordsAcc = [];
  }

  /**
   * Get the total quantity of steps in the chain.
   */
  public getStepsCount(): number {
    if (this.successor === null
      || this.successor === undefined) {
      return 1;
    }
    return 1 + this.successor.getStepsCount();
  }
}
