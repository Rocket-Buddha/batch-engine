/** ********************************************************************* */
/*  MiscellaneousUtils.ts                                                 */
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

import { BATCH_STATUS } from '../core/BATCH_STATUS';
// Debug log, used to debug features using env var NODE_DEBUG.
const debuglog = require('util').debuglog('[BATCH-ENGINE:UTILS]');

/**
 * Miscellaneous class with static functions.
 */
export default class MiscellaneousUtils {
  /**
   * Returns a BATCH_STATUS from a string.
   * @param str The string equivalent to the BATCH_STATUS.
   */
  static getBatchStatusFromString(str: String): BATCH_STATUS {
    switch (str) {
      case BATCH_STATUS.FINISHED_SUCCESSFULLY:
        return BATCH_STATUS.FINISHED_SUCCESSFULLY;
      case BATCH_STATUS.FINISHED_WITH_ERRORS:
        return BATCH_STATUS.FINISHED_WITH_ERRORS;
      case BATCH_STATUS.NOT_STARTED:
        return BATCH_STATUS.NOT_STARTED;
      case BATCH_STATUS.PROCESSING_INJECTING:
        return BATCH_STATUS.PROCESSING_INJECTING;
      case BATCH_STATUS.PROCESSING_WAITING:
        return BATCH_STATUS.PROCESSING_WAITING;
      default:
        debuglog('REQUESTED-BATCH-STATUS-NOT-FOUNDED:\n', str);
        throw (new Error(`There is no requested batch execution status state: ${str}`));
    }
  }
}
