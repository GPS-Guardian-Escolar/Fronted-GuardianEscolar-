module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/android/'],
  collectCoverageFrom: [
    'services/**/*.js',
    'utils/routeGeometry.js',
    '!**/*.test.js',
  ],
};
