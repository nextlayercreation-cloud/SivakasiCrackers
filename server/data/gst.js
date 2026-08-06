const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function getGST() {
  const data = JSON.parse(
    fs.readFileSync(SETTINGS_FILE, 'utf8')
  );

  return Number(data.gstPercentage || 0);
}

function setGST(value) {
  const data = {
    gstPercentage: Number(value)
  };

  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(data, null, 2)
  );

  return data;
}

module.exports = {
  getGST,
  setGST
};