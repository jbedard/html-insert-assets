const { main } = require("./main");

process.exitCode = main(process.argv.slice(2));
