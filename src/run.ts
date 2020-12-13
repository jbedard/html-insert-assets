"use strict";

import { main } from "./main";

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  console.error(`${e}.\n\nSee ${process.title} --help`);
  process.exitCode = 1;
}
