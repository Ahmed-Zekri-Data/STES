// Runs before the tests (npm pretest). The test files run in parallel and each
// starts an in-memory MongoDB; on a machine that hasn't cached the MongoDB
// binary yet, they would all download it at once and race on its lock file.
// Downloading it here first means the test files only ever find it cached.
const { MongoBinary } = require('mongodb-memory-server-core');

MongoBinary.getPath()
  .then((binaryPath) => console.log(`MongoDB binary for tests: ${binaryPath}`))
  .catch((error) => {
    console.error('Could not download the MongoDB binary used by the tests:', error.message);
    process.exit(1);
  });
