import { defineConfig } from "eslint/config";

import { nextAppConfig } from "@avocado/config/eslint-next";

export default defineConfig([...nextAppConfig]);
