
# Batch Engine

Ultra-lightweight, asynchronous and fault-tolerant batch engine for file processing with concurrency control.

[![Build Status](https://github.com/Rocket-Buddha/batch-engine/workflows/Node%20CI/badge.svg)](https://github.com/Rocket-Buddha/batch-engine/actions)
[![NPM version](https://badge.fury.io/js/batch-engine.svg)](http://badge.fury.io/js/batch-engine)

[![npm](https://nodei.co/npm/batch-engine.png)](https://www.npmjs.com/package/batch-engine)

## Installation

```
$ npm i batch-engine
```

## API

```js
const { BatchStep } = require("batch-engine");
const  {BatchJob } = require("batch-engine");
const { BatchRecord } = require("batch-engine");
const LineByLine = require("n-readlines");

class MyBatchJob extends BatchJob {

    doPreBatchTasks() {
        this.myLineByLine
            = new LineByLine('/Users/alusi/nodejs/batch/batch-engine-examples/set-timeouts-steps/persons.csv');
    }

    getNext() {
        const next = this.myLineByLine.next();
        if (next) {
            const data = next.toString().replace(/["']/g, "").replace('\r', '').split(',');
            const nextPerson = new Person(data[0],
                data[1],
                data[2],
                data[3],
                parseInt(data[4]),
                data[5],
                data[6],
                data[7],
                data[8],
                parseInt(data[9]),
                parseFloat(data[10]),
                data[11],
                parseInt(data[12]));

            return new BatchRecord(nextPerson.id, nextPerson);
        }

        return null;
    }

    doPostBatchTasks() {
        //To do after batch execution.
    }

    handleError(error) {
        //to handle batch execution errors.
    }

}

class MyBatchStep extends BatchStep {
    
    async step(previousStepPayloadAcc) {
        
       return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < 0.05) {
                    reject({
                        code: 1002,
                        des: "Bla bla refused",
                    });
                } else {
                    resolve({
                        outputPayload: "bla bla output payload"
                    });
                }
            }, Math.random() * 7000);
        });
    }

    

}

class Person {
    constructor(id
        , firstName,
        lastName,
        gender,
        age,
        email,
        phone,
        education,
        occupation,
        experience,
        salary,
        maritalStatus,
        numberOfChildren) {

        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.gender = gender;
        this.age = age;
        this.email = email;
        this.phone = phone;
        this.education = education;
        this.occupation = occupation;
        this.experience = experience;
        this.salary = salary;
        this.maritalStatus = maritalStatus;
        this.numberOfChildren = numberOfChildren;
    }
}

(new MyBatchJob.Builder(MyBatchJob))
    .concurrency(10)
    .name('people-loader')
    .addStep(new MyBatchStep("el timeout", 1, 2))
    .build()
    .run();
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
