/**
 * Insert internal links based on the articles from other wikis
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/InternalLinkSuggestions.js]] ([[File:User:Helder.wiki/Tools/InternalLinkSuggestions.js]])
 */
/*jshint browser: true, camelcase: true, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, laxbreak: true, maxlen: 120, evil: true, onevar: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';
mw.messages.set( {
	'ils-link' : 'Inserir ligações internas',
	'ils-link-description' : 'Inserir as ligações internas com base nas que existem nos artigos em outros idiomas',
	'ils-getting-data': 'Obtendo dados',
	'ils-getting-language-links': 'Obtendo links para outros idiomas...',
	'ils-getting-internal-links-from-other-wikis': 'Obtendo links internos de "[[$1:$2]]"...',
	'ils-getting-internal-links': 'Obtendo links internos desta página...',
	'ils-processing-data': 'Obtendo dados',
	'ils-applying-suggestions': 'Incluindo links sugeridos...',
	'ils-done-title': 'Pronto!',
	'ils-done': 'Foram adicionados $1 link(s).'
} );

var existingLinks, api,
	sourceWikis = [ 'en', 'de', 'es', 'fr', 'it', 'nl', 'ru', 'sv' ],
	sourcePages = {},
	threshold = 1,
	suggested = {};

function removeSpinner() {
	$.removeSpinner( 'spinner-internal-links-suggestions' );
}

function processSuggestions() {
	var i, reLink, oldText, newText, $diffLiveButton,
		$text = $( '#wpTextbox1' ),
		wantedLinks = [],
		addedLinks = [],
		linkCreator = function( target, previousChar, text ){
			if( wantedLinks[i].slice(1) === target.slice(2) ){
				return previousChar + '[[' + text + ']]';
			} else {
				return previousChar + '[[' + wantedLinks[i] + '|' + text + ']]';
			}
		};
	mw.notify(
		mw.msg( 'ils-applying-suggestions' ),
		{
			tag: 'internal-links-suggestions',
			title: mw.msg( 'ils-processing-data' )
		}
	);
	wantedLinks = $.map( suggested, function( value, key ){
		if( value < threshold || $.inArray( key, existingLinks ) !== -1 ){
			return null;
		}
		return key;
	} );
	newText = $text.val();
	for ( i = 0; i < wantedLinks.length; i++ ){
		oldText = newText;
		reLink = new RegExp(
			'([^a-záàâãçéêíñóôõúü\\-])(' + $.escapeRE( wantedLinks[i] ) +
			')(?![a-záàâãçéêíñóôõúü\\-]|[^\\[]*\\]\\]|.+={1,6}\\n)',
			'i'
		);
		newText = oldText.replace( reLink, linkCreator );
		if( newText!== oldText ){
			$text.val( newText );
			addedLinks.push( wantedLinks[i] );
		}
	}
	$diffLiveButton = $( '#wpDiffLive' );
	if( $diffLiveButton.length ){
		$diffLiveButton.click();
	} else {
		$( '#wpDiff' ).click();
	}
	mw.notify(
		mw.msg( 'ils-done', addedLinks.length ),
		{
			tag: 'internal-links-suggestions',
			title: mw.msg( 'ils-done-title' )
		}
	);
	removeSpinner();
}

function processLinksFromOtherWiki( data ) {
	var i, title, llinks;
	if( !data.query ){
		return;
	}
	for ( i = 0; i < data.query.pageids.length; i++ ){
		llinks = data.query.pages[ data.query.pageids[ i ] ].langlinks;
		if( !llinks ){
			continue;
		}
		title = llinks[0]['*'];
		if( !suggested[ title ] ){
			suggested[ title ] = 1;
		} else {
			suggested[ title ]++;
		}
	}
}

function getInternalLinksInOtherLanguages() {
	var cur = 0,
		getInternalLinksInCurrentLanguage;
	getInternalLinksInCurrentLanguage = function(){
		var code = sourceWikis[ cur ],
			page = sourcePages[ code ];
		mw.notify(
			mw.msg( 'ils-getting-internal-links-from-other-wikis', code, page ),
			{
				tag: 'internal-links-suggestions',
				title: mw.msg( 'ils-getting-data' )
			}
		);
		api = new mw.Api( {
			ajax: {
				url: '//' + code + '.wikipedia.org/w/api.php',
				dataType: 'jsonp'
			}
		} );
		api.get( {
			action: 'query',
			prop: 'langlinks',
			lllimit: 'max',
			lllang: mw.config.get( 'wgContentLanguage' ),
			generator: 'links',
			gplnamespace: 0,
			gpllimit: 'max',
			titles: page,
			indexpageids: true
		} )
		.done( function ( data ){
			// console.warn( data );
			processLinksFromOtherWiki( data );
			cur++;
			if( cur < sourceWikis.length ){
				getInternalLinksInCurrentLanguage();
			} else {
				processSuggestions();
			}
		} )
		.fail( removeSpinner );
	};
	getInternalLinksInCurrentLanguage();
}

function getInternalLinks() {
	mw.notify(
		mw.msg( 'ils-getting-internal-links' ),
		{
			tag: 'internal-links-suggestions',
			title: mw.msg( 'ils-getting-data' )
		}
	);
	api.get( {
		action: 'query',
		prop: 'links',
		plnamespace: 0,
		pllimit: 'max',
		titles: mw.config.get( 'wgPageName' ),
		indexpageids: true
	} )
	.done( function( data ){
		var links = data.query.pages[ data.query.pageids[0] ].links;
		existingLinks = $.map( links, function( link ){
			return link.title;
		} );
		getInternalLinksInOtherLanguages();
	} )
	.fail( removeSpinner );
}

function getLanguageLinks(){
	api = new mw.Api();
	$( '#firstHeading' ).injectSpinner( 'spinner-internal-links-suggestions' );
	mw.notify(
		mw.msg( 'ils-getting-language-links' ),
		{
			tag: 'internal-links-suggestions',
			title: mw.msg( 'ils-getting-data' )
		}
	);
	api.get( {
		action: 'query',
		prop: 'langlinks',
		lllimit: 'max',
		indexpageids: true,
		titles: mw.config.get( 'wgPageName' )
	} )
	.done( function ( data ){
		var i, found = 0,
			links = data.query.pages[ data.query.pageids[0] ].langlinks;
		for ( i = 0; i < links.length; i++ ){
			if( $.inArray( links[i].lang, sourceWikis ) !== -1 ){
				sourcePages[ links[i].lang ] = links[i]['*'];
				found++;
				if( found === sourceWikis.length ){
					break;
				}
			}
		}
		sourceWikis = $.grep( sourceWikis, function( lang ){
			return sourcePages[ lang ] !== undefined;
		} );
		getInternalLinks();
	} )
	.fail( removeSpinner );
}

function addSuggestionsLink(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		mw.msg( 'ils-link' ),
		'ca-internal-links-suggestions',
		mw.msg( 'ils-link-description' )
	) ).click( function( e ){
		e.preventDefault();
		mw.loader.using( [
			'mediawiki.api',
			'jquery.spinner',
			'jquery.mwExtension',
			'mediawiki.notify',
			'mediawiki.notification'
		], getLanguageLinks );
	} );
}
 
if ( mw.config.get( 'wgNamespaceNumber' ) === 0
	&& location.host.indexOf( 'wikipedia.org' ) !== -1
	&& $.inArray( mw.config.get( 'wgAction' ), [ 'edit', 'submit' ] ) !== -1
) {
	$( addSuggestionsLink );
}

}( mediaWiki, jQuery ) );