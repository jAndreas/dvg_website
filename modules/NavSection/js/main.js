'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix, isMobileDevice } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  This module takes care about navigating the site dude, what did you expect?
 *****************************************************************************************************/
class NavSection extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'NavSection',
			location:		moduleLocations.head,
			tmpl:			html,
			mode:			'website'
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		if( isMobileDevice ) {
			this.fire( 'pushToSky.core', this.nodes.root );

			this.addNodeEvent( 'div.anchors', 'click', this.toggleMenu );
			this.addNodeEvent( 'a.enableChat', 'click', this.toggleChat );

			let hash = this.render({ htmlData: '<li></li>', standalone: true }).with({}).at({
				node:		'ul.navList',
				position:	'beforeend'
			});

			hash.localRoot.insertAdjacentElement( 'beforeend', this.nodes[ 'div.socialMediaLinks' ] );
		}

		this.addNodeEvent( 'a.jumpToVideoSection, a.logo','click', this.slideToVideoSection );
		this.addNodeEvent( 'a.jumpToArticleSection','click', this.slideToArticleSection );
		this.addNodeEvent( 'a.jumpToAboutSection', 'click', this.slideToAboutMeSection );
		this.addNodeEvent( 'a.jumpToSupportSection', 'click', this.slideToSupportSection );
		this.addNodeEvent( 'a.followMe', 'click', this.followMeClick );
		this.addNodeEvent( 'a.registerName', 'click', this.onRegisterName );
		this.addNodeEvent( 'a.login', 'click', this.onLoginClick );
		this.addNodeEvent( 'a.logout', 'click', this.onLogoutClick );

		this.on( 'userLogin.server', this.onUserLogin, this );
		this.on( 'sessionLogin.appEvents', this.onSessionLogin, this );
		this.on( 'moduleDestruction.appEvents', this.onModuleDestruction, this );
		this.fire( 'checkSession.appEvents' );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async slideToVideoSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'VideoSection.launchModule' );

		this.fire( 'slideDownTo.VideoSection' );
	}

	async slideToArticleSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'ArticleSection.launchModule' );

		this.fire( 'slideDownTo.ArticleSection' );
	}

	async slideToAboutMeSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'AboutMeSection.launchModule' );

		this.fire( 'slideDownTo.AboutMeSection' );
	}

	async slideToSupportSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'SupportSection.launchModule' );

		this.fire( 'slideDownTo.SupportSection' );
	}

	async followMeClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'a.followMe', 'click', this.followMeClick );

		let registerEmailDialog		= await import( /* webpackChunkName: "RegisterEmailDialog" */ 'registerEmailDialog/js/main.js'  );

		await registerEmailDialog.start({
			location:	this.name
		});
	}

	async onUserLogin( user ) {
		this.log( 'login data: ', user );

		this.fire( 'startNewSession.server', user );
		this.nodes[ 'a.login' ].style.display = 'none';
		this.nodes[ 'a.registerName' ].style.display = 'none';
		this.nodes[ 'a.logout' ].style.display = 'flex';
		this.nodes[ 'a.logout' ].setAttribute( 'title', `${ user.__username } ausloggen...` );
		this.nodes[ 'a.logout' ].textContent = user.__username;
	}

	async onSessionLogin( user ) {
		try {
			let response = await this.send({
				type:		'verifySession',
				payload:	user
			});

			if( response.data.verified ) {
				this.onUserLogin( user );
			}
		} catch( ex ) {
			this.log( 'onSessionLogin: ', ex.message );
		}
	}

	onModuleDestruction( module ) {
		switch( module.name ) {
			case 'RegisterEmailDialog':
				this.addNodeEvent( 'a.followMe', 'click', this.followMeClick );
				break;
			case 'LoginDialog':
				this.addNodeEvent( 'a.login', 'click', this.onLoginClick );
				break;
			case 'RegisterDialog':
				this.addNodeEvent( 'a.registerName', 'click', this.onRegisterName );
				break;
			case 'LiveChatDialog':
				//this.addNodeEvent( 'a.startLiveChat', 'click', this.startLiveChat );
				break;
		}
	}

	async onRegisterName( event ) {
		event.stopPropagation();
		event.preventDefault();
		this.removeNodeEvent( 'a.registerName', 'click', this.onRegisterName );

		let registerDialog	= await import( /* webpackChunkName: "registerDialog" */  'registerDialog/js/main.js'  );

		await registerDialog.start({
			location:	this.name,
			center:		true
		});
	}

	async onLoginClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'a.login', 'click', this.onLoginClick );

		let loginDialog		= await import( /* webpackChunkName: "loginDialog" */  'loginDialog/js/main.js'  );

		await loginDialog.start({
			//location:	this.id,
			center:		true
		});
	}

	async onLogoutClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'a.logout', 'click', this.onLogoutClick );

		try {
			let response = await this.send({
				type:		'logoutUser',
				payload:	{ }
			});

			if( response.data.sessionDestroyed ) {
				this.fire( 'userLogout.server', response.data.session );

				this.nodes[ 'a.logout' ].style.display = 'none';
				this.nodes[ 'a.logout' ].removeAttribute( 'title' );

				this.nodes[ 'a.login' ].style.display = 'flex';
				this.nodes[ 'a.registerName' ].style.display = 'flex';

				this.addNodeEvent( 'a.login', 'click', this.onLoginClick );
				this.addNodeEvent( 'a.registerName', 'click', this.onRegisterName );
			}
		} catch( ex ) {
			this.log( 'logoutUser error: ', ex );
		}

		this.addNodeEvent( 'a.logout', 'click', this.onLogoutClick );
	}

	toggleMenu() {
		this.nodes[ 'div.anchors' ].classList.toggle( 'open' );

		this.fire( 'mobileNavMenuChange.core', this.nodes[ 'div.anchors' ].classList.contains( 'open' ) ? 'open' : 'close' );

		return false;
	}

	toggleChat() {
		if( this.mode === 'website' ) {
			this.fire( 'enableChatSideBar.core' );
			this.mode = 'chat';
			this.nodes[ 'a.enableChat' ].textContent = 'Zur Webseite';
			this.fire( 'mobileChatEnabled' );
		} else if( this.mode === 'chat' ) {
			this.fire( 'disableChatSideBar.core' );
			this.mode = 'website';
			this.nodes[ 'a.enableChat' ].textContent = 'Zum Chat';
			this.fire( 'mobileChatDisabled' );
		}
	}

	onCenterScrollCore( scrollTop ) {
		if( scrollTop > 50 ) {
			if( this.nodes[ 'div.content' ].classList.contains( 'fixedTop' ) ) {
				this.nodes[ 'div.content' ].classList.remove( 'fixedTop' );
			}
		}

		if( scrollTop <= 10 ) {
			if(!this.nodes[ 'div.content' ].classList.contains( 'fixedTop' ) ) {
				this.nodes[ 'div.content' ].classList.add( 'fixedTop' );
			}
		}
	}
}
/****************************************** cookieConfirmSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new NavSection( ...args );
}

export { start };
