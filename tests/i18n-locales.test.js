import { describe, expect, it } from 'vitest';
const fs = require('node:fs');
const path = require('node:path');

const localesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const locales = ['en', 'zh-CN', 'ar'];

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenKeys(child, nextKey);
    }
    return [nextKey];
  }).sort();
}

describe('UI locale files', () => {
  it('keeps English, Chinese and Arabic translation keys aligned', () => {
    const keysByLocale = Object.fromEntries(locales.map((locale) => {
      const filePath = path.join(localesDir, `${locale}.json`);
      return [locale, flattenKeys(JSON.parse(fs.readFileSync(filePath, 'utf8')))];
    }));

    expect(keysByLocale.ar).toEqual(keysByLocale.en);
    expect(keysByLocale['zh-CN']).toEqual(keysByLocale.en);
  });
});
