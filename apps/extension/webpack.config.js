const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => ({
  entry: {
    background: './src/background/service-worker.ts',
    popup: './src/popup/popup.tsx',
    offscreen: './src/offscreen/offscreen.ts',
    setup: './src/setup/setup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/offscreen/offscreen.html', to: 'offscreen.html' },
        { from: 'src/setup/setup.html', to: 'setup.html' },
        {
          from: 'icons',
          to: 'icons',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devtool: argv.mode === 'development' ? 'cheap-module-source-map' : false,
});
