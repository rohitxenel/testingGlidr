const cron = require("node-cron");

const cronJobs = {}; 

module.exports.startCronJob = (jobName, schedule, task) => {
    if (cronJobs[jobName]) {
        console.log(`Cron job '${jobName}' is already running.`);
        return;
    }

    const job = cron.schedule(schedule, task);
    cronJobs[jobName] = job; 

    console.log(`✅ Cron job '${jobName}' started with schedule: ${schedule}`);
};

module.exports.stopCronJob = (jobName) => {
    if (cronJobs[jobName]) {
        cronJobs[jobName].stop();
        delete cronJobs[jobName];
        console.log(`❌ Cron job '${jobName}' stopped.`);
    } else {
        console.log(`⚠️ Cron job '${jobName}' is not running.`);
    }
};

module.exports.stopAllCronJobs = () => {
    Object.keys(cronJobs).forEach((jobName) => {
        cronJobs[jobName].stop();
        console.log(`❌ Stopped cron job '${jobName}'.`);
    });

    Object.keys(cronJobs).forEach(jobName => delete cronJobs[jobName]);
    console.log("🚫 All cron jobs have been stopped.");
};
