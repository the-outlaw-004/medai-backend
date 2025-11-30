const { Queue } = require("bullmq");
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

const reportQueue = new Queue("reportQueue", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  },
});

module.exports = reportQueue;
