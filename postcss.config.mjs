import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Avoid resolving Tailwind from parent cwd when the app is started via --prefix.
      base: projectRoot,
    },
  },
};

export default config;
