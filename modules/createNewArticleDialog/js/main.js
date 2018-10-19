'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class CreateNewArticleDialog extends Mix( Overlay ).With( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'CreateNewArticleDialog',
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true,
			selectedAttachments:	[ ]
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'form.articleData', 'submit', this.postArticle );
		this.addNodeEvent( 'input.fileAttachments', 'change', this.onFileAttachmentsChanged );
		this.on( 'sessionLogin.appEvents', this.sessionLogin, this );

		this.fire( 'checkSession.appEvents' );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async sessionLogin( user ) {
		if( user ) {
			this.fire( 'startNewSession.server', user );
		}
	}

	async postArticle( event ) {
		event.preventDefault();
		event.stopPropagation();

		let articleSubject		= this.nodes[ 'input.articleSubject' ].value,
			articleBody			= this.nodes[ 'textarea.articleBody' ].value,
			articleFiles		= [ ];

		if( this.selectedAttachments ) {
			for( let file of Array.from( this.selectedAttachments ) ) {
				articleFiles.push({
					blob:		new Blob( [ file ], { type: file.type } ),
					name:		file.name || 'unknown',
					type:		file.type.slice( file.type.lastIndexOf( '/' ) + 1 )
				});
			}
		}

		try {
			let result	= await this.send({
				type:		'createNewArticle',
				payload:	{ articleSubject, articleBody, articleFiles }
			});

			this.log( result );
		} catch( ex ) {
			this.error( ex );
		}
	}

	async onFileAttachmentsChanged( event ) {
		if( 'files' in event.target ) {
			this.selectedAttachments = event.target.files;
		}
	}
}
/****************************************** createNewArticleDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new CreateNewArticleDialog( ...args );
}

export { start };
