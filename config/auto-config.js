const { RINKEBY_CONFIG } = require("./rinkeby-config.js");

exports.GetConfig = function (chainId) {
    var CONFIG = {}
    switch (chainId) {
        case "4":
            CONFIG = RINKEBY_CONFIG
            break;
    }
    return CONFIG
}