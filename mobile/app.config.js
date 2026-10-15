// Adds the Firebase config for push notifications when google-services.json is present
// (it is kept out of git; copy it here from ../secrets before building).
const fs = require('fs');

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(fs.existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
  },
});
