var events = require('events')
var taskQueue = function (options) {
  // 默认配置
  const defaultOpts = {
    interval: 1000, // 时间间隔
    key: 'taskQueue',
    autoStart: true,
    count: 0, // 队列内的当前任务数量
    wait: false, // 是否启用等待执行（上一个任务执行完毕，下一个才开始）
    ignoreError: true, // 是否忽略任务对队列中的错误
    queue: [],
    executing: [],
    executed: [],
    taskCommand: null,
    firstDelay: true,
    _interval: {},
    eventEmitter: new events.EventEmitter()
  }
  Object.assign(this, defaultOpts, options)
}

// 订阅执行结果
taskQueue.prototype.subscribe = function (event) {
  this.eventEmitter.on('success_event', event)
}

taskQueue.prototype.progress = function () {
  return {
    executing: this.executing,
    executed: this.executed,
    waitExecute: this.queue
  }
}

// 订阅订阅执行
taskQueue.prototype.removeSubscribe = function (event) {
  this.eventEmitter.removeListener('success_event', event)
}

// 将任务添加至队列
taskQueue.prototype.addQueue = function (task) {
  // 定义执行任务的唯一编码
  const uuid = createUUID()
  // 将任务放入队列
  this.queue.push({task: task, no: uuid})
  if (this.count === 0 && ++this.count && this.autoStart) { // 如果队列执行完毕，又存在新的添加，自动启动执行
    this.start()
  } else {
    ++this.count
  }
}

taskQueue.prototype._removeTask = function (task) {
  for (let i = 0; i < this.executing.length; i++) {
    if (this.executing[i] && task.no === this.executing[i].no) {
      this.executing.splice(i, 1)
    }
  }
}

// 同步执行模式
taskQueue.prototype.syncMode = function () {
  // 直接进行递归执行
  let timeout = setTimeout(() => {
    if (this.queue.length === 0) {
      return
    }
    // 将任务放入正在执行队列
    const task = this.queue.shift()
    this.executing.push(task)
    // 开始执行
    this.taskCommand && this.taskCommand(task.task).then(result => {
      // 执行完成，通知外部订阅
      this.eventEmitter.emit('success_event', null, result)
      // 将任务放入执行完成队列
      this.executed.push(task)
      this._removeTask(task)
      this.count--
      // 继续下一个任务
      !this.stopSign && this.syncMode()
    }).catch(err => {
      this.eventEmitter.emit('success_event', err)
      this.count--
      if (!this.ignoreError) {
        this.stop()
        return
      }
      !this.stopSign && this.syncMode()
    })
  }, this.interval)
  this.setTimeout = timeout
}

// 异步执行模式
taskQueue.prototype.asyncMode = function () {
  let interval = setInterval(() => {
    if (this.queue.length === 0) {
      this.stop()
      return
    }
    // 将任务放入正在执行队列
    const task = this.queue.shift()
    this.executing.push(task)
    // 开始执行
    this.taskCommand && this.taskCommand(task.task).then(result => {
      // 执行完成，通知外部订阅
      this.eventEmitter.emit('success_event', null, result)
      // 将任务放入执行完成队列
      this.executed.push(task)
      this._removeTask(task)
      this.count--
    }).catch(err => {
      this.eventEmitter.emit('success_event', err)
      if (!this.ignoreError) {
        this.stop()
      }
      this.count--
    })
  }, this.interval)
  this.setInterval = interval
}

taskQueue.prototype.start = function () {
  // 重置停止位
  this.stopSign = false
  // 分析执行模式
  if (this.wait) {
    this.syncMode()
  } else {
    this.asyncMode()
  }
}

taskQueue.prototype.stop = function () {
  this.stopSign = true
  if (this.setTimeout) {
    clearTimeout(this.setTimeout)
    this.setTimeout = null
  }
  if (this.setInterval) {
    clearInterval(this.setInterval)
    this.setInterval = null
  }
}

taskQueue.prototype.clear = function () {
  // 清除所有未执行任务
  this.queue.splice(0, this.queue.length)
}

// 用于生成uuid
function s4 () {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

function createUUID () {
  return (s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4())
}

module.exports = taskQueue
