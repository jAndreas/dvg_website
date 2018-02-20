'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

let instance		= null,
	chunkSize		= 5242880; // 5MB

/*****************************************************************************************************
 *	uploadVideo is a dialog for privileged users which allows to upload video files to the dvg backend
 *****************************************************************************************************/
class uploadVideo extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true,
			selectedFile:			null
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input#videoFileId', 'change', this.videoFileChanged );
		this.addNodeEvent( 'form.uploadData', 'submit', this.onSubmit );

		return this;
	}

	videoFileChanged( event ) {
		let file = 'files' in event.target ? event.target.files[ 0 ] : null;

		if( file ) {
			this.nodes[ 'label.uploadStyle' ].textContent = '☁' + file.name;
			this.selectedFile = file;
		}
	}

	async onSubmit( event ) {
		let	{
			'section.tab1':tab1,
			'section.tab2':tab2,
			'label.uploadStyle':uploadLabel,
			'input.videoTitle':title,
			'textarea.videoDescription':desc,
			'input.password':pass } = this.nodes;

		if( this.selectedFile ) {
			let blob			= new Blob( [ this.selectedFile ], { type: this.selectedFile.type } ),
				maxSize			= blob.size,
				seek			= 0,
				currentChunk	= null;

			let modal = this.createModalOverlay({
				at:		this.dialogElements[ 'div.bfContentDialogBody' ],
				opts:	{
					spinner: true
				}
			});

			try {
				let videoMeta	= await this.send({
					type:		'newVideoUploadMeta',
					payload:	{
						pass:		pass.value,
						fileName:	this.selectedFile.name,
						fileSize:	maxSize,
						title:		title.value,
						desc:		desc.value
					}
				});

				this.log( 'newVideoUploadMeta reply: ', videoMeta );

				await modal.spinner.cleanup( 500 );
				tab1.style.display = 'none';
				await modal.fulfill();
				tab2.style.display = 'flex';

				this.log( 'We have a byte offset of: ', videoMeta.data.entry * chunkSize );
				seek += (videoMeta.data.entry * chunkSize);

				while( seek < maxSize ) {
					currentChunk = blob.slice( seek, seek + chunkSize );

					this.log( `uploading chunk (${ currentChunk.size } bytes) to server, from: ${ seek } bytes...` );
					let response = await this.send({
						type:		'fileUpload',
						payload:	{
							chunk:		currentChunk,
							fileID:		videoMeta.data.fileID,
							pass:		pass.value
						}
					}, {
						noTimeout:	true
					});

					this.log( 'upload responded with: ', response.msg );

					seek += chunkSize;
				}

				this.log( 'Upload complete.' );
				let response = await this.send({
					type:		'fileUpload',
					payload:	{
						complete:	true,
						fileName:	this.selectedFile.name,
						fileID:		videoMeta.data.fileID,
						pass:		pass.value
					}
				});
			} catch( ex ) {
				this.log( ex );
				await modal.log( ex || 'Fehler' );
				modal.fulfill();
			}
		}

		event.preventDefault();
	}
}
/****************************************** uploadVideo End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new uploadVideo( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
