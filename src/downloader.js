require('colors')
const Illust = require('./illust')
const Illustrator = require('./illustrator')
const Fs = require("fs")
const Fse = require('fs-extra')
    //const md5 = require('md5');

const Path = require("path")
const utils = require('./plugins/utils')
const pixivRefer = 'https://www.pixiv.net/'
let downthread = 0
let dlFileSize
let complete
let config
let Network = 0


let httpsAgent = false


function setConfig(conf) {
    config = conf
}

function setAgent(agent) {
    httpsAgent = agent
}


/**
 * 下载画师们的画作
 *
 * @param {Array<Illustrator>} illustrators 画师数组
 * @param {Function} callback 每成功下载完一个画师时运行的回调
 */
async function downloadByIllustrators(illustrators, callback) {


    for (let i in illustrators) {
        const illustrator = illustrators[i]

        const error = await illustrator.info().catch(e => e)
        if (error && error.status && error.status == 404) {
            console.log('\nIllustrator ' + 'uid '.gray + illustrator.id.toString().cyan + ' may have left pixiv or does not exist.')
            continue
        }

        console.log("\nCollecting illusts of " + (parseInt(i) + 1).toString().green + "/" + illustrators.length + " uid ".gray + illustrator.id.toString().cyan + " " + illustrator.name.yellow)

        if (utils.checkExist(global.blacklist, parseInt(illustrator.id))) {
            console.log('黑名单：\t (' + parseInt(illustrator.id) + ')')
            continue
        }
        global.historys = require(global.historyJson)

        utils.checkExist(historys, illustrator.id.toString(), historyJson, illustrator.name)
        complete = Path.join(tempdir, illustrator.id.toString())
        console.log(complete)

        //取得下载信息
        let info = await getDownloadListByIllustrator(illustrator)
        await illustrator.info().then(getIllustratorNewDir)
            //下载
        await downloadIllusts(info.illusts, Path.join(config.path, info.dir), config.thread)

        //回调
        if (typeof(callback) == 'function') callback(i)

        Fse.removeSync(complete)

    }
}



/**
 * 获得该画师需要下载的画作列表
 *
 * @param {Illustrator} illustrator
 * @returns
 */
async function getDownloadListByIllustrator(illustrator) {


    let illusts = []

    //得到画师下载目录
    let dir = await illustrator.info().then(getIllustratorNewDir)


    //检测网络
    function isonline() {
        var isOnline = require('is-online')
        isOnline({
            timeout: 2000,
            version: "v4" // v4 or v6
        }).then(online => {
            if (online) {
                //console.log("Network".green);
                Network = 100
                    //console.log(Network);
            } else {
                //console.log("Network".yellow);
                Network = 200
                    //console.log(Network);
            }
        })
    }
    isonline()
    await utils.sleep(1000)

    //最新画作检查
    let exampleIllusts = illustrator.exampleIllusts
    if (exampleIllusts) {
        let existNum = 0
        for (let ei of exampleIllusts) {
            if (Fs.existsSync(Path.join(config.path, dir, ei.file))) existNum++
                else illusts.push(ei)
        }
        if (existNum > 0) {
            return {
                dir,
                illusts: illusts.reverse()
            }
        }
    }


    //得到未下载的画作
    illusts = []
    let cnt
    let processDisplay = utils.showProgress(() => illusts.length)
    do {
        cnt = 0
        let temps = await illustrator.illusts()
        for (let temp of temps) {
            if (!Fs.existsSync(Path.join(config.path, dir, temp.file))) {
                illusts.push(temp)
                cnt++
            }
        }



    } while (illustrator.hasNext('illust') && cnt > 0 && illusts.length < 4500)
    utils.clearProgress(processDisplay)

    return {
        dir,
        illusts: illusts.reverse()
    }

}


/**
 * 下载自己的收藏
 *
 * @param {Illustrator} me 自己
 * @param {boolean} [isPrivate=false] 是否是私密
 * @returns
 */
async function downloadByBookmark(me, isPrivate = false) {
    //得到画师下载目录
    let dir = '[bookmark] ' + (isPrivate ? 'Private' : 'Public')

    console.log("\nCollecting illusts of your bookmark")

    //得到未下载的画作
    let illusts = []

    let processDisplay = utils.showProgress(() => illusts.length)

    let cnt
    do {
        cnt = 0
        let temps = await me.bookmarks(isPrivate)
        for (let temp of temps) {
            if (!Fs.existsSync(Path.join(config.path, dir, temp.file))) {
                illusts.push(temp)
                cnt++
            }
        }
    } while (me.hasNext('bookmark') && cnt > 0)

    utils.clearProgress(processDisplay)

    //下载
    await downloadIllusts(illusts.reverse(), Path.join(config.path, dir), config.thread)
}


/**
 * 多线程下载插画队列
 *
 * @param {Array<Illust>} illusts 插画队列
 * @param {string} dldir 下载目录
 * @param {number} configThread 下载线程
 * @returns 成功下载的画作数
 */
