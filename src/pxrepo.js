require('colors');
const PixivApi = require('./pixiv-api-client-mod');
const Downloader = require('./downloader');
const Illustrator = require('./illustrator');
const Fs = require('fs');
const Fse = require('fs-extra');
const Path = require('path');
const Tools = require('./tools');
const readline = require('readline-sync');
const { getProxyAgent, getSysProxy } = require('./proxy');
const pxrepodir = Path.resolve(__dirname, '..');
const configFileDir = Path.join(pxrepodir, 'config');
const configFile = Path.join(configFileDir, 'config.json');
const downJson = Path.join(configFileDir, 'download.json');
const historyJson = Path.join(configFileDir, 'history.json');
const blacklistJson = Path.join(configFileDir, 'blacklist.json');
let blacklist = [];
let __config;
const { Agent } = require('https');

class PixivFunc {
	constructor() {
		this.followNextUrl = null;
	}

	/**
	 * 初始化配置文件
	 *
	 * @static
	 * @param {boolean} [forceInit=false] 是否强制初始化
	 * @memberof PixivFunc
	 */
	static initConfig(forceInit = false) {
		if (!Fs.existsSync(configFileDir)) Fs.mkdirSync(configFileDir);
		if (!Fs.existsSync(configFile) || forceInit)
			Fse.writeJSONSync(configFile, {
				download: {
					thread: 32,
					autoRename: true,
				},
			});
	}

	/**
	 * 读取配置
	 *
	 * @static
	 * @returns 配置
	 * @memberof PixivFunc
	 */
	static readConfig() {
		PixivFunc.initConfig();
		const config = require(configFile);
		//check
		if (!config.download.thread) config.download.thread = 32;
		if (!config.download.autoRename) config.download.autoRename = true;

		return config;
	}

	/**
	 * 写入配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static writeConfig(config) {
		Fs.writeFileSync(configFile, JSON.stringify(config));
	}

	/**
	 * 检查配置
	 *
	 * @static
	 * @param {*} [config=PixivFunc.readConfig()]
	 * @returns 是否通过
	 * @memberof PixivFunc
	 */
	static checkConfig(config = PixivFunc.readConfig()) {
		let check = true;
		if (!config.refresh_token) {
			console.error('\nYou must login first!'.red + '\n    Try ' + 'pxrepo --login'.yellow);
			check = false;
		}
		if (!config.download.path) {
			check = false;
			console.error('\nYou must set download path first!'.red + '\n    Try ' + 'pxrepo --setting'.yellow);
		}
		return check;
	}

	/**
	 * 应用配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static applyConfig(config = PixivFunc.readConfig()) {
		__config = config;

		config.download.tmp = Path.join(configFileDir, 'temp');
		Downloader.setConfig(config.download);
		PixivFunc.applyProxyConfig(config);
	}

	/**
	 * 应用代理配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static applyProxyConfig(config = PixivFunc.readConfig()) {
		if (config.directMode) {
			global.p_direct = true;
			PixivApi.setAgent(
				new Agent({
					rejectUnauthorized: false,
					servername: '',
				})
			);
		} else {
			const proxy = config.proxy;
			const sysProxy = getSysProxy();
			// if config has no proxy and env has, use it
			const agent = proxy === 'disable' ? null : getProxyAgent(proxy) || getProxyAgent(sysProxy);
			// fix OAuth may fail if env has set the http proxy
			if (sysProxy) {
				delete process.env.all_proxy;
				delete process.env.http_proxy;
				delete process.env.https_proxy;
			}
			if (agent) {
				Downloader.setAgent(agent);
				PixivApi.setAgent(agent);
				global.proxyAgent = agent;
			}
		}
	}

	/**
	 * 登录
	 *
	 * @static
	 * @param {string} u 用户名
	 * @param {string} p 密码
	 * @memberof PixivFunc
	 */
	static async login(u, p) {
		//登录
		const pixiv = new PixivApi();
		await pixiv.login(u, p);
		//获取refresh_token
		const refresh_token = pixiv.authInfo().refresh_token;
		//更新配置
		const conf = PixivFunc.readConfig();
		conf.refresh_token = refresh_token;
		PixivFunc.writeConfig(conf);
	}

	/**
	 * 重登陆
	 *
	 * @static
	 * @returns 成功或失败
	 * @memberof PixivFunc
	 */
	async relogin() {
		//检查配置
		const refresh_token = PixivFunc.readConfig().refresh_token;
		if (!refresh_token) return false;
		//刷新token
		this.pixiv = new PixivApi();
		await this.pixiv.refreshAccessToken(refresh_token);
		Illustrator.setPixiv(this.pixiv);
		require('./illust').setPixiv(this.pixiv);
		//定时刷新token
		const p = this.pixiv;
		this.reloginInterval = setInterval(() => {
			p.refreshAccessToken(refresh_token);
		}, 40 * 60 * 1000);
		return true;
	}

