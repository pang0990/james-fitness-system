import { WebIndexedDbTrainingDatabase } from "../../src/lib/training-offline/indexeddb-adapter";
import {
  saveTrainingOffline, readyTrainingCommands,
  acknowledgeTrainingCommand, markTrainingCommandFailed,
} from "../../src/lib/training-offline/protocol";

Object.assign(window, {
  __jfsOfflineHarness: {
    WebIndexedDbTrainingDatabase,
    saveTrainingOffline, readyTrainingCommands,
    acknowledgeTrainingCommand, markTrainingCommandFailed,
  },
});
