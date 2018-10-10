const dargs = require('dargs');
const crossSpawn = require('cross-spawn');
const {
  UserLandError,
  wrapErrorsWithUserLandError,
} = require('../../UserLandError');

const protractor = async (debugPort, debugBrkPort) => {
  let protractorBin;
  let webdriverBin;
  let protractorVersion;

  try {
    protractorVersion = /^(\d+)/
      .exec(require('protractor/package.json').version)
      .pop();

    protractorBin = require.resolve('protractor/bin/protractor');
    webdriverBin = require.resolve('protractor/bin/webdriver-manager');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new UserLandError(
        'Running this requires `protractor` >=5. Please install it and re-run.',
      );
    }

    throw error;
  }

  if (Number(protractorVersion) < 5) {
    throw new UserLandError(
      `The installed version of \`protractor\` is not compatible (expected: >= 5, actual: ${protractorVersion}).`,
    );
  }

  // Only install specific version of chrome driver in CI, install latest locally
  const webdriverManagerOptions = !!process.env.IS_BUILD_AGENT // eslint-disable-line no-extra-boolean-cast
    ? { 'versions.chrome': process.env.CHROMEDRIVER_VERSION || '2.29' }
    : {};

  const configPath = require.resolve('../../../config/protractor.conf.js');
  const defaultWebdriverOptions = { standalone: true, gecko: 'false' };
  const dargsSettings = {
    allowCamelCase: true,
    useEquals: false,
    ignoreFalse: false,
  };

  const webdriverArgs = dargs(
    { ...defaultWebdriverOptions, ...webdriverManagerOptions },
    dargsSettings,
  );

  const protractorArgs = [...dargs(dargsSettings), configPath];

  protractorArgs.unshift(protractorBin);

  if (debugBrkPort !== undefined) {
    protractorArgs.unshift(`--inspect-brk=${debugBrkPort}`);
  } else if (debugPort !== undefined) {
    protractorArgs.unshift(`--inspect=${debugPort}`);
  }

  return wrapErrorsWithUserLandError(() => {
    return new Promise((resolve, reject) => {
      const webDriverUpdate = crossSpawn(
        webdriverBin,
        ['update', ...webdriverArgs],
        {
          stdio: 'inherit',
        },
      );
      webDriverUpdate.on('exit', () => {
        const protractor = crossSpawn('node', protractorArgs, {
          stdio: 'inherit',
        });
        protractor.on('exit', code => {
          code === 0
            ? resolve()
            : reject(`protractor failed with status code "${code}"`);
        });
      });
    });
  });
};

module.exports = protractor;
