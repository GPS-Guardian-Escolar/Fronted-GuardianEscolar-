module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/android/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'utils/routeGeometry.js',
    '!**/*.test.js',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
