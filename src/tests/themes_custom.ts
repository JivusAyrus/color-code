/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as tape from 'tape';
import { Registry, IRawTheme } from '../main';
import { ScopeListElement, ScopeMetadata, StackElementMetadata } from '../grammar';
import {
	Theme, strcmp, strArrCmp, ThemeTrieElement, ThemeTrieElementRule,
	parseTheme, ParsedThemeRule, FontStyle, ColorMap
} from '../theme';
import { IEmbeddedLanguagesMap } from '../main';
import * as plist from '../plist';
import { getOnigasm, getOniguruma, getVSCodeOniguruma } from './onigLibs';
import { Resolver, IGrammarRegistration, ILanguageRegistration } from './resolver';
import { tokenizeWithTheme, IThemedToken } from './themedTokenizer';
import { tokenizeWithThemeLine, IThemedTokenLine } from './themedTokenizerCustom';

const THEMES_TEST_PATH = path.join(__dirname, '../../test-cases/themes');

interface IThemesTokens {
	[theme: string]: IThemedToken[];
}

export interface ThemeData {
	themeName: string;
	theme: IRawTheme;
	registry: Registry;
}

export class ThemeInfo {
	private _themeName: string;
	private _filename: string;
	private _includeFilename: string | undefined;

	constructor(themeName: string, filename: string, includeFilename?: string) {
		this._themeName = themeName;
		this._filename = filename;
		this._includeFilename = includeFilename;
	}

	private static _loadThemeFile(filename: string): IRawTheme {
		let fullPath = path.join(THEMES_TEST_PATH, filename);
		let fileContents = fs.readFileSync(fullPath).toString();

		if (/\.json$/.test(filename)) {
			return JSON.parse(fileContents);
		}
		return plist.parse(fileContents);
	}

	public create(resolver: Resolver): ThemeData {
		let theme: IRawTheme = ThemeInfo._loadThemeFile(this._filename);
		if (this._includeFilename) {
			let includeTheme: IRawTheme = ThemeInfo._loadThemeFile(this._includeFilename);
			(<any>theme).settings = includeTheme.settings.concat(theme.settings);
		}

		// console.log(JSON.stringify(theme, null, '\t')); process.exit(0);

		let registry = new Registry(resolver);
		registry.setTheme(theme);

		return {
			themeName: this._themeName,
			theme: theme,
			registry: registry
		};
	}
}

export async function getColorCodes(themeName: string, themeFiles: string[], code: string, languageExtension: string): Promise<IThemedToken[]>  {
	let THEME = (themeFiles.length==2) ? new ThemeInfo(themeName, themeFiles[0], themeFiles[1]) : new ThemeInfo(themeName, themeFiles[0]);
		

	// Load all language/grammar metadata
	let _grammars: IGrammarRegistration[] = JSON.parse(fs.readFileSync(path.join(THEMES_TEST_PATH, 'grammars.json')).toString('utf8'));
	for (let grammar of _grammars) {
		grammar.path = path.join(THEMES_TEST_PATH, grammar.path);
	}

	let _languages: ILanguageRegistration[] = JSON.parse(fs.readFileSync(path.join(THEMES_TEST_PATH, 'languages.json')).toString('utf8'));

	let resolver = new Resolver(_grammars, _languages, getVSCodeOniguruma(), 'vscode-oniguruma');
	let themeData = THEME.create(resolver);
		let language = resolver.findLanguageByExtension(languageExtension); 
		if (!language) {
			throw new Error('Could not determine language for ');
		}
		let grammar = resolver.findGrammarByLanguage(language);

		let embeddedLanguages: IEmbeddedLanguagesMap = Object.create(null);
		if (grammar.embeddedLanguages) {
			for (let scopeName in grammar.embeddedLanguages) {
				embeddedLanguages[scopeName] = resolver.language2id[grammar.embeddedLanguages[scopeName]];
			}
		}
		const embedGrammar = await themeData.registry.loadGrammarWithEmbeddedLanguages(grammar.scopeName, resolver.language2id[language], embeddedLanguages);
		if (!embedGrammar) {
			throw new Error(`Cannot load grammar `);
		}
		return tokenizeWithThemeLine(themeData.registry.getColorMap(), code, embedGrammar);


};

