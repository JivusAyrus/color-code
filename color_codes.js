const express = require('express')
const app = express()
const port = 3000

const fs = require('fs');
const path = require('path');
const vsctm = require('./release/main');
const oniguruma = require('oniguruma');
const themedTokenize = require('./out/tests/themedTokenizerCustom');
const main = require('./out/main');
const plist = require('./out/plist');

const Resolver = require('./out/tests/resolver');
const onigLib = require('./out/tests/onigLibs');
const themes = require('./out/tests/themes_custom');

let THEMES_PATH='/home/suvij/color-code/test-cases/themes/'

app.use(express.json());

const langExtensions = {
	"java":".java",
	"python":".py",
	"c++":".cpp",
	"c":".c",
	"javascript":".js",
	"html":".html",
	"css":".css",
	"go":".go",
	"json":".json",
	"php":".php",
	"r":".r",
	"ruby":".rb",
	"rust":".rs",
	"swift":".swift",
	"typescript":".ts",
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
    console.log(`Example app listening at http://localhost:${port}`)
})
