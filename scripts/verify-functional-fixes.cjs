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
    setTimeout,
    console,
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
  assert.equal(validators.isValidPersonName('aaa', { min: 3, max: 60 }), false);
  assert.equal(validators.isValidPersonName('Alberto', { min: 3, max: 60 }), true);
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
  for (const text of ['Ana1', 'aaa', 'Pepeeeee', 'Ab'.repeat(31)]) {
    assert.equal(validators.validateInputEdit(text, 'name'), false, text);
  }
  for (const text of ['', 'A', 'An', 'Ana María', "O'Neill", 'Jean-Luc']) {
    assert.equal(validators.validateInputEdit(text, 'name'), true, text);
  }
  for (const text of ['322222', '3444444444', '300000', '3333333333', '30012345678', '4', '3x']) {
    assert.equal(validators.validateInputEdit(text, 'phone'), false, text);
  }
  const realFormat = '3001234567';
  assert.equal(validators.validateInputEdit('Pepeeee', 'name', 'Pepeeeee'), true);
  assert.equal(validators.validateInputEdit('322222222', 'phone', '3222222222'), true);
  assert.equal(validators.validateInputEdit('Ana María', 'name'), true);
  assert.equal(validators.validateInputEdit('3001234567', 'phone'), true);

  const formSources = [
    fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'student.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'profile.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '..', 'app', '(auth)', 'register.js'), 'utf8'),
  ];
  assert.equal(formSources.every(source => source.includes('validateInputEdit')), true);
  assert.match(formSources[0], /setInputNotice\(message\)/);
  assert.match(formSources[0], /<Snackbar visible=\{!!inputNotice\}/);
  assert.match(formSources[2], /accessibilityRole="alert"/);
  for (let end = 0; end <= realFormat.length; end++) {
    assert.equal(validators.validateInputEdit(realFormat.slice(0, end), 'phone'), true);
  }

  const calls = [];
  const api = {
    get: async url => {
      calls.push(['get', url]);
      return { data: { inactivityAlert: false, emailChannel: true } };
    },
    put: async (url, body) => {
      calls.push(['put', url, body]);
      return { data: body };
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
  const saved = await notificationService.updatePreferences({ alertaInactividad: true, canalEmail: false });
  assert.equal(saved.alertaInactividad, true);
  assert.equal(saved.canalEmail, false);
  assert.equal(calls[1][1], '/notifications/settings');
  assert.equal(calls[1][2].inactivityAlert, true);
  assert.equal(calls[1][2].emailChannel, false);
  assert.equal('alertaInactividad' in calls[1][2], false);

  const qr = loadModule('features/child-link/qrPayload.js');
  const payload = qr.buildQrPayload({ studentId: 'student-1', code: 'link-code' });
  assert.equal(qr.parseQrValue(qr.encodeQrValue(payload)).payload.code, 'link-code');
  assert.equal(qr.parseQrValue('{"v":1,"s":"student-1"}').ok, false);

  const trackingCalls = [];
  const { trackingService } = loadModule('services/tracking.service.js', {
    './api': { __esModule: true, default: {
      post: async (...args) => { trackingCalls.push(args); return { data: {} }; },
      patch: async (...args) => { trackingCalls.push(args); return { data: {} }; },
    } },
  });
  await trackingService.startTrip({ studentId: 'student-1' }, { childToken: 'device-token' });
  await trackingService.addCoordinate('trip-1', { latitude: 4, longitude: -74 }, { childToken: 'device-token' });
  await trackingService.updateStatus('trip-1', { status: 'COMPLETED' }, { childToken: 'device-token' });
  for (const call of trackingCalls) {
    assert.equal(call[2].skipAuth, true);
    assert.equal(call[2].headers.Authorization, 'Bearer device-token');
  }
  const memory = new Map();
  const storage = {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => memory.set(key, value),
    removeItem: async key => memory.delete(key),
  };
  const delivered = [];
  const location = loadModule('services/background/locationTracking.js', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'expo-location': {}, 'expo-notifications': {}, 'expo-secure-store': {}, 'expo-task-manager': {},
    'react-native': { Platform: { OS: 'web' } }, '../../theme/tokens': { lightColors: {} },
    '../tracking.service': { trackingService: { addCoordinate: async (tripId, coord, auth) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      delivered.push({ tripId, coord, auth });
    } } },
  });
  await location.saveChildSession({ childToken: 'device-token', studentId: 'student-1', code: 'link-code' });
  assert.equal((await location.getChildSession()).studentCode, 'link-code');
  await storage.setItem(location.ACTIVE_TRIP_ID_KEY, 'trip-1');
  const point = index => ({ latitude: 4 + index * 0.001, longitude: -74, accuracy: 10, recordedAt: new Date(1700000000000 + index * 60000).toISOString() });
  await location.enqueueCoordinate(point(0));
  // GPS callbacks arriving during HTTP delivery must not be overwritten by the flush.
  await Promise.all([location.flushQueue(), location.enqueueCoordinate(point(1)), location.enqueueCoordinate(point(2))]);
  await location.stopBackgroundUpdates({ preserveTrip: true });
  assert.equal(await location.getActiveTripId(), 'trip-1');
  await location.flushQueue();
  assert.equal(delivered.length, 3);
  assert.equal(await location.getQueueSize(), 0);
  assert.equal(delivered[2].auth.childToken, 'device-token');
  await location.enqueueCoordinate({ ...point(3), latitude: 91 });
  assert.equal(await location.getQueueSize(), 0);
  await location.stopBackgroundUpdates();
  assert.equal(await location.getActiveTripId(), null);

  for (const locale of ['es', 'en', 'fr', 'pt']) {
    const translations = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', `${locale}.json`), 'utf8'));
    for (const key of ['inputNameBlocked', 'inputPhoneBlocked', 'trackingPendingLocations']) {
      assert.equal(typeof translations[key], 'string');
      assert.equal(/[\p{L}]\?[\p{L}]|\uFFFD/u.test(translations[key]), false);
    }
  }

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

  console.log('Input validation, email preferences, QR, child authentication, concurrent GPS queue, translations, history and route geometry: passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
