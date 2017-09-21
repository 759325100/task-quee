var TaskQueue = require('./lib/taskQueue')

module.exports = {
  createTask: function (opts) {
    return new TaskQueue(opts)
  }
}
