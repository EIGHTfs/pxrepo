const Fs = require('fs');
const Fse = require('fs-extra');
const Readline = require('readline');
const Axios = require('axios');
const Path = require('path');
const fetch = require("node-fetch");
const Illustrator = require('./illustrator');
const Pixiv = require('./pxrepo');
const pxrepodir = Path.resolve(__dirname, '..');
const configFileDir = Path.join(pxrepodir, 'config');
const downJson = Path.join(configFileDir, 'download.json');
const historyJson = Path.join(configFileDir, 'history.json');
const https = require("https");
const StreamZip = require('node-stream-zip');

/**
 * 读取目录下的内容
 *
 * @param {string} dirpath 目录路径
 * @returns 目录下的文件列表
 */
function readDirSync(dirpath) {
	return new Promise((resolve, reject) => {
		Fs.readdir(dirpath, (e, files) => {
			if (e) reject(e);
			else resolve(files);
		});
	});
}

function showProgress(valFn) {
	return setInterval(() => {
		Readline.clearLine(process.stdout, 0);
		Readline.cursorTo(process.stdout, 0);
		process.stdout.write('Progress: ' + `${valFn()}`.green);
	}, 500);
}

function clearProgress(interval) {
	clearInterval(interval);
	Readline.clearLine(process.stdout, 0);
	Readline.cursorTo(process.stdout, 0);
}

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption) {
	Fse.ensureDirSync(dirpath);
	axiosOption.responseType = 'stream';

	const response = await Axios.create(axiosOption).get(global.cf ? url.replace('i.pximg.net', 'i-cf.pximg.net') : url.replace('i-cf.pximg.net', 'i.pximg.net'));
	const data = response.data;

	return new Promise((reslove, reject) => {
		data.pipe(Fse.createWriteStream(Path.join(dirpath, filename)));
		data.on('end', () => {
			reslove(response);
		});
		data.on('error', reject);
	});
}



function mkdirsSync(dirpath) {
	let parentDir = Path.dirname(dirpath);
	//如果目标文件夹不存在但是上级文件夹存在
	if (!Fs.existsSync(dirpath) && Fs.existsSync(parentDir)) {
		Fs.mkdirSync(dirpath);
	} else {
		mkdirsSync(parentDir);
		Fs.mkdirSync(dirpath);
	}
}



/**
 * 检查我的画师列表是否已存在下载任务
 *
 * @param {stringn} [follows] 
 * @param {int} [uid] 画师UID
 */
function CheckExist(follows, uid, FileJson, illustrator_name, remark) {

	if (
		JSON.stringify(follows).search(

			'\"id\":' +
			parseInt(uid) +
			","
		) == -1 &&
		JSON.stringify(follows).search(
			'\"id\":' +
			parseInt(uid) +
			"}"
		) == -1
	) {
		if (FileJson != null) {
			if (illustrator_name != null) {

				console.log({
					id: parseInt(uid),
					name: illustrator_name,
				});
				follows.push({
					id: parseInt(uid),
					name: illustrator_name,
				});

			}
			else {
				console.log({
					id: parseInt(uid),
				});
				follows.push({
					id: parseInt(uid),
				});
			}
			Fs.writeFileSync(FileJson, JSON.stringify(follows));
		}
		//else console.log('不写入');
		return false;
	} else return true;
}


function readJsonSafely(path, defaultValue) {
	if (!Fse.existsSync(path)) return defaultValue;
	try {
		return Fse.readJsonSync(path);
	} catch (error) { }
	return defaultValue;
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}



module.exports = {
	readDirSync,
	showProgress,
	clearProgress,
	download,
	mkdirsSync,
	readJsonSafely,
	CheckExist,
	sleep,

};

