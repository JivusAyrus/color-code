// Allows absolute paths
require('module-alias/register');

const express = require('express');
const app = express();
const port = parseInt(process.env.PORT || '') || 3000;

const themes = require('@root/out/tests/themes_custom');

app.use(express.json());

const langExtensions = {
  batch: '.bat',
  c: '.c',
  'c++': '.cpp',
  clojure: '.clj',
  css: '.css',
  dockerfile: '.dockerfile',
  go: '.go',
  html: '.html',
  jade: '.jade',
  java: '.java',
  javascript: '.js',
  javascriptreact: '.jsx',
  json: '.json',
  markdown: '.md',
  'objective-c': '.m',
  perl: '.pl',
  php: '.php',
  powershell: '.ps1',
  properties: '.properties',
  python: '.py',
  r: '.r',
  ruby: '.rb',
  rust: '.rs',
  scss: '.scss',
  shellscript: '.sh',
  sql: '.sql',
  swift: '.swift',
  typescript: '.ts',
  typescriptreact: '.tsx',
  xml: '.xml',
  yaml: '.yaml',
  graphql: '.graphql',
  haskell: '.hs',
  matlab: '.m',
};

const getTheme = {
  abyss: ['Abyss.tmTheme'],
  dark_vs: ['dark_vs.json'],
  light_vs: ['light_vs.json'],
  hc_black: ['hc_black.json'],
  dark_plus: ['dark_plus.json', 'dark_vs.json'],
  light_plus: ['light_plus.json', 'light_vs.json'],
  kimbie_dark: ['Kimbie_dark.tmTheme'],
  monokai: ['Monokai.tmTheme'],
  monokai_dimmed: ['dimmed-monokai.tmTheme'],
  quietlight: ['QuietLight.tmTheme'],
  red: ['red.tmTheme'],
  solarized_dark: ['Solarized-dark.tmTheme'],
  solarized_light: ['Solarized-light.tmTheme'],
  tomorrow_night_blue: ['Tomorrow-Night-Blue.tmTheme'],
};

app.get('/', (req, res) => {
  res.send('UP');
});

app.post('/color-codes', async (req, res) => {
  const code = req.body.code || '';
  const theme = req.body.theme || 'dark_plus';
  const language = req.body.language || 'javascript';

  try {
    if (!code.trim()) {
      const err = new Error(`code not found in request`);
      err.status = 400;
      throw err;
    }

    console.log('theme:', theme, '  language:', language);

    if (!(theme in getTheme)) {
      const err = new Error(`theme "${theme}" is invalid`);
      err.status = 400;
      throw err;
    }
    if (!(language in langExtensions)) {
      const err = new Error(`language "${language}" is invalid`);
      err.status = 400;
      throw err;
    }

    const color_codes = await themes.getColorCodes(
      theme,
      getTheme[theme],
      code,
      langExtensions[language]
    );

    console.log(color_codes);

    return res.status(200).send(JSON.stringify(color_codes));
  } catch (err) {
    if (err.status) {
      console.log(err.message);
    } else {
      err.status = 500;
      console.error(err);
    }
    return res.status(err.status).send(err.message);
  }
});

app.listen(port, () => {
  console.log(`color-codes app listening at port ${port}`);
});
