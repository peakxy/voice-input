import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extensionManifestPlugin(apiBaseUrl: string): Plugin {
  const backendOrigin = (() => {
    try {
      return new URL(apiBaseUrl).origin;
    } catch {
      return "http://localhost:8080";
    }
  })();

  return {
    name: "extension-manifest",
    generateBundle() {
      const manifest = {
        manifest_version: 3,
        name: "Voice Input",
        version: "0.1.0",
        description: "Contextual voice input powered by the Voice Input backend.",
        action: {
          default_title: "Voice Input",
          default_popup: "extension/popup.html",
        },
        side_panel: {
          default_path: "extension/sidepanel.html",
        },
        background: {
          service_worker: "assets/background.js",
          type: "module",
        },
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["assets/content.js"],
            run_at: "document_idle",
          },
        ],
        web_accessible_resources: [
          {
            resources: ["worklets/pcm-downsampler.js"],
            matches: ["<all_urls>"],
          },
        ],
        permissions: ["activeTab", "commands", "offscreen", "scripting", "sidePanel", "storage", "tabs"],
        host_permissions: [`${backendOrigin.replace(/\/$/, "")}/*`, "<all_urls>"],
        commands: {
          "open-recording-panel": {
            suggested_key: {
              default: "Ctrl+Shift+Y",
              mac: "Command+Shift+Y",
            },
            description: "Open the Voice Input side panel.",
          },
        },
      };

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "http://localhost:8080";

  return {
    base: "./",
    plugins: [react(), extensionManifestPlugin(apiBaseUrl)],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
    build: {
      outDir: "dist-extension",
      emptyOutDir: true,
      assetsDir: "assets",
      rollupOptions: {
        input: {
          popup: path.resolve(rootDir, "extension/popup.html"),
          sidepanel: path.resolve(rootDir, "extension/sidepanel.html"),
          offscreen: path.resolve(rootDir, "extension/offscreen.html"),
          background: path.resolve(rootDir, "src/extension/background.ts"),
          content: path.resolve(rootDir, "src/extension/content.ts"),
        },
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});
