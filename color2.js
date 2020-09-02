
const fs = require('fs');
const path = require('path');
const vsctm = require('./release/main');
const oniguruma = require('oniguruma');
const themedTokenize = require('./out/tests/themedTokenizerCustom');
const main = require('./out/main');

let THEMES_PATH='/home/karthic/vscode-textmate/test-cases/themes/'
/**
 * Utility to read a file as a promise
 */
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, data) => error ? reject(error) : resolve(data));
    })
}

function readTheme(filename) {
    let fullPath = path.join(THEMES_PATH, filename);

    let fileContents = fs.readFileSync(fullPath).toString();

    if (/\.json$/.test(filename)) {
	return JSON.parse(fileContents);
    }
    
    return plist.parse(fileContents);

}
// Create a registry that can create a grammar from a scope name.
const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
        createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
        createOnigString: (str) => new oniguruma.OnigString(str)
    }),
    loadGrammar: (scopeName) => {
        if (scopeName === 'source.js') {
            // https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
            return readFile('./JavaScript.plist').then(data => vsctm.parseRawGrammar(data.toString()))
        }
        console.log(`Unknown scope name: ${scopeName}`);
        return null;
    }
});

registry.setTheme(readTheme('dark_vs.json'));
// Load the JavaScript grammar and any other grammars included by it async.
registry.loadGrammar('source.js').then(grammar => {
    	
	
	const text = [
        `function sayHello(name) {`,
        `\treturn "Hello, " + name;`,
        `}`
    ];

    console.log(themedTokenize.tokenizeWithThemeLine(registry.getColorMap(), text.join('\n'), grammar));
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
    }
});
