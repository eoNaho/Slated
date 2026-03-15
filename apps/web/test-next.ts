import type { NextConfig } from "next";

const config: NextConfig = {};
console.log("Only types imported, but if this runs, module resolution worked somewhat.");

import next from "next";
console.log("Next default export:", typeof next);
