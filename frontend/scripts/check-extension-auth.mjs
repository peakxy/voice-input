import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const srcRoot = path.join(frontendRoot, "src");

const aliasPlugin = {
  name: "alias-at",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^@\// }, (args) => {
      const basePath = path.join(srcRoot, args.path.slice(2));
      const resolvedPath = [basePath, `${basePath}.ts`, `${basePath}.tsx`].find((candidate) =>
        fs.existsSync(candidate),
      );
      return { path: resolvedPath ?? basePath };
    });
  },
};

const result = await build({
  entryPoints: [path.join(srcRoot, "extension", "auth.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  plugins: [aliasPlugin],
});

const mod = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

const calls = [];
globalThis.chrome = {
  runtime: {
    sendMessage: async (message) => {
      calls.push(message);
      return {
        ok: true,
        snapshot: {
          token: "token-123",
          user: { userId: 1, username: "admin" },
        },
      };
    },
  },
};

const snapshot = await mod.readExtensionAuthSnapshot();

assert.equal(snapshot.token, "token-123");
assert.deepEqual(snapshot.user, { userId: 1, username: "admin" });
assert.equal(calls.length, 1);
assert.deepEqual(calls[0], { target: "background", type: "auth-get-snapshot" });

console.log("extension auth bridge ok");
