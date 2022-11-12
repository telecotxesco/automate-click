
(async () => {

    function getRandomInt(min, max) {
        if(max <= min) return 0;
        return Math.floor(Math.random() * (max - min)) + min;
    }

	if (typeof window.automateclick_hasRun !== 'undefined'){
		return;
	}
	window.automateclick_hasRun = true;

	let store = {};
	const extId = 'automate-click';

	const temporary = browser.runtime.id.endsWith('@temporary-addon'); // debugging?

	const log = (level, msg) => {
		level = level.trim().toLowerCase();
		if (['error','warn'].includes(level)
			|| ( temporary && ['debug','info','log'].includes(level))
		) {
			console[level](extId + '::' + level.toUpperCase() + '::' + msg);
			return;
		}
	}

    const waitFor = (selector) => {

		log('debug', JSON.stringify(selector,null,4));

        if(selector.repeatdelay > 0 && selector.maxrepeats === 0) { return; }

        if(selector.maxrepeats > 0){
            selector.maxrepeats--;
			log('debug', 'Repetitions left: ' + selector.maxrepeats);
        }

        const minskip = (selector.skipelements - selector.skipelementsvariance);
        const maxskip = (selector.skipelements + selector.skipelementsvariance);
        const toskip = ((maxskip - minskip) > 0) ? getRandomInt(minskip, maxskip) : selector.skipelements;


        if(selector.xclickpos > 0 || selector.yclickpos > 0) {
            const elem = document.elementFromPoint(selector.xclickpos, selector.yclickpos);
            if(typeof elem.click === 'function') {
                elem.click();
                log('debug', 'item by coordinates clicked');
            }else{
                log('warn','item by coordinates has no click function');
            }
        }else {
			var iteration = 0;
            for(const item of document.querySelectorAll(selector.cssselector)) {
                if(item) {
                    if( typeof item.click === 'function') {
                        if(iteration >= toskip) {						
							item.click(); // click item
							log('debug', 'item by selector clicked. Iteration: ' + iteration);
							if(selector.stopAtFirstElement !== false) { // only first element and then break
								log('debug', 'Stop at first element found');
								break;
							} 
						}
						else
						{
							log('debug', 'Skip item iteration ' + iteration);
						}
						iteration++;
                    }else{
                        log('warn','item by selector has no click function');
                    }
				}
            }
        }
		log('debug', 'Item parsing finished. Checking for repetitions...');
        if(selector.repeatdelay > 0) {
            const min = (selector.repeatdelay - selector.randomrepeatvariance);
            const max = (selector.repeatdelay + selector.randomrepeatvariance);
            const tovalue = ((max - min) > 0) ? getRandomInt(min, max) : selector.repeatdelay;
            log('debug','> waitTime: ' + tovalue);
            setTimeout(function() {
                waitFor(selector);
            },tovalue);
        }
		else{
			log('debug', '> No more repeats');
		}
    } // waitFor end

	log( 'debug', 'temporary: ' + temporary);
	try {
		store = await browser.storage.local.get('selectors');
	}catch(e){
		log('error', 'access to rules storage failed');
		return;
	}

	if ( typeof store.selectors !== 'object' ) {
		log('error', 'rules selectors not available');
		return;
	}

	if ( typeof store.selectors.forEach !== 'function' ) {
		log('error', 'rules selectors not iterable');
		return;
	}

    store.selectors.forEach( (selector) => {

		log('debug', 'Checking Palex Click on: ' + window.location.href);
        // check enabled
        if(typeof selector.enabled !== 'boolean') { return; }
        if(selector.enabled !== true) { return; }

        // check url regex
        if(typeof selector.urlregex !== 'string') { return; }
        selector.urlregex = selector.urlregex.trim();
        if(selector.urlregex === ''){ return; }

        if(!(new RegExp(selector.urlregex)).test(window.location.href)){ return; }

        //log('debug', window.location.href);

        //if ( typeof selector.cssselector !== 'string' ) { return; }
        //if ( selector.cssselector === '' && selector.xclickpos === 0 && selector.yclickpos === 0) { return; }

        log('debug', JSON.stringify(selector,null,4));
        setTimeout(function() {
            selector.maxrepeats--; // negativ maxrepeats will continue forever
            waitFor(selector)
        }, selector.initaldelay || 3000); // wait initaldelay
    });

})();
