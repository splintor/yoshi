const envinfo = require('envinfo');

let envinfoCache = undefined;

function loadEnvInfo() {
  envinfoCache = envinfo.run(
    {
      System: ['OS', 'CPU'],
      Binaries: ['Node', 'Yarn', 'npm', 'Watchman'],
      Browsers: ['Chrome', 'Firefox', 'Safari'],
      npmPackages: [
        'yoshi-config',
        'yoshi-helpers',
        'yoshi-runtime',
        'babel-preset-yoshi',
        'eslint-config-yoshi',
        'eslint-config-yoshi-base',
        'jest-environment-yoshi-bootstrap',
        'jest-environment-yoshi-puppeteer',
        'jest-yoshi-preset',
        'tslint-config-yoshi',
        'tslint-config-yoshi-base',
        'webpack',
        'storybook',
      ],
    },
    { showNotFound: true, fullTree: true },
  );
}

async function getEnvInfo() {
  if (!envinfoCache) {
    loadEnvInfo();
  }

  return await envinfoCache;
}

module.exports = {
  loadEnvInfo,
  getEnvInfo,
};
