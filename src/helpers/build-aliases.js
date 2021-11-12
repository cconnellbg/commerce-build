// const tglob = require('tiny-glob');
// const glob = require('fast-glob');
const glob = require('glob');
const { join } = require('path');

const { constructPath } = require('../utils/construct-path');

// const buildAlias = async (aliasObject, currentCartridgePart, defaultInputPath, options) => {
//     const files = await glob(`${options.mainPath}/*/`);
//     const aliases = {};

//     console.log(files);

//     files.forEach((currentDir) => {
//         const currentLocale = currentDir.substring(options.mainDirIndex).split('/')[1];
//         const localeInputPath = constructPath(
//             options.mainPath,
//             currentLocale,
//             options.aliasDir,
//         );

//         aliases[`${currentCartridgePart}/${currentLocale}`] = join(cwd, localeInputPath);
//     });

//     console.log(aliases);
//     return aliases;
// };

/**
 * Generates full paths for each alias.
 * Each cartridge~alias pair will always point to the same path.
 * Returns a mutated `aliasObject` with the path data.
 */
/**
 * Generates full paths for each alias.
 * Each cartridge~alias pair will always point to the same path.
 *
 * @param {array} cartridgeParts Array of [cartridge, alias]
 * @param {String} inputPath cartridge scope input to build alias path
 * @param {Object} options
 * @return {Object} Returns a mutated `aliasObject` with the path data.
 */
function buildAliases(cartridgeParts, inputPath, options) {
    const cwd = process.cwd();
    let aliasObject = {};

    cartridgeParts.forEach((part) => {
        if (options.useLocales) {
            // add '/*' to select the folders one level down.
            // this is where the locale folders live
            const locales = glob.sync(`${options.mainPath}/*`);

            locales.forEach((currentDir) => {
                const currentLocale = currentDir.substring(options.mainDirIndex).split('/')[1];
                const localeInputPath = constructPath(options.mainPath, currentLocale, options.aliasDir);

                aliasObject[`${part}/${currentLocale}`] = join(cwd, localeInputPath);
            });
        }

        const alias = {};
        alias[part] = join(cwd, inputPath);

        aliasObject = {
            ...aliasObject,
            ...alias,
        };
    });

    return aliasObject;
}

exports.buildAliases = buildAliases;
