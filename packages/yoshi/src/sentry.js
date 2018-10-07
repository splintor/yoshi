const { name, version } = require('../package');
const osName = require('os-name');
const Sentry = require('@sentry/node');
const chalk = require('chalk');
const { getEnvInfo, loadEnvInfo } = require('../src/env-info');
const path = require('path');

module.exports = () => {
  Sentry.init({
    dsn: 'https://9325f661ff804c4a94c48e8c2eff9149@sentry.io/1292532',
    release: `${name}@${version}`,
    beforeSend(event) {
      if (event.level === Sentry.Severity.Fatal) {
        console.log(
          chalk.red(
            '🤮  Oh, Yoshi just crashed. Care to help us with some feedback?',
          ),
        );
        console.log(
          `Go to ${chalk.green(
            `http://localhost:8080/?eventId=${event.event_id}`,
          )} to submit your feedback.`,
        );
      }

      return event;
    },
  });

  loadEnvInfo();

  Sentry.configureScope(async scope => {
    scope.setTag('node-version', process.version);
    scope.setTag('operating-system', osName());
  });

  process.removeAllListeners('unhandledRejection');

  process.on('unhandledRejection', err => {
    Sentry.withScope(async scope => {
      scope.addEventProcessor(event => {
        event.level = Sentry.Severity.Fatal;
        return event;
      });

      const info = await getEnvInfo();
      scope.setExtra('envinfo', info);

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
  });
};
