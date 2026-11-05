const baseConfig = require('./app.json');

// EAS puede exponer la clave como GOOGLE_MAPS_API_KEY sin publicar el nombre
// de la variable usada por el bundle web.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  || process.env.GOOGLE_MAPS_API_KEY
  || '';
const studentLinkHost = (() => {
  const configuredUrl = process.env.EXPO_PUBLIC_STUDENT_LINK_BASE_URL || '';
  try {
    return new URL(configuredUrl).hostname;
  } catch {
    // Render serves the production QR links from the same web service.
    return 'gps-guardian-escolar-frontend.onrender.com';
  }
})();

module.exports = {
  ...baseConfig.expo,
  android: {
    ...baseConfig.expo.android,
    intentFilters: [
      ...(baseConfig.expo.android?.intentFilters || []),
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: studentLinkHost, pathPrefix: '/scan-qr' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    config: {
      ...(baseConfig.expo.android?.config || {}),
      googleMaps: {
        ...(baseConfig.expo.android?.config?.googleMaps || {}),
        apiKey: googleMapsApiKey,
      },
    },
  },
  ios: {
    ...baseConfig.expo.ios,
    config: {
      ...(baseConfig.expo.ios?.config || {}),
      googleMapsApiKey,
    },
  },
  extra: {
    ...(baseConfig.expo.extra || {}),
    eas: {
      ...(baseConfig.expo.extra?.eas || {}),
      projectId: '368acaa4-e953-4515-b958-4bcf16b5aa2b',
    },
  },
};
