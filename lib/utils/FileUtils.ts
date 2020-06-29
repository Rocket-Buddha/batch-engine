/** ********************************************************************* */
/*  FileUtils.ts                                                          */
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
import * as fs from 'fs';
// Debug log, used to debug features using env var NODE_DEBUG.
const debuglog = require('util').debuglog('[BATCH-ENGINE:UTILS]');

/**
 * Files utils class with static methods.
 */
export default class FileUtils {
  /**
   * Method used to get the quantity of folders in a folder path.
   * @param folderPath
   */
  public static async getFoldersCount(folderPath: String): Promise<number|any> {
    return new Promise((resolve, reject) => {
      fs.readdir(folderPath.valueOf(), (err, filenames) => {
        if (err) {
          debuglog('ERROR-GETTING-FOLDER-COUNT:\n', err);
          reject(err);
        }
        debuglog('FILENAMES-GOT:\n', filenames);
        resolve(filenames.length);
      });
    });
  }

  /**
   * Method used to create a folder in a folder path.
   * @param folderPath
   */
  public static async createFolder(folderPath: String) {
    return new Promise((resolve, reject) => {
      fs.exists(folderPath.valueOf(), (exists) => {
        if (!exists) {
          fs.mkdir(folderPath.valueOf(), { recursive: true }, (err) => {
            if (err) {
              debuglog('ERROR-CREATING-FOLDER:\n', err);
              reject(err);
            }
            debuglog('FOLDER-CREATED:\n', folderPath);
            resolve();
          });
        }
      });
    });
  }
}
