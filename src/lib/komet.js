import EventEmitter from 'events';
import validate from './validate';
import * as _ from './util';

const ENTRY = "ENTRY";
const COMMAND = "COMMAND";
const TASKS = "TASKS";
const SEQUENTIAL = "SEQUENTIAL";
const PARALLEL = "PARALLEL";

/**
 * @since 0.0.1
 * @example
 * var komet = require("komet");
 *
 * komet.task({
 *  alias:'task-one',
 *  entry:'task-one.js'
 * });
 */
export class Komet extends EventEmitter{

	/**
	 * @private
	 */
	constructor(){
		super();
		/**
		 * @private
		 */
		this.tasks = {};
	}

	/**
	 * @private
	 * @desc Method for validate task.
	 * @param {Object} config - Task configuration object.
	 * @return {Object} task - Subscribed task.
	 */
	validateTask(config){
		let {alias, entry, sequential } = config;
		let task = {};
		validate.execute('string', alias);
		validate.execute('string', entry);
		if(sequential){
			validate.execute('array', sequential);
			for(const dependence of sequential){
				validate.execute('string', dependence);
			}
		}
		task[alias] = config;
		return task;
	}

	/**
	 * @desc Method for creating a task.
	 * @param {Object} config - Task configuration object.
	 * @param {string} config.alias - The alias of your task.
	 * @param {string} config.entry - The path of your node script.
	 * @param {Array} config.dependsof - Task dependencies.
	 */
	task(config){
		let task = this.validateTask(config);
		Object.assign(this.tasks, task);
	}
	
	/**
	 * @private
	 * @param {array} tastas - kask from cli.
	 * @param {boolean} option - Whether it is dependent or not.
	 */
	start(params){
		let { argTask, option, envKomet } = params;
		let foundTask;
		let type;
		if (envKomet) {
			this.createEnv(envKomet);
		}
		if(!argTask){
			throw new Error('Not alias task for argument');
		}
		for(let alias in this.tasks){
			if(alias === argTask){
				foundTask = this.tasks[alias];
			}
		}

		if(foundTask){
			type = this.verifyTypeTask(foundTask);
			switch(type){
				case ENTRY:
					this.initEntry(foundTask, option);
					break;
				case COMMAND:
					this.initCommand(foundTask);
					//console.log("Ejecutar la tarea con el comando", type, foundTask);
					break;
				case TASKS:
					//console.log("Ejecutar las tareas, no tiene ni entry ni comando", type, foundTask);
					this.initTasks(foundTask);
			}
		}else{
			this.emit('task_not_found', task);
		}
	}

	/**
	 * @private
	 * @param {string} env - enviroment a create.
	 */
	createEnv(env){
		process.env[env] = env;
	}

	/**
	 * @private
	 * @param {Object} foundTask - Task found.
	 * @return {string} type - Type of task.
	 */
	verifyTypeTask(foundTask){
		//console.log("verifyTypeTask foundTask >", foundTask);
		let { entry, command } = foundTask;
		let valid = false;
		let type;
		let count = 0;
		if(entry){
			type = ENTRY;
			count++;
		}
		if(command){
			type = COMMAND;
			count++;
		}
		//console.log("count>", count);
		if (count > 1) {
			throw new Error("You can not have entry and commando together");
		}
		if (!count) {
			type = TASKS;
		}
		return type;
	}

	/**
	 * @private
	 * @param {Object} task - Task found.
	 * @param {boolean} option -Whether it is dependent or not.
	 */
	initEntry(task, option){
		let { sequential, parallel } = task;
		let param = {
			that:this,
			task:task
		};
		if (parallel && option) {
			throw new Error("You can only have sequential dependency tasks");
		}
		if (sequential && option) {
			this.sequentialProcess(task);
		}else{
			_.execute(param);
		}
	}

	/**
	 * @private
	 * @param {Object} task - Task found.
	 */
	initCommand(task){
		let param = {
			that:this,
			task:task
		};
		_.executeCommand(param);
	}

	/**
	 * @private
	 * @param {object} task
	 */
	 initTasks(task){
		let { sequential, parallel } = task;
		let tasks = sequential || parallel;
		let type = this.getTypeTasks(sequential, parallel);
		let tasksRun = tasks && this.getDependsTasks(tasks);
		if (tasksRun) {
			switch(type){
				case SEQUENTIAL:
					this.dependenciesRun(tasksRun);
					break;
				case PARALLEL:
					console.log("ejecutar tareas en paralelo");
					this.runDependenciesParallel(tasksRun);
					break;
			}
		}
	}

	/**
	 * @private
	 * @param {object} tasksRun
	 */
	runDependenciesParallel(tasksRun){
		for(let task in tasksRun){
			let params = {
				that:this,
				task:tasksRun[task]
			};
			_.execute(params);
		}
	}
	/**
	 * @private
	 * @param {string} sequential
	 * @param {string} parallel
	 */
	getTypeTasks(sequential, parallel){
		let type;
		if (sequential) {
			type = SEQUENTIAL;
		}
		if (parallel) {
			type = PARALLEL;
		}
		return type;
	 }

	/**
	 * @private
	 * @param {object} task - Configuration to run the script with dependencies.
	 */
	sequentialProcess(task){
		let { sequential, alias } = task;
		let tasksRun = this.getDependsTasks(sequential);
		tasksRun[alias] = task;
		this.dependenciesRun(tasksRun);
	}

	/**
	 * @private
	 * @param {array} dependencies
	 */
	 getDependsTasks(dependencies){
		let tasksRun = {};
		for(let dependence of dependencies){
			for(let task in this.tasks){
				if(task === dependence){
					tasksRun[task] = this.tasks[task];
					break;
				}
			}
		}
		return tasksRun;
	 }

	/**
	 * @private
	 * @param {object} tasksRun - All configurations to run.
	 */
	dependenciesRun(tasksRun){
		//console.log("dependenciesRun tareas por parametro", tasksRun)
		let task;
		let params;
		let runRecursive = (tasksRun)=>{
			if(Object.keys(tasksRun).length){
				task = _.shiftObject(tasksRun);
				params = {
					that:this,
					task:task,
					tasksRun:tasksRun,
					callback:runRecursive
				};
				_.execute(params);
			}
		};
		runRecursive(tasksRun);
	}
}