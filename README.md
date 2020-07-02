
# Batch Engine

Ultra-lightweight, asynchronous and fault-tolerant batch engine for file processing with concurrency control.

[![Build Status](https://github.com/Rocket-Buddha/batch-engine/workflows/batch-engine-ci/badge.svg)](https://github.com/Rocket-Buddha/batch-engine/actions)
[![NPM version](https://badge.fury.io/js/batch-engine.svg)](http://badge.fury.io/js/batch-engine)

[![npm](https://nodei.co/npm/batch-engine.png)](https://www.npmjs.com/package/batch-engine)

## Installation

```
$ npm i batch-engine
```

## API

```js
const { BatchStep } = require("batch-engine");
const { BatchJob } = require("batch-engine");
const { BatchRecord } = require("batch-engine");
var fs = require('fs');

const randomTime = 0;

class MyBatchJob extends BatchJob {

  constructor() {
    super();
    this.count = 0;
  }

  doPreBatchTasks() {
    
  }

  async getNext() {
    this.count++;
    if (this.count <= 300) {
      return new BatchRecord(this.count, String(this.count));
    }
    return null;
  }


  async moveToRecord(recordNumber) {

    for (let i = 0; i < recordNumber; i++) {
      this.getNext();
    }

  }

  doPostBatchTasks() {
   
  }


}

class MyBatchStep1 extends BatchStep {
  async step(previousStepPayloadAcc) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let acc =  "";
        for(let i = 0; i < previousStepPayloadAcc.length; i++){
          if(i !== 0){
            acc = acc + "-" + previousStepPayloadAcc[i];
          }
          else {
            acc = previousStepPayloadAcc[i];
          }
        }       
        resolve(acc);
      }, Math.random() * randomTime);
    });
  }
}

class MyBatchStep2 extends BatchStep {
  async step(previousStepPayloadAcc) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let acc =  "";
        for(let i = 0; i < previousStepPayloadAcc.length; i++){
          if(i !== 0){
            acc = acc + "**" + previousStepPayloadAcc[i];
          }
          else {
            acc = previousStepPayloadAcc[i];
          }
        }  
        resolve(acc);
      }, Math.random() * randomTime);
    });
  }
}

class MyBatchStep3 extends BatchStep {
  async step(previousStepPayloadAcc) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() <= 0.05){
          reject("LALALALA");
        } else {
          let acc =  "";
        for(let i = 0; i < previousStepPayloadAcc.length; i++){
          if(i !== 0){
            acc = acc + "|||" + previousStepPayloadAcc[i];
          }
          else {
            acc = previousStepPayloadAcc[i];
          }
        }    
        resolve(acc);
        }
      }, Math.random() * randomTime);
    });
  }
}

class MyBatchStep4 extends BatchStep {
  async step(previousStepPayloadAcc) {
    return new Promise((resolve, reject) => {
      fs.appendFile('/home/andres/Desktop/out.log', String(previousStepPayloadAcc[0]) + "\n", function (err) {
        if (err) { 
          console.log("Error");
          reject(err);
        } else {
          resolve();
        }
     });
    });
  }
}

// Run 
(new MyBatchJob.Builder(MyBatchJob))
  .concurrencyMultiplier(8)
  .name('test-batch')
  .addStep(new MyBatchStep1("Unir 3 numeros usando -", 3))
  .addStep(new MyBatchStep2("Unir 2 entradas usando **", 2))
  .addStep(new MyBatchStep3("Unir 4 entradas usando |||", 4))
  .addStep(new MyBatchStep4("Put the the entry in a output file", 1))
  .build()
  .run();
```
## Debug
Debug for visual code.
```js
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "batch-engine-example",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "env": {
        "NODE_DEBUG" : "[BATCH-ENGINE:CORE]"
      },
      "program": "${workspaceFolder}/example/example-batch-engine.js"
    }
  ]
}
```

## License

Copyright (c) 2020 contributors (cf. CONTRIBUTORS.md).

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
