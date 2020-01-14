const assert = require('chai').assert;
const BatchRecord = require('../../../build/BatchRecord').default;

describe('BatchRecord Class:', () => {

  describe("constructor() Method:", () => {

    it("Should return a BatchRecord instance.", () => {
      const myBatchRecord = new BatchRecord("10", {
        name: "Pedro",
        lastName: "Perez"
      });
      assert.instanceOf(myBatchRecord, BatchRecord, 'myBatchRecord is an instance of BatchRecord.');
    });

    it("Id should be the same that we injected in constructor.", () => {
      const myBatchRecord = new BatchRecord("ABDF", {
        name: "Juan",
        lastName: "Gomez"
      });
      assert.strictEqual(myBatchRecord.getId, "ABDF");
    });

    it("Object payload should be the same that we injected in constructor.", () => {
      const obj = {
        name: "Juan",
        lastName: "Gomez"
      };
      const myBatchRecord = new BatchRecord("ABDF", obj);
      assert.strictEqual(myBatchRecord.getObject, obj);
    });
  });
});