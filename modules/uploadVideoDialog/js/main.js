'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import progressMarkup from '../markup/showprogress.html';
import progressConvertMarkup from '../markup/showprogress_convert.html';
import style from '../style/main.scss';
import progressStyle from '../style/showprogress.scss';
import progressConvertStyle from '../style/showprogress_convert.scss';

let instance		= null;

/*****************************************************************************************************
 *	uploadVideoDialog is a dialog for privileged users which allows to upload video files to the dvg backend
 *****************************************************************************************************/
class uploadVideoDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true,
			selectedVideoFile:		null,
			selectedThumbnailFile:	null
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input#videoFileId', 'change', this.videoFileChanged );
		this.addNodeEvent( 'input#thumbnailFileId', 'change', this.thumbnailFileIdChanged );
		this.addNodeEvent( 'form.uploadData', 'submit', this.onSubmit );
		this.addNodeEvent( 'input.uploadThumbnail', 'click', this.onUploadThumbnailClick );
		this.addNodeEvent( 'dialogRoot', 'change', this.onGlobalChange );

		this.nodes[ 'label.thumbnailStyle' ].textContent = '📷 Thumbnail auswählen...';
		this.nodes[ 'label.thumbnailStyle' ].style.color = 'rgba(255,255,255,0.5)';

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, progressStyle, progressConvertStyle ].forEach( s => s.unuse() );
	}

	onGlobalChange( event ) {
		if( this.selectedVideoFile ) {
			this.nodes[ 'input.uploadThumbnail' ].removeAttribute( 'disabled' );
		}
	}

	videoFileChanged( event ) {
		let file = 'files' in event.target ? event.target.files[ 0 ] : null;

		if( file ) {
			this.nodes[ 'label.uploadStyle' ].textContent = '📹 ' + file.name;
			this.selectedVideoFile = file;
		} else {
			this.nodes[ 'label.uploadStyle' ].textContent = '📹';
			this.selectedVideoFile = null;
		}
	}

	thumbnailFileIdChanged( event ) {
		let file = 'files' in event.target ? event.target.files[ 0 ] : null;

		if( file ) {
			this.nodes[ 'label.thumbnailStyle' ].textContent = '📷 ' + file.name;
			this.nodes[ 'label.thumbnailStyle' ].style.color = 'white';
			this.selectedThumbnailFile = file;
		} else {
			this.nodes[ 'label.thumbnailStyle' ].textContent = '📷 Thumbnail auswählen...';
			this.nodes[ 'label.thumbnailStyle' ].style.color = 'rgba(255,255,255,0.5)';
			this.selectedThumbnailFile = null;
		}
	}

	async onUploadThumbnailClick() {
		let	{
			'input.videoTitle':title,
			'textarea.videoDescription':desc,
			'input.uploadThumbnail':saveButton,
			'input.videoTags':tags,
			'input.password':pass } = this.nodes;

		let blob = null;

		if( this.selectedThumbnailFile ) {
			blob	= new Blob( [ this.selectedThumbnailFile ], { type: this.selectedThumbnailFile.type } );
		}

		saveButton.setAttribute( 'disabled', 'disabled' );

		try {
			if(!this.currentDocData ) {
				throw new Error( 'this.currentDocData must be defined.' );
			}

			let response	= await this.send({
				type:		'saveVideoMeta',
				payload:	{
					pass:				pass.value,
					fileID:				this.currentFileId,
					docData:			this.currentDocData,
					image:				blob,
					thumbnailFileName:	this.selectedThumbnailFile ? this.selectedThumbnailFile.name : '',
					thumbnailFileType:	this.selectedThumbnailFile ? this.selectedThumbnailFile.type.slice( this.selectedThumbnailFile.type.lastIndexOf( '/' ) + 1 ) : '',
					title:				title.value,
					desc:				desc.value,
					tags:				tags.value
				}
			}, {
				noTimeout:	true
			});

			if( response.data.docData.ok ) {
				Object.assign( this.currentDocData, response.data.docData );
			}
		} catch( ex ) {
			let modal = this.createModalOverlay({
				at:		this.dialogElements[ 'div.bfContentDialogBody' ]
			});

			this.log( ex );

			await modal.log( ex || 'Fehler' );
			modal.fulfill();
			saveButton.removeAttribute( 'disabled' );
		}
	}

	getChunkSize( size = 1 ) {
		let mb = 1024 * 1024;

		size = size / 1024 / 1024;

		if( size < 10 ) {
			return mb * 0.5;
		}
		if( size < 100 ) {
			return mb * 1;
		}
		if( size < 500 ) {
			return mb * 1.5;
		}
		if( size < 1000 ) {
			return mb * 3;
		}
		if( size < 2000 ) {
			return mb * 5;
		}

		return mb * 7;
	}

	async onSubmit( event ) {
		event.preventDefault();
		event.stopPropagation();

		let	{
			'section.tab1':tab1,
			'section.tab2':tab2,
			'input.videoTitle':title,
			'label.uploadStyle':fileSelect,
			'textarea.videoDescription':desc,
			'input.videoTags':tags,
			'input.password':pass,
			'input.uploadVideo':uploadButton } = this.nodes;

		if( this.selectedVideoFile ) {
			let blob			= new Blob( [ this.selectedVideoFile ], { type: this.selectedVideoFile.type } ),
				maxSize			= blob.size,
				chunkSize		= this.getChunkSize( maxSize ),
				seek			= 0,
				currentChunk	= null;

			let modal = this.createModalOverlay({
				at:		this.dialogElements[ 'div.bfContentDialogBody' ]
			});

			try {
				let videoMeta	= await this.send({
					type:		'newVideoUploadMeta',
					payload:	{
						pass:		pass.value,
						fileName:	this.selectedVideoFile.name,
						fileSize:	maxSize,
						title:		title.value,
						desc:		desc.value,
						tags:		tags.value
					}
				});

				this.readInForm( videoMeta.data.formData );
				this.currentFileId	= videoMeta.data.fileID;
				this.currentDocData	= videoMeta.data.docData;

				this.log( 'newVideoUploadMeta reply: ', videoMeta );

				fileSelect.style.display = 'none';

				if( videoMeta.data.mode === 'resume' || videoMeta.data.mode === 'start' ) {
					this.removeNodeEvent( 'form.uploadData', 'submit', this.onSubmit );
					this.addNodeEvent( uploadButton, 'click', this.pauseUpload );
					uploadButton.type	= 'button';
					uploadButton.value	= 'Pause';

					this.isUploadPaused = false;

					progressStyle.use();

					this.nodes[ 'input.uploadThumbnail' ].removeAttribute( 'disabled' );

					if(!this.nodes[ 'div.showProgress' ] ) {
						this.addNodes({
							htmlData:	progressMarkup,
							reference:	{
								node:		fileSelect,
								position:	'afterend'
							}
						});
					}

					this.nodes[ 'span.info' ].textContent = `Übertrage ${ this.selectedVideoFile.name }`;

					await modal.fulfill();
					await this.transition({
						node:	this.nodes[ 'div.showProgress' ],
						style:	{ marginBottom:	'30px' },
						rules:	{
							duration:	500,
							timing:		'ease-in-out'
						}
					});

					this.progressAnimation = this.activateSpinner({
						at:		this.nodes[ 'sup.visualizeProgress' ],
						opts:	{
							lowblur:	true
						}
					});

					this.log( 'We have a byte offset of: ', videoMeta.data.entry * chunkSize );
					seek += (videoMeta.data.entry * chunkSize);

					//this.nodes[ 'span.info' ].textContent			= `Übertrage ${ this.selectedVideoFile.name }`;
					this.nodes[ 'span.infoPercent' ].textContent	= `(${ Math.round( (seek / maxSize) * 100 ) }%)`;
					this.nodes[ 'progress.uploadProgress' ].setAttribute( 'value', Math.round( (seek / maxSize) * 100 ) );

					let start, stop;

					while( seek < maxSize ) {
						start = Date.now();
						currentChunk = blob.slice( seek, seek + chunkSize );

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

						if( this.isUploadPaused ) {
							return;
						}

						stop = Date.now();
						seek += currentChunk.size;

						let kbps			= ( ( currentChunk.size / ((stop - start) / 1000) ) / 1024 ).toFixed( 2 ),
							progressPercent	= Math.round( (seek / maxSize) * 100 );

						this.nodes[ 'span.infoPercent' ].textContent	= `(${ progressPercent }%)`;
						this.nodes[ 'sup.bandwidthData' ].textContent	= `${ kbps } kb/s (Segment: ${ (currentChunk.size / 1024).toFixed( 2 ) } kb)`;
						this.nodes[ 'progress.uploadProgress' ].setAttribute( 'value', progressPercent );

						this.fire( 'setTitle.appEvents', `${ progressPercent }% at ${ kbps } kb/s` );
					}

					this.log( 'Upload complete/paused.' );

					this.removeNodes( 'input.uploadVideo', true );

					let response = await this.send({
						type:		'fileUpload',
						payload:	{
							complete:	true,
							fileName:	this.selectedVideoFile.name,
							_id:		this.currentDocData.id,
							fileID:		videoMeta.data.fileID,
							pass:		pass.value
						}
					});

					this.nodes[ 'sup.bandwidthData' ].textContent		= 'Abgeschlossen.';

					await this.progressAnimation.fulfill();
					this.progressAnimation.cleanup();

					this.removeNodes( 'div.showProgress', true );
					this.onSubmit( event );
				} else if( videoMeta.data.mode === 'convert' ) {
					this.recv( 'videoConvertFinished', this.onVideoConvertFinish.bind( this ) );
					this.recv( 'videoQualityConverted', this.onVideoQualityConverted.bind( this ) );

					this.removeNodes( 'input.uploadVideo', true );

					progressConvertStyle.use();

					if(!this.nodes[ 'div.showProgressConvert' ] ) {
						this.addNodes({
							htmlData:	progressConvertMarkup,
							reference:	{
								node:		fileSelect,
								position:	'afterend'
							}
						});
					}

					this.nodes[ 'span.infoConvert' ].textContent	= `Kodieren von ${ this.selectedVideoFile.name } ...`;
					this.nodes[ 'sup.convertStep' ].textContent		= '???';

					await modal.fulfill();

					await this.transition({
						node:	this.nodes[ 'div.showProgressConvert' ],
						style:	{ marginBottom:	'30px' },
						rules:	{
							duration:	500,
							timing:		'ease-in-out'
						}
					});

					this.progressAnimation = this.activateSpinner({
						at:		this.nodes[ 'sup.visualizeProgressConvert' ],
						opts:	{
							lowblur:	true
						}
					});

					this.nodes[ 'input.uploadThumbnail' ].removeAttribute( 'disabled' );
				} else if( videoMeta.data.mode === 'finish' ) {
					this.removeNodes( 'input.uploadVideo', true );

					progressConvertStyle.use();

					if(!this.nodes[ 'div.showProgressConvert' ] ) {
						this.addNodes({
							htmlData:	progressConvertMarkup,
							reference:	{
								node:		fileSelect,
								position:	'afterend'
							}
						});
					}

					this.nodes[ 'input.uploadThumbnail' ].removeAttribute( 'disabled' );
					this.nodes[ 'span.infoConvert' ].textContent	= `Kodieren von ${ this.selectedVideoFile.name } abgeschlossen.`;
					await modal.fulfill();
				}
			} catch( ex ) {
				this.log( ex );
				await modal.log( ex || 'Fehler' );
				modal.fulfill();
				uploadButton.removeAttribute( 'disabled' );

				if( typeof this.progressAnimation !== 'undefined' ) {
					this.progressAnimation.cleanup();
				}
			}
		}
	}

	async readInForm( data = { } ) {
		let	{
			'input.videoTitle':title,
			'label.thumbnailStyle':thumbnail,
			'textarea.videoDescription':desc,
			'input.videoTags':tags } = this.nodes;

		title.value					= data.videoTitle || '';
		thumbnail.textContent		= '📷 ' + (data.thumbnailFileName || '[ Keine Auswahl ]');
		desc.value					= data.videoDescription || '';
		tags.value					= Array.isArray( data.videoTags ) ? data.videoTags.join(', ') : '';
	}

	async onVideoConvertFinish( data ) {
		if( this.currentFileId === data.fileID ) {
			this.nodes[ 'span.infoConvert' ].textContent	= `Kodieren von ${ this.selectedVideoFile.name } abgeschlossen.`;

			await this.progressAnimation.fulfill();
			this.progressAnimation.cleanup();
		} else {
			console.log( 'Foreign VideoConvertFinish Event from: ', data.fileID );
		}
	}

	async onVideoQualityConverted( data ) {
		if( this.currentFileId === data.fileID ) {
			this.nodes[ 'sup.convertStep' ].textContent		= data.alreadyConverted.map( q => q + ' ✓' ).join(', ');
		} else {
			console.log( 'Foreign VideoQualityConverted Event from: ', data.fileID );
		}
	}

	async pauseUpload() {
		this.isUploadPaused = true;

		this.fire( 'setTitle.appEvents', 'Pause' );
		this.nodes[ 'sup.bandwidthData' ].textContent		= 'Pause';
		this.progressAnimation.cleanup();
		this.removeNodeEvent( 'input.uploadVideo', 'click', this.pauseUpload );
		this.nodes[ 'input.uploadVideo' ].value	= 'Fortsetzen';
		this.nodes[ 'input.uploadVideo' ].type	= 'submit';

		try {
			await this.data.get( this.nodes[ 'div.showProgress' ] ).storage.transitions.last.undo();
		} catch( ex ) {
			// meant to be
		}

		this.addNodeEvent( 'form.uploadData', 'submit', this.onSubmit );
	}
}
/****************************************** uploadVideo End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new uploadVideoDialog( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
