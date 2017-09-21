var taskQueue = require('./index')
var Promise = require('bluebird')

var task = taskQueue.createTask({
  interval: 200,
  wait: true,
  taskCommand: function (args) {
    return new Promise(function (resolve, reject) {
      console.log(new Date().getTime(), args)
      setTimeout(() => {
        resolve(args + ' success')
      }, 300)
    })
  },
  autoStart: false
})

task.subscribe((err, result) => {
  if (err) {
    console.error(err, 'subscribe')
  } else {
    console.log(result)
  }
})
for (let i = 0; i < 10; i++) {
  task.addQueue(i)
}

setTimeout(function () {
  task.addQueue('565656')
}, 10000)

var task1 = taskQueue.createTask({
  interval: 200,
  wait: true,
  taskCommand: function (args) {
    return new Promise(function (resolve, reject) {
      console.log(new Date().getTime(), args)
      setTimeout(() => {
        resolve(args + ' success')
      }, 300)
    })
  },
  max: 20
})

for (let i = 100; i > 1; i--) {
  task1.addQueue(i)
}

setTimeout(function () {
  task1.stop()
  console.log(task1.progress())
}, 5000)
