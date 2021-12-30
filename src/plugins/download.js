const fs = require('fs')
const fse = require('fs-extra')
const Readline = require('readline')
const Axios = require('axios')
const Path = require('path')

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption, errorTimeout) {
    console.time(filename)
    fse.ensureDirSync(dirpath)
    axiosOption.responseType = 'stream'

    const response = await Axios.create(axiosOption).get(global.cf ? url.replace('i.pximg.net', 'i-cf.pximg.net') : url.replace('i-cf.pximg.net', 'i.pximg.net'))
    const data = response.data

    return new Promise((reslove, reject) => {
        data.pipe(fse.createWriteStream(Path.join(dirpath, filename)))
        data.on('end', () => {
            console.timeEnd(filename)
            reslove(response)
        })
        data.on('error', reject)
        setTimeout(() => {
            //console.warn(`Promise time out:${errorTimeout}`)
            reject('Promise time out')
        }, errorTimeout)
    })
}


module.exports = {
    download,

}