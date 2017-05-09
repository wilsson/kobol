import EventEmitter from 'events';
import validate from './validate';
import * as _ from './util';

const TYPE = {};
TYPE.ENTRY = "ENTRY";
TYPE.COMMAND = "COMMAND";
TYPE.TASKS = "TASKS";
TYPE.SEQUENTIAL = "SEQUENTIAL";
TYPE.PARALLEL = "PARALLEL";

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
				case TYPE.ENTRY:
				case TYPE.COMMAND:
					this.initEntryOrCommand(foundTask, option);
					break;
				case TYPE.TASKS:
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
		let { entry, command } = foundTask;
		let valid = false;
		let type;
		let count = 0;
		if(entry){
			type = TYPE.ENTRY;
			count++;
		}
		if(command){
			type = TYPE.COMMAND;
			count++;
		}
		if (count > 1) {
			throw new Error("You can not have entry and commando together");
		}
		if (!count) {
			type = TYPE.TASKS;
		}
		return type;
	}

	/**
	 * @private
	 * @param {Object} task - Task found.
	 * @param {boolean} option -Whether it is dependent or not.
	 */
	initEntryOrCommand(task, option){
		let { sequential, parallel } = task;
		let param = {
			that:this,
			task:task
		};
		if (parallel && option) {
			throw new Error("You can only have sequential dependency tasks");
		}
		if (sequential && option) {
			console.log("tarea con flag");
			this.dependenciesTask(task);
		}else{
			_.execute(param);
		}
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
				case TYPE.SEQUENTIAL:
					this.runDependenciesSequential(tasksRun);
					break;
				case TYPE.PARALLEL:
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
			type = TYPE.SEQUENTIAL;
		}
		if (parallel) {
			type = TYPE.PARALLEL;
		}
		return type;
	 }

	/**
	 * @private
	 * @param {object} task - Configuration to run the script with dependencies.
	 */
	dependenciesTask(task){
		let { sequential, alias } = task;
		let tasksRun = this.getDependsTasks(sequential);
		tasksRun[alias] = task;
		this.runDependenciesSequential(tasksRun);
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
	runDependenciesSequential(tasksRun){
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