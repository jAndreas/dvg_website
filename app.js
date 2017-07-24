'use strict';

import * as topSection from './modules/topsection/js/main.js';
import { LogTools } from 'barfoos2.0/domkit.js';

const console	= new LogTools({ id: 'app' });

console.log('starting topSection...: ');
topSection.start();
