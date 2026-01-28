// 使用 require 导入 JSON 文件以避免 TypeScript 的 JSON 模块解析问题
const defaultTemplate = require('./default.json');
const minimalTemplate = require('./minimal.json');
const scarletTemplate = require('./scarlet.json');
const orangeTemplate = require('./orange.json');
const elegantTemplate = require('./elegant.json');
const darkTemplate = require('./dark.json');
const academicTemplate = require('./academic.json');
const yebanTemplate = require('./yeban.json');
const yebanOrangeTemplate = require('./yeban-orange.json');
const darkgreenTemplate = require('./darkgreen.json');
const brownTemplate = require('./brown.json');
const blueLightTemplate = require('./blue-light.json');
const orangeVitalityTemplate = require('./orange-vitality.json');
const modernDarkTemplate = require('./modern-dark.json');
const magazineModernTemplate = require('./magazine-modern.json');
const literaryJournalTemplate = require('./literary-journal.json');
const cyberNeonTemplate = require('./cyber-neon.json');
const forestGreenTemplate = require('./forest-green.json');

export const templates = {
    default: defaultTemplate,
    minimal: minimalTemplate,
    scarlet: scarletTemplate,
    orange: orangeTemplate,
    elegant: elegantTemplate,
    dark: darkTemplate,
    academic: academicTemplate,
    yeban: yebanTemplate,
    'yeban-orange': yebanOrangeTemplate,
    darkgreen: darkgreenTemplate,
    brown: brownTemplate,
    'blue-light': blueLightTemplate,
    'orange-vitality': orangeVitalityTemplate,
    'modern-dark': modernDarkTemplate,
    'magazine-modern': magazineModernTemplate,
    'literary-journal': literaryJournalTemplate,
    'forest-green': forestGreenTemplate,
};