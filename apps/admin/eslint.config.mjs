import { defineConfig } from "eslint/config";

import { fsdConfig } from "@avocado/config/eslint-fsd";
import { nextAppConfig } from "@avocado/config/eslint-next";

export default defineConfig([...nextAppConfig, ...fsdConfig(import.meta.dirname)]);
