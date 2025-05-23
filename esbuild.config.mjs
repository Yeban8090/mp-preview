import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === "production";

const config = {
    banner: {
        js: banner,
    },
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        ...builtins
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
};

// 修改 CSS 配置部分
const cssConfig = {
    entryPoints: ['src/styles/index.css'],
    bundle: true,
    outfile: 'styles.css', // 直接输出到项目根目录
    allowOverwrite: true
};

if (prod) {
    await Promise.all([
        esbuild.build(config),
        esbuild.build(cssConfig)
    ]).catch(() => process.exit(1));
} else {
    const [jsContext, cssContext] = await Promise.all([
        esbuild.context(config),
        esbuild.context(cssConfig)
    ]);
    
    await Promise.all([
        jsContext.watch(),
        cssContext.watch()
    ]);
    
    console.log("⚡ 正在监听 JavaScript 和 CSS 变更...");
}