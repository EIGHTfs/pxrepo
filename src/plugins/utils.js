const fs = require('fs')
const fse = require('fs-extra')
const Readline = require('readline')
const Axios = require('axios')
const Path = require('path')


function readJsonSafely(path, defaultValue) {
    if (!fse.existsSync(path)) return defaultValue
    try {
        return fse.readJsonSync(path)
    } catch (error) {}
    return defaultValue
}
/**
 * 读取目录下的内容
 *
 * @param {string} dirpath 目录路径
 * @returns 目录下的文件列表
 */
function readDirSync(dirpath) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirpath, (e, files) => {
            if (e) reject(e)
            else resolve(files)
        })
    })
}

function showProgress(valFn) {
    return setInterval(() => {
        Readline.clearLine(process.stdout, 0)
        Readline.cursorTo(process.stdout, 0)
        process.stdout.write('Progress: ' + `${valFn()}`.green)
    }, 500)
}

function clearProgress(interval) {
    clearInterval(interval)
    Readline.clearLine(process.stdout, 0)
    Readline.cursorTo(process.stdout, 0)
}


function mkdirsSync(dirpath) {
    let parentDir = Path.dirname(dirpath)
        //如果目标文件夹不存在但是上级文件夹存在
    if (!fs.existsSync(dirpath) && fs.existsSync(parentDir)) {
        fs.mkdirSync(dirpath)
    } else {
        mkdirsSync(parentDir)
        fs.mkdirSync(dirpath)
    }
}

async function foldersMerge(folderOld, folderNew) {
    if (fs.existsSync(folderNew)) //如果新旧画师文件夹同时存在，遍历旧文件夹所有文件，覆盖方式移动到新文件夹内
    {
        console.log("已存在 %s", folderNew.red)

        await readDirSync(folderOld).then(files => {
            for (let file of files) {
                fse.moveSync(Path.join(folderOld, file), Path.join(folderNew, file), {
                    overwrite: true
                })
            }

        })
        fse.removeSync(folderOld) //删除旧文件夹


    } else {
        fs.renameSync(folderOld, folderNew)

    }
}


function jsonIndexOf(uid, json) {
    for (let i in json) {
        var item = json[i].id
            //console.log(item)
        if (item == uid) {
            return i
        }

    }

    return -1
}

function checkExist(items, uid, jsonFile) {
    //console.log(jsonIndexOf(uid, items))
    if (jsonIndexOf(uid, items) == -1) {
        if (jsonFile != null) {

            console.log({
                id: parseInt(uid),
            })
            items.push({
                id: parseInt(uid),
            })


            fs.writeFileSync(jsonFile, JSON.stringify(items))
        }
        return false
    } else return true
}

function showExists(jsonFile) {
    let json = require(jsonFile)
    console.log(json)
}

function deleteExist(uid, jsonFile) {
    let json = require(jsonFile)
    json.splice(jsonIndexOf(uid, json), 1)

    return json
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

class UgoiraDir {
    constructor(dirpath) {
        this.files = new Set(
            fse.existsSync(dirpath) ?
            fse.readdirSync(dirpath)
            .filter(file => file.endsWith('.zip'))
            .map(file => file.replace(/@\d+?ms/g, '')) : []
        )
    }

    existsSync(file) {
        return this.files.has(file.replace(/@\d+?ms/g, ''))
    }
}

function isOnline() {
    var isOnline = require('is-online')
    isOnline({
        timeout: 2000,
        version: "v4" // v4 or v6
    }).then(online => {
        if (online) {
            //console.log("Network".green);
            return 100
                //console.log(Network);
        } else {
            //console.log("Network".yellow);
            return 200
                //console.log(Network);
        }
    })

}

function RemoveIllegalCharacters() {


}

module.exports = {
    readDirSync,
    showProgress,
    clearProgress,
    UgoiraDir,
    mkdirsSync,
    foldersMerge,
    readJsonSafely,
    checkExist,
    sleep,
    showExists,
    deleteExist,
    isOnline,

}