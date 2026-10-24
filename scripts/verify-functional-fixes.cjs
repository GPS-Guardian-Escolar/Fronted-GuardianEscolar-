/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relativePath });
  return module.exports;
}

function encodePolyline(points) {
  let previousLatitude = 0;
  let previousLongitude = 0;
  let output = '';
  for (const point of points) {
    for (const [value, previous] of [[point.latitude, previousLatitude], [point.longitude, previousLongitude]]) {
      let delta = Math.round(value * 1e5) - previous;
      delta = delta < 0 ? ~(delta << 1) : delta << 1;
      while (delta >= 0x20) {
        output += String.fromCharCode((0x20 | (delta & 0x1f)) + 63);
        delta >>= 5;
      }
      output += String.fromCharCode(delta + 63);
    }
    previousLatitude = Math.round(point.latitude * 1e5);
    previousLongitude = Math.round(point.longitude * 1e5);
  }
  return output;
}

async function main() {
  const validators = loadModule('utils/validators.js');
  assert.equal(validators.isValidPersonName('Ana María'), true);
  assert.equal(validators.isValidPersonName('A'), false);
  assert.equal(validators.isValidPersonName('Ab', { min: 3, max: 60 }), false);
  assert.equal(validators.isValidPersonName('Ana', { min: 3, max: 60 }), true);
  assert.equal(validators.isValidPersonName('A'.repeat(61)), false);
  assert.equal(validators.isValidPersonName('Ana123'), false);
  assert.equal(validators.isValidPersonName('Anaaaaa'), false);
  assert.equal(validators.isValidPersonName('Annnna'), false);
  assert.equal(validators.isValidPhone('3001234567'), true);
  assert.equal(validators.isValidPhone('+573001234567'), true);
  assert.equal(validators.isValidPhone('3333333333'), false);
  assert.equal(validators.isValidPhone('4444444444'), false);
  assert.equal(validators.isValidPhone('3222222222'), false);
  assert.equal(validators.isValidPhone('3777777777'), false);
  assert.equal(validators.isValidPhone('3000000000'), false);
  assert.equal(validators.isValidPhone('3999999999'), false);
  assert.equal(validators.isValidPhone('3444444444'), false);
  assert.equal(validators.isValidPhone('3455555555'), false);
  assert.equal(validators.isValidPhone('3111111111'), false);
  assert.equal(validators.isValidPhone('3221234567'), true);
  assert.equal(validators.normalizeColombianPhoneInput('+57 300 123 4567'), '3001234567');

  const calls = [];
  const api = {
    get: async url => {
      calls.push(['get', url]);
      return { data: { inactivityAlert: false, emailChannel: true, smsChannel: false, smsAvailable: false } };
    },
    put: async (url, body) => {
      calls.push(['put', url, body]);
      return { data: { ...body, smsAvailable: false } };
    },
  };
  const { notificationService } = loadModule('services/notification.service.js', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-device': { isDevice: false },
    'expo-constants': { expoConfig: {} },
    './api': { __esModule: true, default: api },
  });
  const initial = await notificationService.getPreferences();
  assert.equal(initial.alertaInactividad, false);
  assert.equal(initial.canalEmail, true);
  const saved = await notificationService.updatePreferences({ alertaInactividad: true, canalEmail: false, canalSms: false });
  assert.equal(saved.alertaInactividad, true);
  assert.equal(saved.canalEmail, false);
  assert.equal(calls[1][1], '/notifications/settings');
  assert.equal(calls[1][2].inactivityAlert, true);
  assert.equal(calls[1][2].emailChannel, false);
  assert.equal('alertaInactividad' in calls[1][2], false);

  const origin = { latitude: 4.6, longitude: -74.1 };
  const stop = { latitude: 4.61, longitude: -74.09 };
  const destination = { latitude: 4.62, longitude: -74.08 };
  let segments = [[origin, stop], [stop, destination]];
  const { calculateRouteGeometry } = loadModule('utils/routeGeometry.js', {
    '../services/maps.service': { mapsService: { directions: async () => ({ overviewPolyline: encodePolyline(segments.shift()) }) } },
  });
  const route = {
    originLatitude: origin.latitude, originLongitude: origin.longitude,
    destinationLatitude: destination.latitude, destinationLongitude: destination.longitude,
    stops: [{ stopOrder: 1, latitude: stop.latitude, longitude: stop.longitude }],
  };
  const geometry = await calculateRouteGeometry(route);
  assert.equal(geometry.length, 3);
  assert.equal(geometry[0].latitude, origin.latitude);
  assert.equal(geometry[2].latitude, destination.latitude);
  segments = [[{ latitude: 5, longitude: -74 }, stop], [stop, destination]];
  await assert.rejects(calculateRouteGeometry(route), /ruta calculada/);

  const history = loadModule('utils/tripHistory.js');
  const date = new Date(2026, 9, 24, 12, 0, 0);
  assert.equal(history.toLocalDateKey(date), '2026-10-24');
  assert.equal(history.matchesHistoryStatus({ estado: 'En Proceso', alerta: false }, 'En Proceso'), true);
  assert.equal(history.matchesHistoryStatus({ estado: 'En Proceso', alerta: true }, 'En Proceso'), false);
  assert.equal(history.matchesHistoryStatus({ estado: 'En Proceso', alerta: true }, 'Con Incidente'), true);
  assert.equal(history.getHistoryStatusKind({ estado: 'Completado' }), 'completed');

  console.log('Validación, preferencias y geometría: verificadas.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
