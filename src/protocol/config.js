const Fs = require('fs-extra');
const Path = require('path');

const pxrepodir = Path.resolve(__dirname, '..');
const configFileDir = Path.join(pxrepodir, 'config');
const configFile = Path.join(configFileDir, 'config.json');

const writeConfig = (config = { registered: false, port: 0 }) => {
  Fs.ensureDirSync(configFileDir);
  Fs.writeJsonSync(configFile, config);
  return config;
};

const readConfig = () => Fs.readJsonSync(configFile);

const getConfig = () => {
  try {
    return readConfig();
  } catch (error) {
    return writeConfig();
  }
};

const data = getConfig();

module.exports = {
  data,
  modify: obj => writeConfig(Object.assign(data, obj)),
};