	/**
	 * 清除定时重登陆
	 *
	 * @memberof PixivFunc
	 */
	clearReloginInterval() {
		clearInterval(this.reloginInterval);
	}

	/**
	 * 登出
	 *
	 * @static
	 * @memberof PixivFunc
	 */
	static logout() {
		const config = PixivFunc.readConfig();
		config.refresh_token = null;
		PixivFunc.writeConfig(config);
	}

	/**
	 * 取得我的关注（一次30个）
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密关注
	 * @returns 关注列表
	 * @memberof PixivFunc
	 */
	async getMyFollow(isPrivate = false) {
		let follows = [];
		let next = this.followNextUrl;
		let dir_Illustrator;

		if (!Fs.existsSync(__config.download.path)) Fs.mkdirSync(__config.download.path);
		//	if (Fs.existsSync(downJson)) follows =require(downJson) ;



		//加入画师信息
		async function addToFollows(data) {
			next = data.next_url;
			var offset = '';
			for (const preview of data.user_previews) {

				if (Tools.CheckExist(blacklist, preview.user.id)) {
					console.log('黑名单：\t (' + preview.user.id + ')');
					continue;
				} else {
					//除去“pixiv事務局”

					//去除画师名常带的摊位后缀，以及非法字符
					let iName = preview.user.name;
					let nameExtIndex = iName.search(/@|＠/);
					if (nameExtIndex >= 1) iName = iName.substring(0, nameExtIndex);
					iName = iName.replace(/[\/\\:*?"<>|.&\$]/g, '').replace(/[ ]+$/, '');



					dir_Illustrator = Path.join(__config.download.path, '(' + preview.user.id + ')' + iName);
					if (Tools.CheckExist(blacklist, preview.user.id)) 
						if (!Fs.existsSync(dir_Illustrator))
							Fs.mkdirSync(dir_Illustrator);

					follows.push(
						{
							id: preview.user.id,
							name: preview.user.name,
						}
					)
				}
			}
		}

		//开始收集
		if (next) {
			await this.pixiv.requestUrl(next).then(addToFollows);
		} else
			await this.pixiv
				.userFollowing(this.pixiv.authInfo().user.id, {
					restrict: isPrivate ? 'private' : 'public',
				})
				.then(addToFollows);


		this.followNextUrl = next;
		//this.followNextUrl = 'https://app-api.pixiv.net/v1/user/following?user_id=25160987&restrict=private&offset=5090';//{"offset":["Offset must be no more than 5000"]}
		//console.log('url:' + this.followNextUrl);
		//offset=this.followNextUrl;
		//console.log(offset);		



		return follows;
	}


	/**
	 * 是否还有关注画师可以取得
	 *
	 * @returns 是或否
	 * @memberof PixivFunc
	 */
	hasNextMyFollow() {
		return this.followNextUrl ? true : false;
	}

	/**
	 * 取得我的所有关注
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密关注
	 * @returns 关注列表
	 * @memberof PixivFunc
	 */
	async getAllMyFollow(isPrivate = false, aptend) {
		let follows = [];
		let historys = [];
		const processDisplay = Tools.showProgress(() => follows.length);
		let uid;

		if (!Fs.existsSync(downJson))//如果不存在downJson则创建
		{

			do {
				follows.push(...(await this.getMyFollow(isPrivate)));
				Fs.writeFileSync(downJson, JSON.stringify(follows));
			} while (this.followNextUrl && follows.length < 5000 - 30);

		}
		else if (aptend)//如果存在downJson则添加downJson中没有的到downJson末尾
		{

			follows = require(downJson);
			do {
				follows.push(...(await this.getMyFollow(isPrivate)));
				Fs.writeFileSync(downJson, JSON.stringify(follows));
			} while (this.followNextUrl && follows.length < 5000 - 30);

		}



		/////////////



		///////////////
		Tools.clearProgress(processDisplay);

		return follows;
	}

	/**
	 * 根据UID下载插画
	 *
	 * @param {*} uids 画师UID（可数组）
	 * @memberof PixivFunc
	 */
	async downloadByUIDs(uids) {
		const uidArray = Array.isArray(uids) ? uids : [uids];
		for (const uid of uidArray) {
			//判断作品是否在黑名单
			blacklist = require(blacklistJson)
			if (Tools.CheckExist(blacklist, uid)) {
				console.log('黑名单：\t (' + uid + ')');
				continue;
			}
			else {
				await Downloader.downloadByIllustrators([new Illustrator(uid)]).catch(e => {
					console.error(e);
				});

			}
		}
	}

	/**
	 * 根据收藏下载插画
	 *
	 * @param {boolean} [isPrivate=false] 是否私密
	 * @memberof PixivFunc
	 */
	async downloadBookmark(isPrivate = false) {
		const me = new Illustrator(this.pixiv.authInfo().user.id);
		await Downloader.downloadByBookmark(me, isPrivate);
	}

	/**
	 * 下载关注画师的所有插画
	 *
	 * @param {boolean} isPrivate 是否是私密关注
	 * @param {boolean} force 是否忽略上次进度
	 * @memberof PixivFunc
	 */

	async downloadFollowAll(isPrivate) {
		let follows = [];
		let illustrators = null;

		//临时文件
		;
		if (!Fs.existsSync(__config.download.path)) Fs.mkdirSync(__config.download.path);


		//取得关注列表

		if (!Fs.existsSync(downJson)) {
			console.log('\nCollecting your follows');


			await this.getAllMyFollow(isPrivate).then(ret => {
				illustrators = ret;
				/*
								follows = require(downJson);
								ret.forEach(uid => CheckExist(uid));
								
								
								Fs.writeFileSync(downJson, JSON.stringify(follows));
				/**/
				ret.forEach(
					illustrator => follows.push
						(
							{
								id: illustrator.id,
								name: illustrator.name,
							}
						)

				);
				/**/
			}
			);










		} else follows = require(downJson);

		//数据恢复
		if (!illustrators) {
			illustrators = [];
			for (const follow of follows) {
				const tempI = new Illustrator(follow.id, follow.name);
				tempI.exampleIllusts = follow.illusts;
				illustrators.push(tempI);
			}
		}

		//开始下载
		await Downloader.downloadByIllustrators(illustrators, () => {
			//			follows.shift();
			//			Fs.writeFileSync(downJson, JSON.stringify(follows));
		});

		//清除临时文件
		Fs.unlinkSync(downJson);
	}

	/**
	 * 对下载目录内的所有画师更新画作
	 *
	 * @memberof PixivFunc
	 */
	async downloadUpdate(aptend) {
		const uids = [];
		let follows = [];
		let historys = [];
		let illustrators = null;
		//得到文件夹内所有UID


		await Tools.readDirSync(__config.download.path).then(files => {
			for (const file of files) {
				const search = /^\(([0-9]+)\)/.exec(file);
				if (search) {
					uids.push(search[1]);
				}
			}
		});



		if (!Fs.existsSync(downJson))//如果不存在downJson则创建
		{
			uids.forEach(uid => follows.push(
				{
					id: parseInt(uid),

				}
			)
			);
			Fs.writeFileSync(downJson, JSON.stringify(follows));

		} else if (aptend)//如果存在downJson则添加downJson中没有的到downJson末尾
		{

			follows = require(downJson);
			uids.forEach(uid => Tools.CheckExist(follows, uid, downJson));
			////uids.forEach(uid => follows.push(new Illustrator(uid)));	


		}
		follows = require(downJson);
		//////////////////////////	
		if (!Fs.existsSync(historyJson))//如果不存在historyJson则创建
		{

			Fs.writeFileSync(historyJson, JSON.stringify(follows));

		} else if (aptend) //如果存在historyJson则添加historyJson中没有的到historyJson末尾
		{

			historys = require(historyJson);
			uids.forEach(uid => Tools.CheckExist(historys, uid, historyJson));
			////uids.forEach(uid => follows.push(new Illustrator(uid)));	


		}

		if (!illustrators) {
			illustrators = [];
			for (const follow of follows) {


				illustrators.push(new Illustrator(follow.id, follow.name));
			}
		}

		//开始下载
		await Downloader.downloadByIllustrators(illustrators, () => {

			//	console.log(
			follows.shift()
				//	)
				;


			Fs.writeFileSync(downJson, JSON.stringify(follows));
		});
		Fs.unlinkSync(downJson);


	}

	/**
	 * 获取工具
	 *
	 * @static
	 * @returns 工具
	 * @memberof PixivFunc
	 */
	static tools() {
		return require('./tools');
	}

	/**
	 * 根据PID下载插画
	 * @param {Array} pids 作品PID
	 * @memberof PixivFunc
	 */
	async downloadByPIDs(pids) {
		const jsons = [];
		const PIDdir = Path.join(__config.download.path, 'PID');
		if (!Fs.existsSync(PIDdir))
			Fs.mkdirSync(PIDdir);

		const exists = Fse.readdirSync(PIDdir)
			.map(file => {
				const search = /^\(([0-9]+)\)/.exec(file);
				if (search && search[1]) return search[1];
				return null;
			})
			.filter(pid => pid);
		for (const pid of pids) {
			if (exists.includes(pid)) continue;
			try {
				jsons.push(await this.pixiv.illustDetail(pid).then(json => json.illust));
			} catch (error) {
				console.log(`${pid} does not exist`.gray);
			}
		}
		await Downloader.downloadByIllusts(jsons);

	}
}
module.exports = PixivFunc;