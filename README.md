
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
 Check this [minimum batch-engine example project](https://github.com/Rocket-Buddha/minimum-batch-engine-example).

```js
const { BatchStep } = require("batch-engine");
const { BatchJob } = require("batch-engine");
const { BatchRecord } = require("batch-engine");
const  fs = require('fs');
const randomTime = 0;

class MyBatchJob extends BatchJob {

  constructor() {
    super();
    // Just for this example proposes.
    this.count = 0;
  }

  doPreBatchTasks() {
    // Maybe open a file.
  }

  async getNext() {
    this.count++;
    if (this.count <= 300) {
      return new BatchRecord(this.count, String(this.count));
    }
    return null;
  }

  doPostBatchTasks() {
   // Maybe close a file.
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
          reject("Random error!");
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
      fs.appendFile('/path/in/your/pc/out.log', String(previousStepPayloadAcc[0]) + "\n", function (err) {
        if (err) { 
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
  .addStep(new MyBatchStep1("Join 3 records using -", 3))
  .addStep(new MyBatchStep2("Join 2 payloads using **", 2))
  .addStep(new MyBatchStep3("Join 4 payloads using |||", 4))
  .addStep(new MyBatchStep4("Put the result in an output file", 1))
  .build()
  .run();

// When some records failed, you can retry that ones.
/* 
(new MyBatchJob.Builder(MyBatchJob))
  .concurrencyMultiplier(8)
  .name('test-batch-retry')
  .addStep(new MyBatchStep1("Join 3 records using -", 3))
  .addStep(new MyBatchStep2("Join 2 payloads using **", 2))
  .addStep(new MyBatchStep3("Join 4 payloads using |||", 4))
  .addStep(new MyBatchStep4("Put the result in an output file", 1))
  .build()
  .retry(/path/to/execution/context);
*/
```

## Debug
Debug for visual code using NODE_DEBUG.

```js
{
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
