/** ********************************************************************* */
/*  StepExecutionResult.ts                                                */
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

// Lib to get an UUID (https://en.wikipedia.org/wiki/Universally_unique_identifier).
const uuidv1 = require('uuid/v1');

// Step status enum.
export enum STEP_RESULT_STATUS {
  FAILED,
  ACCUMULATING,
  SUCCESSFUL,
  SUCCESSFUL_LAST_ONE,
  BAD_INPUT
}

/**
 * Class to save a step execution result and use it.
 */
export class StepExecutionResult {
  // The step execution Id, will be UUID.
  private readonly id: String;

  // The step name to be showed in logs.
  private readonly stepName: String;

  // The step number to be showed in logs.
  private readonly stepNumber: number;

  // The result of the step execution.
  private stepResultStatus!: STEP_RESULT_STATUS | null;

  // The dependent records that the step had at that time.
  private readonly dependentRecords: Array<String>;

  // The accumulated payload that the step had a that time.
  private readonly accPayload: Array<Object> | null;

  // The output payload of the step execution.
  private outputPayload!: Object | null;

  // If there was an error, It will be here.
  private error!: Error;

  /**
   * Constructor of step execution result.
   * @param stepName The step name.
   * @param stepNumber The step number.
   * @param stepState The step state/status.
   * @param dependentRecords The dependent records of the step.
   * @param previousStepPayloadAcc The accumulated payload.
   * @param outputPayload  The output payload.
   */
  constructor(stepName: String,
    stepNumber: number,
    stepState: STEP_RESULT_STATUS | null,
    dependentRecords: Array<String>,
    previousStepPayloadAcc: Array<Object> | null,
    outputPayload: Object | null) {
    this.id = uuidv1();
    this.stepName = stepName;
    this.stepNumber = stepNumber;
    this.stepResultStatus = stepState;
    this.dependentRecords = dependentRecords;
    this.accPayload = previousStepPayloadAcc;
    this.outputPayload = outputPayload;
  }

  /**
   * Get the UUID.
   */
  public get getId(): String {
    return this.id;
  }

  public get getOutputPayload(): Object | null{
    return this.outputPayload;
  }

  /**
   * Get dependent records.
   */
  public get getDependentRecords(): Array<String> {
    return this.dependentRecords;
  }

  /**
   * Get the step result status.
   */
  public get getStepResultStatus(): STEP_RESULT_STATUS | null{
    return this.stepResultStatus;
  }

  /**
   * Get the accumulated payload.
   */
  public get getAccPayload(): Array<Object> | null{
    return this.accPayload;
  }

  /**
   * Set the step result status.
   */
  public set setStepResultStatus(resultState: STEP_RESULT_STATUS | null) {
    this.stepResultStatus = resultState;
  }

  /**
   * Set the output payload.
   */
  public set setOutputPayload(resultState: Object | null) {
    this.outputPayload = resultState;
  }

  /**
   * Set the error.
   */
  public set setError(error: Error) {
    this.error = error;
  }

  /**
   * Get the error.
   */
  public get getError(): Error {
    return this.error;
  }
}
