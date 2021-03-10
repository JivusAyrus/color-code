// Allows absolute paths
require("module-alias/register");

const express = require('express')
const app = express()
const port = 3000

const fs = require('fs');
const path = require('path');
const oniguruma = require('oniguruma');
const vsctm = require('@root/release/main');
const themedTokenize = require('@root/out/tests/themedTokenizerCustom');
const main = require('@root/out/main');
const plist = require('@root/out/plist');

const Resolver = require('@root/out/tests/resolver');
const onigLib = require('@root/out/tests/onigLibs');
const themes = require('@root/out/tests/themes_custom');

const THEMES_PATH='./test-cases/themes/'

app.use(express.json());

const langExtensions = {
	"batch":".bat",
	"c":".c",
	"c++":".cpp",
	"clojure":".clj",
	"css":".css",
	"dockerfile":".dockerfile",
	"go":".go",
	"html":".html",
	"jade":".jade",
	"java":".java",
	"javascript":".js",
	"javascriptreact":".jsx",
	"json":".json",
	"markdown":".md",
	"objective-c":".m",
	"perl":".pl",
	"php":".php",
	"powershell":".ps1",
	"properties":".properties",
	"python":".py",
	"r":".r",
	"ruby":".rb",
	"rust":".rs",
	"scss":".scss",
	"shellscript":".sh",
	"sql":".sql",
	"swift":".swift",
	"typescript":".ts",
	"typescriptreact":".tsx",
	"xml":".xml",
	"yaml":".yaml",
	"graphql":".graphql",
	"haskell":".hs"
}

const getTheme = {
	'abyss':['Abyss.tmTheme'],
	'dark_vs':['dark_vs.json'],
	'light_vs':['light_vs.json'],
	'hc_black':['hc_black.json'],
	'dark_plus':['dark_plus.json', 'dark_vs.json'],
	'light_plus':['light_plus.json', 'light_vs.json'],
	'kimbie_dark':['Kimbie_dark.tmTheme'],
	'monokai':['Monokai.tmTheme'],
	'monokai_dimmed':['dimmed-monokai.tmTheme'],
	'quietlight':['QuietLight.tmTheme'],
	'red':['red.tmTheme'],
	'solarized_dark':['Solarized-dark.tmTheme'],
	'solarized_light':['Solarized-light.tmTheme'],
	'tomorrow_night_blue':['Tomorrow-Night-Blue.tmTheme'],
}

app.get('/', (req, res) => {
	res.send('Hello World!')
})

app.post("/color-codes", async function(req, res) {
	code = req.body.code 
	theme = req.body.theme || 'dark_plus'
	language = req.body.language || 'javascript'
	console.log("theme: ", theme, "\tlanguage: ", language);

	if(!(theme in getTheme)){
		console.log(theme + ' doesnt exist')
		return res.status(415).send(theme + ' doesnt exist')
	}
	if(!(language in langExtensions)){
		console.log(language + ' doesnt exist')
                return res.status(415).send(language + ' doesnt exist')
	}

	console.log("test ..here 1")
	//var code = fs.readFileSync('./input.js', 'utf-8'); 
	var color_codes = await themes.getColorCodes(theme, getTheme[theme], code, langExtensions[language]);

	console.log(color_codes);	
	res.status(200).send(JSON.stringify(color_codes));
	res.end()
})

app.listen(port, () => {
    console.log(`Color code app listening at port ${port}`)
})
