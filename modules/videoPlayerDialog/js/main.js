'use strict';

import { Overlay, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix, isLocalChrome, isAgentCrawler } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import { loadVideo } from 'video.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import * as commentSection from 'commentSection/js/main.js';
import Clipboard from 'clipboard';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  videoPlayer Dialog creates an overlay dialog to playback the passed in video based on the data
 *	It also displays all the information and is responsible for handling clicks/views
 *****************************************************************************************************/
class VideoPlayerDialog extends Mix( Overlay ).With( Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		input.videoData.vid					= input.videoData.videoTitle ? input.videoData.videoTitle.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') : input.articleData.internalId;
		input.videoData.videoDescription	= input.videoData.videoDescription.replace(/http\S*/g, urlMatch => {
			return `<a href="${ urlMatch }" target="_blank">${ urlMatch }</a>`;
		});
		input.videoData.videoDescription	= input.videoData.videoDescription.replace( /DE54460700240025046400/gi, 'LT673500010008036053' );

		extend( options ).with({
			name:					'VideoPlayerDialog',
			tmpl:					html,
			renderData:				extend( input.videoData ).with({ uri: ENV_PROD ? 'www.der-vegane-germane.de' : 'dev.der-vegane-germane.de' }).get(),
			location:				moduleLocations.center,
			centerToViewport:		true,
			fixed:					true,
			visibleChat:			true,
			topMost:				true,
			avoidOutsideClickClose:	true,
			hoverOverlay:			{
				maximize:		false,
				close:			true
			},
			noBlur:					false,
			title:					input.videoData.videoTitle
		}).and( input );

		super( options );

		if(!isLocalChrome ) {
			this.runtimeDependencies.push(
				this.fire( 'waitforHLSSupport.appEvents' )
			);
		}

		return this.init();
	}

	async init() {
		if( isLocalChrome || isAgentCrawler ) {
			super.init();
		} else {
			await super.init();
		}

		await this.scrollContainerIntoView();

		this.on( 'streamInputChanged.video', this.streamInputChanged, this );

		if(!isLocalChrome ) {
			this.createModalOverlay({
				opts:	{ spinner: true }
			});

			await this.initVideo();
			await this.checkLiveChatStatus();
		} else {
			this.showFullDescription();
		}

		this.modalOverlay && this.modalOverlay.fulfill();

		this.addNodeEvent( 'div.expand', 'click', this.showFullDescription );
		this.addNodeEvent( 'input.donateRange', 'input', this.onRangeSlide );
		this.addNodeEvent( 'input.donateAmount', 'change focusin', this.onDonateAmountFocus );
		this.addNodeEvent( 'input.donateAmount', 'blur focusout', this.videoFocused );
		this.addNodeEvent( 'input.donateNow', 'click', this.onDonateNowClick );
		//this.addNodeEvent( 'div.videoPlayerDialog', 'mouseup', this.videoFocused );

		this.initComments();

		this.clipboard = new Clipboard(this.nodes[ 'div.copyLinkToClipboard' ], {
			text: () => {
				this.copyLink = this.activateSpinner({
					at:		this.nodes[ 'div.copyLinkToClipboard' ],
					opts:	{
						lowblur:	true
					}
				});

				this.nodes[ 'div.copyLinkToClipboard' ].textContent = 'Kopiert!';

				this.copyLink.fulfill().then( () => {
					this.copyLink.cleanup();
					this.nodes[ 'div.copyLinkToClipboard' ].textContent = 'Link kopieren';
				});

				return `https://${ location.host }/static/${ this.videoData.videoTitle.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') }/`;
			}
		});

		this.recv( 'videoViewCountUpdate', this.updateViewCount.bind( this ) );

		this.log('videoData: ', this.videoData);

		return this;
	}

	async destroy() {
		this.clipboard && this.clipboard.destroy();
		this.video && this.video.destroy();
		this.video = null;

		this.modalOverlay && this.modalOverlay.cleanup();

		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			},
			extra:		this.videoData.id
		});
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////


	mediaChanged() {
		super.mediaChanged && super.mediaChanged( ...arguments );

		this.scrollContainerIntoView();

		if(!this._liveChatMode ) {
			win.setTimeout( this.centerOverlay.bind( this ), 100 );
		}
	}

	videoFocused() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			},
			extra:		this.videoData.id
		});

		return false;
	}

	async checkLiveChatStatus() {
		let liveChatDialog = await this.fire( 'findModule.LiveChatDialog' );

		if( liveChatDialog === true ) {
			this.setLiveChatMode();
		}

		this.on( 'moduleLaunch.appEvents', module => {
			if( module.name === 'LiveChatDialog' ) {
				this.setLiveChatMode();
			}
		});

		this.on( 'moduleDestruction.appEvents', module => {
			if( module.name === 'LiveChatDialog' ) {
				this.removeLiveChatMode();
			}
		});
	}

	setLiveChatMode() {
		this._liveChatMode = true;
		this.nodes.dialogRoot.style.left		= '';
		this.nodes.dialogRoot.style.top			= '';
		this.nodes.dialogRoot.style.alignSelf	= '';
		this.nodes.dialogRoot.classList.add( 'liveChatMode' );
	}

	removeLiveChatMode() {
		this._liveChatMode = false;
		this.nodes.dialogRoot.classList.remove( 'liveChatMode' );
		this.centerOverlay();
	}

	streamInputChanged( resolution ) {
		this.nodes[ 'span.quality' ].textContent = `${ resolution }p`;
	}

	async initVideo() {
		try {
			this.video = await loadVideo({
				//videoLink:		`/_video/${ this.videoData.internalId }/complete_,108,72,48,36,0.mp4.urlset/master.m3u8`,
				videoLink:		`/_video/${ this.videoData.internalId }/streams/playlist.m3u8`,
				videoElement:	this.nodes[ 'video.mainPlayer' ],
				fallbackPath:	`_video/${ this.videoData.internalId }/complete_720.mp4`
			});

			this.video.seek( +this.at || 0 );
		} catch( ex ) {
			if(!this.modalOverlay ) {
				this.createModalOverlay();
			}

			if( this.modalOverlay ) {
				await this.modalOverlay.log( ex || 'Fehler', 125000 );
			}

			if( this.modalOverlay ) {
				await this.modalOverlay.fulfill();
			}
		}

		try {
			await this.send({
				type:		'videoView',
				payload:	{
					id:	this.videoData.id
				}
			});

			this.fire( 'updateHash.appEvents', {
				data:	{
					action:		this.name
				},
				extra:		this.videoData.id
			});
		} catch( ex ) {
			this.log( ex );
		}
	}

	async initComments() {
		await commentSection.start({
			location:		this.name,
			context:		this.videoData.id,
			internalId:		this.videoData.internalId,
			speakingName:	this.videoData.videoTitle
		});
	}

	updateViewCount( data ) {
		if( data.videoId === this.videoData.id ) {
			this.videoData.views					= data.count;
			this.videoData.uniqueViews				= data.uniqueCount;
			this.nodes[ 'span.views' ].textContent	= `${ data.count.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' ) } Aufrufe`;
		}
	}

	showFullDescription() {
		this.removeNodes( 'div.expand', true );
		this.nodes[ 'h2.description' ].classList.remove( 'folded' );

		if(!this._liveChatMode ) {
			this.centerOverlay({ centerToViewport: true });
		}
	}

	onDonateClick() {
		this.nodes[ 'div.donate' ].style.display = 'none';
		this.nodes[ 'div.donationForm' ].style.display = 'flex';
	}

	onRangeSlide() {
		this.nodes[ 'input.donateAmount' ].value = this.nodes[ 'input.donateRange' ].value + '€';
		return false;
	}

	onDonateAmountFocus() {
		win.setTimeout(() => {
			this.fire( 'updateHash.appEvents', {
				data:	{
					action:		'donation'
				}
			});
		}, 150);

		return false;
	}

	onDonateNowClick() {
		win.open( 'https://www.der-vegane-germane.de/support', '_blank' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'donation'
			}
		});
	}
}
/****************************************** videoPlayerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new VideoPlayerDialog( ...args );
}

export { start };
