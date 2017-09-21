# task-queue-node

## Install
![npm](https://nodei.co/npm/task-queue-node.png?downloads=true)

```shell
npm install task-queue-node --save 
```

## Usage
```javascript
    var taskQueue = require('./index')
    var Promise = require('bluebird')
    var request = require('request')
    
    var task = taskQueue.createTask({
      interval: 200,
      wait: true,
      taskCommand: function (args) { // taskCommand must return promise
        return new Promise(function (resolve, reject) {
          console.log(new Date().getTime(), args)
          setTimeout(() => {
            resolve(args + ' success')
          }, 300)
        })
      },
      autoStart: false
    })
    
    // Use multiple taskQueue
    var task1 = taskQueue.createTask({
      interval: 200,
      wait: true,
      taskCommand: commandFunc,
      max: 20
    })
    var commandFunc = function(){
        return new Promise(function (resolve, reject) {
          request('http://www.baidu.com',function(){
            resolve(args + ' success')
          })
        })
    }
    
    // listen every task execute complate event
    task1.subscribe((err, result) => { //result is taskCommand resolve
      if (err) {
        console.error(err, 'subscribe')
      } else {
        console.log(result)
      }
    })
```

## Example

>* See the test.js file for more examples.  

## Params && Event  

Params    | Description 
:------------- | :-------------
interval  | task execute interval(ms),`default:1000`.
key    | queue name,`default:taskQueue`.
autoStart    | when the queue is empty,use `addQueue` auto execute `start` event, `default:true`.
wait    | The next task will wait `taskCommand` resolve for execution, `default:false`.
ignoreError | set the false,`taskCommand` reject stop all task when, `default:true`.
taskCommand     | task's Processing method,`must is return promise`,you can use bluebird.
firstDelay  | first task is delay `default:true` (Not realized).
max | queue max task number,beyond will be truncated before `default:0`,set 0 no limit.

Event    | Description 
:------------- | :-------------
start  | start execute task.
stop    | stop execute task.
restart    | restart task queue.
clear    | clear queue.
addQueue | add task to queue.
subscribe     | subscribe `taskCommand` resolve and reject event.
removeSubscribe     | remove subscribe event.

## TODO
* 集成redis用于分布式部署
* 实现firstDelay功能

