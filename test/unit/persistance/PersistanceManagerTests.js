const assert = require('chai').assert;
const PersistanceManager = require('../../../build/persistence/PersistanceManager').default;


const myPM = new PersistanceManager();

describe('PersistanceManager Class:', () => {

  describe("createExecutionPersistanceContext() Method:", () => {

    
    
    it("Should ... .", () => {
      myPM.createExecutionPersistanceContext("PEOPLE-LOADER", "RUN", 5);
    });

    it("Should ... .", () => {
      myPM.putBatchStatusKeySync("lala", "lololololo");
    });

    it("Should ... .", async () => {

      const lala = await myPM.getBatchStatusKey("lala");
      console.log(lala);
    });

  });
});