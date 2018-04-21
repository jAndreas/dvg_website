'use strict';

import { Overlay, Draggable } from 'barfoos2.0/dialog.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import { loadVideo } from 'video.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import * as commentSection from 'commentSection/js/main.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  videoPlayer Dialog creates an overlay dialog to playback the passed in video based on the data
 *	It also displays all the information and is responsible for handling clicks/views
 *****************************************************************************************************/
class videoPlayerDialog extends mix( Overlay ).with( Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'videoPlayerDialog',
			tmpl:					html,
			renderData:				extend( input.videoData ).with({ uri: ENV_PROD ? 'www.der-vegane-germane.de' : 'dev.der-vegane-germane.de' }).get(),
			centerToViewport:		true,
			topMost:				true,
			avoidOutsideClickClose:	true,
			hoverOverlay:			true,
			noBlur:					true,
			title:					input.videoData.videoTitle
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		await this.scrollContainerIntoView();

		this.createModalOverlay({
			opts:	{ spinner: true }
		});

		this.on( 'streamInputChanged.video', this.streamInputChanged, this );

		await this.initVideo();
		await this.checkLiveChatStatus();

		this.modalOverlay && this.modalOverlay.fulfill();

		this.initComments();

		this.addNodeEvent( 'div.expand', 'click', this.showFullDescription );
		this.addNodeEvent( 'input.donateRange', 'input', this.onRangeSlide );
		this.addNodeEvent( 'input.donateAmount input.donateRange', 'focusin', this.onDonateAmountFocus );
		this.addNodeEvent( 'input.donateAmount input.donateRange', 'focusout', this.onDonateAmountBlur );
		this.addNodeEvent( 'input.donateNow', 'click', this.onDonateNowClick );

		this.recv( 'videoViewCountUpdate', this.updateViewCount.bind( this ) );

		this.log('videoData: ', this.videoData);

		return this;
	}

	async destroy() {
		this.video && this.video.destroy();
		this.video = null;

		this.modalOverlay && this.modalOverlay.cleanup();

		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////


	mediaChanged() {
		super.mediaChanged && super.mediaChanged( ...arguments );

		this.scrollContainerIntoView();

		if(!this._liveChatMode ) {
			win.setTimeout( this.centerOverlay.bind( this ), 100 );
		}
	}

	async checkLiveChatStatus() {
		let liveChatDialog = await this.fire( 'findModule.liveChatDialog' );

		if( liveChatDialog === true ) {
			this.setLiveChatMode();
		}

		this.on( 'moduleLaunch.appEvents', module => {
			if( module.name === 'liveChatDialog' ) {
				this.setLiveChatMode();
			}
		});

		this.on( 'moduleDestruction.appEvents', module => {
			if( module.name === 'liveChatDialog' ) {
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
				videoLink:		`/_video/${ this.videoData.internalId }/complete_,72,48,36,0.mp4.urlset/master.m3u8`,
				videoElement:	this.nodes[ 'video.mainPlayer' ],
				fallbackPath:	`/fallback/_video/${ this.videoData.internalId }/intro_480.mp4`
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
			location:		this.id,
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
		this.nodes[ 'span.description' ].classList.remove( 'folded' );

		if(!this._liveChatMode ) {
			this.centerOverlay();
		}
	}

	onDonateClick() {
		this.nodes[ 'div.donate' ].style.display = 'none';
		this.nodes[ 'div.donationForm' ].style.display = 'flex';
	}

	onRangeSlide() {
		this.nodes[ 'input.donateAmount' ].value = this.nodes[ 'input.donateRange' ].value + '€';
	}

	onDonateAmountFocus() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'donation'
			}
		});
	}

	onDonateAmountBlur() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			},
			extra:		this.videoData.id
		});
	}

	onDonateNowClick() {
		win.open( `https://www.paypal.me/DerVeganeGermane/send?amount=${ win.parseFloat( this.nodes[ 'input.donateAmount' ].value ) }&currencyCode=EUR`, '_blank' );
	}
}
/****************************************** videoPlayerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new videoPlayerDialog( ...args );
}

export { start };
