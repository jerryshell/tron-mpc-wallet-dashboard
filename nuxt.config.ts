// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@vueuse/nuxt"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  compatibilityDate: "2026-06-17",

  routeRules: {
    "/api/**": {
      cors: true,
    },
  },

  ui: {
    fonts: false,
  },

  typescript: {
    // @fystack/mpcium-ts 的 package.json "exports" 缺少 "types" 条件，
    // 导致 moduleResolution: "Bundler" 下无法解析类型声明。
    // 通过 paths 指向其 .d.ts，运行时仍由 exports 解析 JS。
    tsConfig: {
      compilerOptions: {
        paths: {
          "@fystack/mpcium-ts": ["../node_modules/@fystack/mpcium-ts/dist/types/index.d.ts"],
        },
      },
    },
  },

  nitro: {
    // 同上，注入到 Nitro 生成的 server tsconfig (.nuxt/tsconfig.server.json)
    typescript: {
      tsConfig: {
        compilerOptions: {
          paths: {
            "@fystack/mpcium-ts": ["../node_modules/@fystack/mpcium-ts/dist/types/index.d.ts"],
          },
        },
      },
    },
  },
});