function downloadIllusts(illusts, dldir, configThread) {

    let totalI = 0

    //开始多线程下载
    let errorThread = 0
    let pause = false
    let hangup = 1000 * 60 * 1
    let errorTimeout = 1000 * 45

    //单个线程
    function singleThread(threadID) {

        return new Promise(async resolve => {
            while (true) {
                let i = totalI++
                    //线程终止
                    if (i >= illusts.length) return resolve(threadID)
                downthread = illusts.length
                let illust = illusts[i]

                let options = {
                        headers: {
                            referer: pixivRefer,
                        },
                        timeout: 1000 * 15,
                    }
                    //代理
                if (httpsAgent) options.httpsAgent = httpsAgent

                //开始下载

                console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().green}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                    //const processDisplay = utils.showProgress(() => `  [${threadID +1}]`);

                //console.log(downthread);


                await (async function tryDownload(times) {

                    if (times > 3) {
                        if (errorThread > 1) {
                            if (errorTimeout) clearTimeout(errorTimeout)
                            errorTimeout = setTimeout(() => {
                                console.log('\n' + '网络错误，暂停'.red + '\n')
                            }, 1000)
                            pause = true
                        } else return
                    }
                    if (pause) {
                        times = 1
                        await utils.sleep(hangup)
                        pause = false
                    }
                    //失败重试				
                    var tempDir = complete
                    return utils.download(tempDir, illust.file, illust.url, options, errorTimeout).then(async res => {
                            //文件完整性校验
                            let fileSize = res.headers['content-length']
                            let dlfile = Path.join(tempDir, illust.file)



                            for (let i = 0; i < 10 && !Fs.existsSync(dlfile); i++) await utils.sleep(200) ////

                            await utils.sleep(500)
                            dlFileSize = Fs.statSync(dlfile).size



                            if (!fileSize || dlFileSize == fileSize) //根据文件大小判断下载是否成功
                            {
                                //utils.clearProgress(processDisplay);

                                Fse.moveSync(dlfile, Path.join(dldir, illust.file)) //从缓存目录到下载目录

                            } else {
                                Fs.unlinkSync(dlfile)
                                throw new Error('Incomplete download')
                            }

                            if (times != 1) errorThread--
                        })
                        .catch(e => {
                            if (e && e.response && e.response.status == 404) {
                                console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().red}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                                return
                            } else if (times == 1) errorThread++
                                if (global.p_debug) console.log(e)
                            console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().yellow}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                            return tryDownload(times + 1)
                        })
                })(1)
            }
        })
    }

    let threads = []

    //开始多线程
    for (let t = 0; t < (Math.ceil(downthread / Network) + configThread) && t < configThread + 2; t++) //
    {

        threads.push(singleThread(t).catch(e => {
            console.log(e)
        }))

    }
    //return Promise.all(threads)
    function handlePromise(promiseList) {
        return promiseList.map(promise =>
            promise.then((res) => ({
                status: 'ok',
                res
            }), (err) => ({
                status: 'not ok',
                err
            }))
        )
    }
    return Promise.all(handlePromise(threads))
        //.then(res => console.log(res), err => console.log(err))

}


/**
 * 得到某个画师对应的下载目录名
 *
 * @param {*} data 画师资料
 * @returns 下载目录名
 */
async function getIllustratorNewDir(data) {
    //下载目录
    let mainDir = config.path
    if (!Fs.existsSync(mainDir)) utils.mkdirsSync(mainDir)
    let dldir = null

    //先搜寻已有目录
    await utils.readDirSync(mainDir).then(files => {
            for (let file of files) {
                if (file.indexOf('(' + data.id + ')') === 0) {
                    dldir = file
                    break
                }
            }
        })
        //去除画师名常带的摊位后缀，以及非法字符
    let iName = data.name
    let nameExtIndex = iName.search(/@|＠/)
    if (nameExtIndex >= 1) iName = iName.substring(0, nameExtIndex)
    iName = iName.replace(/[\/\\:*?"<>|.&\$]/g, '').replace(/[ ]+$/, '')
    let dldirNew = '(' + data.id + ')' + iName

    //决定下载目录
    if (!dldir) {
        dldir = dldirNew
    } else if (config.autoRename && dldir != dldirNew) {

        if (Fs.existsSync(Path.join(mainDir, dldirNew))) //如果新旧画师文件夹同时存在，遍历旧文件夹所有文件，覆盖方式移动到新文件夹内
        {
            console.log("已存在 %s", dldirNew.green)
            let fdir = Path.join(mainDir, dldir)
            let Fdir = Path.join(mainDir, dldirNew)

            await utils.readDirSync(fdir).then(files => {
                for (let file of files) {
                    Fse.moveSync(Path.join(fdir, file), Path.join(Fdir, file), {
                        overwrite: true
                    })
                }

            })
            Fse.removeSync(Path.join(mainDir, dldir)) //删除旧文件夹


        } else {
            Fs.renameSync(Path.join(mainDir, dldir), Path.join(mainDir, dldirNew))

        }
        console.log("\nDirectory renamed: %s => %s", dldir.yellow, dldirNew.green)

        dldir = dldirNew
    }

    return dldir
}


/**
 * 根据PID下载
 * @method downloadByIllusts
 * @param {Array} illustJSON 由API得到的画作JSON
 */
async function downloadByIllusts(illustJSON) {
    console.log()
    let illusts = []
    for (let json of illustJSON) {
        illusts = illusts.concat(await Illust.getIllusts(json))
    }
    await downloadIllusts(illusts, Path.join(config.path, 'PID'), config.thread)
        ////防止突破30次/min的限制
        //await utils.sleep(2000);
}




module.exports = {
    setConfig,
    setAgent,
    downloadByIllusts,
    downloadByIllustrators,
    downloadByBookmark
}