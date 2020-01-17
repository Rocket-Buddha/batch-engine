import * as fs from 'fs';
import { rejects } from 'assert';

const level = require('level');

export default class PersistanceContext {
  private statusDB!: any;

  private recordsDB!: any;

  private stepsResultsDBs: { [stepNumber: number]: any; } = {};

  private currentFilePath!: String;

  public async createExecutionPersistanceContext(batchName: String,
    execType: String,
    stepsQuantity: number) {
    this.currentFilePath = `${process.cwd()}/${batchName}-[${execType}]-${(new Date()).toISOString()}`;

    if (!fs.existsSync(this.currentFilePath.valueOf())) {
      //@todo do it async 
      fs.mkdirSync(this.currentFilePath.valueOf(), { recursive: true });
    }

    this.statusDB = level(`${this.currentFilePath}/batch-status`);
    this.recordsDB = level(`${this.currentFilePath}/records`);

    for (let i = 1; i <= stepsQuantity; i += 1) {
      this.stepsResultsDBs[i] = level(`${this.currentFilePath}/step-${i}`);
    }

    this.openAllDBs();
  }

  private openAllDBs(): void {
    this.recordsDB.open();
    this.recordsDB.open();
    // eslint-disable-next-line no-restricted-syntax
    for (const key in this.stepsResultsDBs) {
      if (Object.prototype.hasOwnProperty.call(this.stepsResultsDBs, key)) {
        this.stepsResultsDBs[key].open();
      }
    }
  }

  public closeAllDBs(): void {
    this.statusDB.close();
    this.recordsDB.close();
    // eslint-disable-next-line no-restricted-syntax
    for (const key in this.stepsResultsDBs) {
      if (Object.prototype.hasOwnProperty.call(this.stepsResultsDBs, key)) {
        this.stepsResultsDBs[key].close();
      }
    }
  }

  public async putBatchStatusSync(key: String, value: String) {
    return new Promise ((resolve, reject) => {
      this.statusDB.put(key.valueOf(), value.valueOf(), (err: any) =>{
        if (err){
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putRecordStatusSync(key: String, value: String) {
    return new Promise ((resolve, reject) => {
      this.recordsDB.put(key.valueOf(), value.valueOf(), (err: any) =>{
        if (err){
          reject(err);
        }
        resolve();
      });
    });
  }

  public async putStepResultSync(stepNumber: number, key: String, value: String) {
    return new Promise ((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].put(key.valueOf(), value.valueOf(), (err: any) =>{
        if (err){
          reject(err);
        }
        resolve();
      });
    });
  }

  public async getBatchStatus(key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.statusDB.get(key, (err: any, value: any) => {
        if (err) {
          if(err.name === 'NotFoundError'){
            resolve(null);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getRecordStatus(key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.recordsDB.get(key, (err: any, value: any) => {
        if (err) {
          if(err.name === 'NotFoundError'){
            resolve(null);
          }
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async getStepResultKey(stepNumber: number, key: String): Promise<String | null> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].get(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delRecordStatus(key: String): Promise<String> {
    return new Promise((resolve, reject) => {
      this.recordsDB.del(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }

  public async delStepResultKey(stepNumber: number, key: String): Promise<String> {
    return new Promise((resolve, reject) => {
      this.stepsResultsDBs[stepNumber].del(key, (err: any, value: any) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
  }
}
