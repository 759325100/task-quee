var events = require('events')
var taskQueue = function (options) {
  // 默认配置
  const defaultOpts = {
    interval: 1000, // 时间间隔 在非初始化后修改，需要调用restart才会生效
    key: 'taskQueue',
    autoStart: true,
    wait: false, // 是否启用等待执行（上一个任务执行完毕，下一个才开始）  在非初始化后修改，需要调用restart才会生效
    ignoreError: true, // 是否忽略任务对队列中的错误
    queue: [],
    executing: [], // 所有任务执行完成后清除
    executed: [], // 所有任务执行完成后清除
    taskCommand: null,
    firstDelay: true,
    _interval: {},
    max: 0, // 队列最大长度 0为不限制
    eventEmitter: new events.EventEmitter()
  }
  Object.assign(this, defaultOpts, options)
}

// 订阅执行结果
taskQueue.prototype.subscribe = function (event) {
  this.eventEmitter.on('success_event', event)
}

// 获取当前队列的执行进度（所有任务执行完成，会清除进度）
taskQueue.prototype.progress = function () {
  return {
    progress: ((this.executed.length / parseFloat(this.executed.length + this.queue.length + this.executing.length)) * 100).toFixed(2),
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
  // 任务超长处理
  if (this.max && this.queue.length >= this.max) {
    // 加1是为了让队列在此次添加任务后，不会大于最大数量
    this.queue.splice(0, (this.queue.length - this.max + 1))
    console.warn('task-queue-node Warning: task queue limit %s ', this.max)
  }
  // 将任务放入队列
  if (this.queue.length === 0 && this.autoStart) { // 如果队列执行完毕，又存在新的添加，自动启动执行
    this.queue.push({task: task, no: uuid})
    this.start()
  } else {
    this.queue.push({task: task, no: uuid})
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
taskQueue.prototype._syncMode = function () {
  // 直接进行递归执行
  let timeout = setTimeout(() => {
    if (this.queue.length === 0) {
      this.executing = []
      this.executed = []
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
      // 继续下一个任务
      !this.stopSign && this._syncMode()
    }).catch(err => {
      this.eventEmitter.emit('success_event', err)
      this.executed.push(task)
      this._removeTask(task)
      if (!this.ignoreError) {
        this.stop()
        return
      }
      !this.stopSign && this._syncMode()
    })
  }, this.interval)
  this.setTimeout = timeout
}

// 异步执行模式
taskQueue.prototype._asyncMode = function () {
  let interval = setInterval(() => {
    if (this.queue.length === 0) {
      this.executing = []
      this.executed = []
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
    }).catch(err => {
      this.eventEmitter.emit('success_event', err)
      this.executed.push(task)
      this._removeTask(task)
      if (!this.ignoreError) {
        this.stop()
      }
    })
  }, this.interval)
  this.setInterval = interval
}

// 手动启动任务，如果autoStart=true，在第一条任务添加进队列后，会自动运行
taskQueue.prototype.start = function () {
  // 重置停止位
  this.stopSign = false
  // 分析执行模式
  if (this.wait) {
    this._syncMode()
  } else {
    this._asyncMode()
  }
}

// 重启队列中的任务，并使用新的配置处理未执行任务
taskQueue.prototype.restart = function () {
  // 进行重启操作，重启后使用新的配置
  this.stop()
  this.start()
}

// 停止当前所有任务，直到start或者队列长度再次为0时
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

// 清除当前所有任务
taskQueue.prototype.clear = function () {
  // 清除所有任务
  this.queue = []
  this.executing = []
  this.executed = []
}

// 用于生成uuid
function s4 () {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

function createUUID () {
  return (s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4())
}

module.exports = taskQueue
