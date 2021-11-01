#!/usr/bin/env node

const path = require('path');
const webpackMerge = require('webpack-merge');
const ESLintPlugin = require('eslint-webpack-plugin');
const StylelintPlugin = require('stylelint-webpack-plugin');
const RevolverPlugin = require('revolver-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');

const helpers = require('./helpers');

const cwd = process.cwd();

function _getJSConfig(currentCartridge, options) {
    const jsPathData = helpers.getJSPaths(currentCartridge, options);

    // Only generate a config if there's an `jsPathData.entryObject`.
    if (Object.keys(jsPathData.entryObject).length) {
        const outputPath = path.join(cwd, jsPathData.outputPath);

        // This call should be removed once upgrading to Webpack 5.20+, since it comes with a built-in.
        helpers.cleanDirs(outputPath);

        return {
            mode: helpers.envMode,
            entry: jsPathData.entryObject,
            name: `js-${currentCartridge}`,
            output: {
                path: outputPath,
                filename: '[name].js',
                chunkFilename: '[name].js',
                // clean: true
            },
            devtool: !helpers.isProduction ? 'cheap-module-source-map' : false,
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        exclude: [/node_modules/],
                        use: ['babel-loader'],
                    },
                ],
            },
            plugins: [new ESLintPlugin()],
            resolve: {
                plugins: (function (useRevolver) {
                    const plugins = [];

                    if (useRevolver) {
                        plugins.push(
                            new RevolverPlugin({
                                directoryList: options.cartridgePaths.paths,
                            }),
                        );
                    }

                    return plugins;
                }(options.cartridgePaths.useRevolver)),
                alias: options.cartridgePaths.aliases,
            },
            optimization: {
                splitChunks: {
                    minChunks: 2,
                },
            },
        };
    }
}

// BUG: if no additional cartridges exist, SCSS build fails
// steps: use default config files and have only app_storefront_base under cartridges
function _getSCSSConfig(currentCartridge, options) {
    const scssPathData = helpers.getSCSSPaths(currentCartridge, options);

    // Only generate a config if there's an `scssPathData.entryObject`.
    if (Object.keys(scssPathData.entryObject).length) {
        const outputPath = path.join(cwd, scssPathData.outputPath);

        // This call should be removed once upgrading to Webpack 5.20+, since it comes with a built-in.
        helpers.cleanDirs(outputPath);

        return {
            mode: helpers.envMode,
            entry: scssPathData.entryObject,
            name: `scss-${currentCartridge}`,
            output: {
                path: path.join(cwd, scssPathData.outputPath),
                filename: '[name].js',
            },
            devtool: !helpers.isProduction ? 'cheap-module-source-map' : false,
            module: {
                rules: [
                    {
                        test: /\.scss$/,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                            },
                            {
                                loader: 'css-loader',
                                options: {
                                    url: false,
                                    sourceMap: true,
                                },
                            },
                            {
                                loader: 'postcss-loader',
                                options: {
                                    sourceMap: true,
                                },
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    sourceMap: true,
                                    sassOptions: {
                                        includePaths:
                                            helpers.getIncludePaths(),
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            resolve: {
                alias: options.cartridgePaths.aliases,
            },
            plugins: [
                // Fixes: https://github.com/webpack-contrib/mini-css-extract-plugin/issues/151
                new FixStyleOnlyEntriesPlugin({ silent: true }),
                new MiniCssExtractPlugin({ filename: '[name].css' }),
                // BUG: If all files being built are ignored by stylelint, it will throw an error
                // similar to --allow-empty-input
                new StylelintPlugin(),
            ],
            stats: {
                chunksSort: 'name',
                modules: false,
                children: false,
                entrypoints: false,
                chunkOrigins: false,
            },
        };
    }
}

/**
 * Sets the configuration object per cartridge.
 * Only push configurations if there are <main>.js files found.
 * @param {[Array]} configList [description]
 * @param {[String]} currentCartridge  [description]
 */
function _setConfig(configList, options, currentCartridge) {
    const configScope = helpers.getConfigValue('scope');

    // Push back the new config into the configList.
    if (configScope === 'js') {
        const currentConfig = _getJSConfig(currentCartridge, options);

        if (currentConfig) {
            configList.push(currentConfig);
        }
    }

    if (configScope === 'scss') {
        const currentConfig = _getSCSSConfig(currentCartridge, options);

        if (currentConfig) {
            configList.push(currentConfig);
        }
    }
}

/**
 * Updates the build using a provided `customConfigList`.
 * This object is merged into the default build, `currentConfig`.
 * Matching properties are replaced.
 */
function _updateConfig(configList, customConfigList, mergeStrategy = {}) {
    configList.forEach((currentConfig, index) => {
        customConfigList.forEach((currentCustomConfig) => {
            if (
                currentConfig.name.indexOf(`${currentCustomConfig.name}`) !== -1
            ) {
                // See https://github.com/survivejs/webpack-merge#merging-with-strategies
                configList[index] = webpackMerge.smartStrategy(mergeStrategy)(
                    currentConfig,
                    currentCustomConfig,
                );
            }
        });
    });
}

/**
 * Starts the build.
 * @return {[Array]}     [description]
 */
function initConfig(customConfigList, mergeStrategy) {
    const scope = helpers.getConfigValue('scope');

    const cartridgeList = helpers.getCartridgeBuildList(scope);
    const options = {
        mainFiles: helpers.toArray(helpers.getConfigValue('mainFiles', scope)),
        getRootFiles: helpers.getConfigValue('rootFiles', scope),
        mainEntry: helpers.getConfigValue('mainEntry', scope),
        cartridgePaths: helpers.getCartridgePaths(scope),
    };
    const configList = [];

    cartridgeList.forEach(_setConfig.bind(this, configList, options));

    if (customConfigList) {
        _updateConfig(configList, customConfigList, mergeStrategy);
    }

    return configList;
}

exports.initConfig = initConfig;
