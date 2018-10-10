const { name, version } = require('../package');
const osName = require('os-name');
const Sentry = require('@sentry/node');
const chalk = require('chalk');
const { getEnvInfo, loadEnvInfo } = require('../src/env-info');
const path = require('path');
const findPkg = require('find-pkg');
const { inTeamCity } = require('yoshi-helpers/queries');
const { UserLandError } = require('./UserLandError');

module.exports = () => {
  Sentry.init({
    dsn: 'https://9325f661ff804c4a94c48e8c2eff9149@sentry.io/1292532',
    release: `${name}@${version}`,
    beforeSend(event) {
      if (event.level === Sentry.Severity.Fatal) {
        printCrashInfo(event.event_id);
      }

      return event;
    },
  });

  loadEnvInfo();

  Sentry.configureScope(async scope => {
    scope.setTag('node-version', process.version);
    scope.setTag('os', osName());
    scope.setTag('NODE_ENV', process.env.NODE_ENV);
    scope.setTag('CI', !!inTeamCity());
  });

  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');

  process.on('uncaughtException', handleError);
  process.on('unhandledRejection', handleError);
};

function handleError(err) {
  if (err instanceof UserLandError) {
    if (err.original.name !== 'WorkerError') {
      console.error(err.original.message || err.original);
    }

    process.exit(1);
  }

  Sentry.withScope(async scope => {
    scope.addEventProcessor(event => {
      event.level = Sentry.Severity.Fatal;
      return event;
    });

    try {
      const packageJson = require(findPkg.sync(process.cwd()));
      scope.setTag('package', packageJson.name);
    } catch (_) {}

    const info = await getEnvInfo();
    scope.setExtra('envInfo', info);

    const pkg = require(path.resolve(process.cwd(), 'package.json'));
    let yoshiConfig = 'Zero config';

    if (pkg.yoshi) {
      yoshiConfig = JSON.stringify(pkg.yoshi, null, 2);
    }

    scope.setExtra('yoshiConfig', yoshiConfig);

    await Sentry.getCurrentHub()
      .getClient()
      .captureException(err, undefined, scope);

    process.exit(1);
  });
}

function outputURL(url) {
  return chalk.cyan(url);
}

function printCrashInfo(eventId) {
  console.log();
  console.log(
    chalk.redBright(
      `🤮  Oh no, Yoshi just crashed! ${chalk.yellow(`Event ID = ${eventId}`)}`,
    ),
  );
  console.log();
  console.log('  Here are a few options on what you can do now:');
  console.log();
  console.log(
    `    * Help us figure out what caused the crash by submitting feedback on the error. You can do that by going to:`,
  );
  console.log(
    `      ${outputURL(
      `https://wix.github.io/yoshi/error-feedback/?eventId=${eventId}`,
    )}`,
  );
  console.log();
  console.log(`    * Find us on slack on the #yoshi channel:`);
  console.log(`      ${outputURL('https://wix.slack.com/messages/yoshi/')}`);
  console.log();
  console.log(
    '    * Open a bug report on our github repository (be sure to include your event id):',
  );
  console.log(
    `      ${outputURL(
      `https://github.com/wix/yoshi/issues/new?template=BUG_REPORT.md&labels=%F0%9F%90%9B%20Bug`,
    )}`,
  );
  console.log();
}
