const express = require('express')
const app = express()
const port = 3001

const fs = require('fs');
const path = require('path');
const vsctm = require('../release/main');
const oniguruma = require('oniguruma');
const themedTokenize = require('../out/tests/themedTokenizerCustom');
const main = require('../out/main');
const plist = require('../out/plist');

const Resolver = require('../out/tests/resolver');
const onigLib = require('../out/tests/onigLibs');
const themes = require('../out/tests/themes_custom');

app.get('/', (req, res) => {
	  res.send('Hello World!')
})

app.listen(port, () => {
	  console.log(`Example app listening at http://localhost:${port}`)
})

let THEMES_PATH='/home/karthic/color-code/test-cases/themes/'

function readFile(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (error, data) => error ? reject(error) : resolve(data));
	})  
}

// Path containing all the theme settings.
const THEMES_TEST_PATH = path.join(__dirname, '../test-cases/themes');

function readTheme(filename) {
	let fullPath = path.join(THEMES_PATH, filename);
	let fileContents = fs.readFileSync(fullPath).toString();
	if (/\.json$/.test(filename)) {
		return JSON.parse(fileContents);
	}   
	return plist.parse(fileContents);
}

app.use(express.json());

app.get("/test", async function(req, res) {
	console.log("test ..here 1")
	//await producer.connect()
	//console.log(req.body)
	//var code = req.body.code 
        //var theme = req.body.theme
	//var language = req.body.language
	//console.log(code)
	// Create a Themeinfo object for finding color codes.
	var contents = fs.readFileSync('../input.js', 'utf-8'); 
	var code = await themes.getColorCodes('dark_plus', ['dark_plus.json', 'dark_vs.json'], contents, ".js");	

	console.log(code);	
	res.send(JSON.stringify(code));
	res.end()
})

app.post("/javascript", (req, res) => {
	console.log("test ..here 1")
	//await producer.connect()
	console.log(req.body)
	var code = req.body.code 
        var theme = req.body.theme
	var language = req.body.language
	//console.log(code)
	// Create a registry that can create a grammar from a scope name.
	const registry = new vsctm.Registry({
		    onigLib: Promise.resolve({
			createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
			createOnigString: (str) => new oniguruma.OnigString(str)
		}),
		loadGrammar: (scopeName) => {
			console.log('here: ',scopeName)
			if (scopeName === 'source.js') {
				// https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
				return readFile('../JavaScript.plist').then(data => vsctm.parseRawGrammar(data.toString()))
			}
			console.log(`Unknown scope name: ${scopeName}`);
			return null;
		}
	});
	
	registry.setTheme(readTheme(theme));
	// Load the JavaScript grammar and any other grammars included by it async.
	registry.loadGrammar('source.js').then(async(grammar) => {
		const text = code
		//console.log(themedTokenize.tokenizeWithThemeLine(registry.getColorMap(), text, grammar));
		/*
		let ruleStack = vsctm.INITIAL;
		for (let i = 0; i < text.length; i++) {
			const line = text[i];
			const lineTokens = grammar.tokenizeLine(line, ruleStack);
			console.log(`\nTokenizing line: ${line}`);
			for (let j = 0; j < lineTokens.tokens.length; j++) {
				const token = lineTokens.tokens[j];
				console.log(` - token from ${token.startIndex} to ${token.endIndex} ` +
					    `(${line.substring(token.startIndex, token.endIndex)}) ` +
					    `with scopes ${token.scopes.join(', ')}`
				);
			}
			ruleStack = lineTokens.ruleStack;
		}*/
		colored_tokens = themedTokenize.tokenizeWithThemeLine(registry.getColorMap(), text, grammar)
		res.send(colored_tokens)
		res.end()
	/* 
		await producer.send({
			topic: 'color',
			messages: [
			    	    {
			        	key: 'my-key',
					value: JSON.stringify(themedTokenize.tokenizeWithThemeLine(registry.getColorMap(), text, grammar)),
				    }
			],
		})*/
	}).catch(err => {
		console.error(err);
	}); 
        //await producer.disconnect()
});
