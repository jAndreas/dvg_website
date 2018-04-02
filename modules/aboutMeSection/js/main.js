'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import Swipe from 'barfoos2.0/swipe.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

import background from '../images/aboutMebackground_static.jpg';

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class aboutMeSection extends mix( Component ).with( Swipe ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'aboutMeSection',
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(

		);*/

		return this.init();
	}

	async init() {
		await super.init();

		this.createModalOverlay({
			opts:	{
				spinner: true
			}
		});

		let backgroundImageURL = await this.loadImage( background );

		this.nodes.root.style.backgroundImage = `url( ${ backgroundImageURL } )`;
		this.modalOverlay.fulfill();

		// any component related stuff which should wait on dependencies resolve before executing (waitForDOM at least or additional async data)

		return this;
	}

	onDialogModeChange() {
	}

	async inViewport() {
		let {
			'h1.topTitle':topTitle,
			'div.sectionOne':sectionOne,
			'div.sectionTwo':sectionTwo,
			'div.sectionThree':sectionThree } = this.nodes;

		this.fire( 'requestFullBlur.core' );

		[ topTitle, sectionTwo ].forEach( e => e.classList.remove( 'hiddenRight' ) );
		[ sectionOne, sectionThree ].forEach( e => e.classList.remove( 'hiddenLeft' ) );

		this.fire( 'supportSection.launchModule' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});

		super.inViewport && super.inViewport( ...arguments );
	}

	async offViewport() {
		let {
			'h1.topTitle':topTitle,
			'div.sectionOne':sectionOne,
			'div.sectionTwo':sectionTwo,
			'div.sectionThree':sectionThree } = this.nodes;

		this.fire( 'removeFullBlur.core' );

		[ topTitle, sectionTwo ].forEach( e => e.classList.add( 'hiddenRight' ) );
		[ sectionOne, sectionThree ].forEach( e => e.classList.add( 'hiddenLeft' ) );

		super.offViewport && super.offViewport( ...arguments );
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}
}
/****************************************** aboutMeSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new aboutMeSection( ...args );
}

export { start };
