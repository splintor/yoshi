const path = require('path');
const globby = require('globby');
const sortedProjects = require('./sortedProjects');

module.exports = () => {
  return globby
    .sync('*', {
      cwd: path.join(__dirname, '../templates'),
      onlyFiles: false,
    })
    .sort((a, b) => {
      return sortedProjects.indexOf(a) - sortedProjects.indexOf(b);
    });
};
