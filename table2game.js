/**
 * @overview A JavaScript game engine for turning any HTML table into a playable game.
 * @author Tim Scott Long
 * @copyright Tim Scott Long 2017
 * @license Available for use under the MIT License
 */
;var Table2Game = (function(window, undefined) {

	// Object.keys polyfill, from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
	if (!Object.keys) {
		Object.keys = (function() {
			var hasOwnProperty = Object.prototype.hasOwnProperty,
				hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
				dontEnums = [
					'toString',
					'toLocaleString',
					'valueOf',
					'hasOwnProperty',
					'isPrototypeOf',
					'propertyIsEnumerable',
					'constructor'
				],
				dontEnumsLength = dontEnums.length;

			return function(obj) {
				if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
					throw new TypeError('Object.keys called on non-object');
				}

				var result = [], prop, i;

				for (prop in obj) {
					if(hasOwnProperty.call(obj, prop)) {
						result.push(prop);
					}
				}

				if (hasDontEnumBug) {
					for (i = 0; i < dontEnumsLength; i++) {
						if (hasOwnProperty.call(obj, dontEnums[i])) {
							result.push(dontEnums[i]);
						}
					}
				}

				return result;
			};
		}());
	}

	var self = undefined,
		table = undefined,
		demoGamesOpts = {
			"Ping Pong": {},
			Snake: {},
			"Break Bricks": {},
			"Whack-a-mole": {},
			Maze: {},
			"Creepy Crawler": {},
			Jumper: {},
			Paint: {},
			Sniper: {},
			Dungeon: {}
		},
		tableArr = [],
		globals = {},
		sprites = {},
		timer = undefined,
		gameTime = 0,
		paused = false,
		updateCallback = function() {/* noop */},		
		delay = 50,
		pauseCallback = function() {/* noop */},
		unpauseCallback = function() {/* noop */},
		hideOnPause = true,
		
		onpaintCallback = function() {/* noop */},

		screenWidth = 1,
		screenHeight = 1,

		delayedTime = 0,
		score = 0,
		lives = 3,

		white = "#ffffff",
		gray = "#f1f1f1",
		black = "#d1d1d1",
		red = "#fff1f1", // Really more peach fec3c3 is probably better
		green = "#f1fff1",
		blue = "#f1f1ff",
		
		yellow = "#fffff1",
		
		blueGreen = "#f1ffff",
		purple = "#fff1ff",
		
		defaultColor = "#eee",
		currentTable2Game = null,
		onkeydownCallback = null,
		onkeyupCallback = null,
		onkeypressCallback = null,
		onclickCallback = null,
		onmousedownCallback = null,
		onmouseupCallback = null,
		onmousemoveCallback = null,
		onmouseenterCallback = null,
		onmouseleaveCallback = null,
		onmouseoverCallback = null,
		onmouseoutCallback = null,
		onmousewheelCallback = null,
		oncontextmenuCallback = null,
		handlersCreated = {
			onkeydown: false,
			onkeyup: false,
			onkeypress: false,
			onclick: false,
			onmousedown: false,
			onmouseup: false,
			onmousemove: false,
			onmouseenter: false,
			onmouseleave: false,
			onmouseover: false,
			onmouseout: false,
			onmousewheel: false,
			oncontextmenu: false
		},
		tableFound = false;

	/**
	 * @description Binds cross-browser event listener.
	 * @param {Object} element The HTML element the event will be handled for.
	 * @param {string} evtString The standard name of the event
	 * @param {function} callback The handler function to be called.
	 * @param {boolean} bubbling Whether or not the event should bubble.
	 * @private
	 */
	var handleElmEvent = function(element, evtString, callback, bubbling) {
		if(window.attachEvent) {
			return element.attachEvent(evtString, callback);
		} else {
			return element.addEventListener(evtString, callback, bubbling);
		}
	}; // End handleElmEvent()

	/**
	 * @description Removes cross-browser event listener. Paramaters are same used in handleElmEvent
	 *   to bind the listener.
	 * @param {Object} element The HTML element the event will be handled for.
	 * @param {string} evtString The standard name of the event
	 * @param {function} callback The handler function to be called.
	 * @param {boolean} bubbling Whether or not the event should bubble.
	 * @private
	 */
	var unhandleElmEvent = function(element, evtString, callback, bubbling) {
		if(window.detachEvent) {
			return element.detachEvent(evtString, callback);
		} else {
			return element.removeEventListener(evtString, callback, bubbling);
		}
	}; // End unhandleElmEvent()

	/**
	 * @description Constructor function for Table2Game objects.
	 * @param {Object|string} opts Options for the created Table2Game, or the name of an existing demo game.
	 * @param {Object} [opts.table] The HTML <table> element to be used as the game canvas. Defaults to first table drawn on page.
	 * @param {Object} [opts.globals] A plain JavaScript object with keys as names for `global` variables in the game, with values as their initial values.
	 * @param {Object} [opts.sprites] A plain JavaScript object with keys as names for Sprites in the game, with values as their constructor options.
	 * @param {Object} [opts.details] A plain JavaScript object with keys as names of values to be displayed on the scoreboard, and values as their initial values.
	 * @param {function} [opts.init] The function to be called before beginning the game. Used for general initialization tasks.
	 * @param {function} [opts.update] The primary function to be called during setInterval updates.
	 * @param {function} [opts.onpause] A callback to be called when the current game is paused (this is called after game is hidden, but before timer is cleared).
	 * @param {function} [opts.onunpause] A callback to be called before the current game is unpaused.
	 * @param {function} [onpaint] A callback to be called after each time the game screen is redrawn.
	 * @param {number} [opts.delay] The number of milliseconds to wait before each game update.
	 * @param {boolean} [opts.hideOnPause] Whether the game screen should be cleared when the game is paused. Defaults to true.
	 * @param {number} [opts.initialDelay] Time in milliseconds to wait before first screen paint (e.g., title screen) and game start.
	 * @param {string} [opts.defaultColor] The default color to use for drawing Sprites.
	 * @param {string} [opts.white] A color to be used for the lightest objects.
	 * @param {string} [opts.black] A color to be used for the darkest objects.
	 * @param {string} [opts.gray] A color to be used for gray tones.
	 * @param {string} [opts.red] A color to be used for red tones.
	 * @param {string} [opts.green] A color to be used for green tones.
	 * @param {string} [opts.blue] A color to be used for blue tones.
	 * @param {string} [opts.yellow] A color to be used for yellow tones.
	 * @param {string} [opts.purple] A color to be used for purple tones.
	 * @param {string} [opts.blueGreen] A color to be used for blueGreen tones.
	 * @param {Object} [demoOptsOverrides] Similar properties to the opts parameter, available when requesting an existing demo game.
	 * @returns {Object} The created Table2Game object.
	 */
	var Table2Game = function(opts, demoOptsOverrides) {
		if(this === window) {
			return new Table2Game(opts);
		}

		opts = opts || {};

		// Passing just a demo game's name will create that game.
		if(typeof opts === "string") {
			if(typeof demoOptsOverrides !== "undefined") {
				for(var prop in demoOptsOverrides) {
					demoGamesOpts[opts][prop] = demoOptsOverrides[prop]; // Override demo game's default property
				}

				return new Table2Game(demoGamesOpts[opts], demoOptsOverrides);
			} else {
				return new Table2Game(demoGamesOpts[opts]);
			}			
		}

		var defaults = {
				table: document.querySelector ? document.querySelector("table") : document.getElementsByTagName("table")[0],
				globals: {},
				sprites: {},
				details: {},
				delay: 50,
				init: function(){/* noop */},
				update: function(){/* noop */},
				onpause: function(){/* noop */},
				onunpause: function(){/* noop */},
				onpaint: function(){/* noop */}
			},
			rows = [],
			width = 1,
			height = 1,
			detailsDiv = null;

		// Reset globals
		self = undefined;
		table = undefined;
		tableArr = [];
		sprites = {};
		gameTime = 0;
		paused = false;
		runningTime = 0;
		score = 0;
		tableExists = false;

		screenWidth = 1;
		screenHeight = 1;
		
		if(timer) {
			clearInterval(timer);
		}

		opts = opts || {};

		for(var opt in defaults) {			
			opts[opt] = opts[opt] || defaults[opt];
		}

		self = this;

		if(typeof opts.table === "string") {
			table = document.getElementById(opts.table.replace("#", ""));
		} else {
			table = opts.table.jquery ? opts.table[0] : opts.table;
		}

		self.table = table;

		for(var glob in opts.globals) {
			self.registerGlobal(glob, opts.globals[glob]);
		}

		for(var spr in opts.sprites) {
			self.registerSprite(spr, opts.sprites[spr]);
		}

		detailsDiv = document.createElement("div");
		detailsDiv.id = "Table2GameDetailsDiv";
		detailsDiv.style.display = "inline block";
		detailsDiv.color = "#eee";
		detailsDiv.innerHTML = "";
		
		for(var detail in opts.details) {
			detailsDiv.innerHTML += detail + ": <span id='Table2Game" + detail
				+ "Span' class='Table2GameDetail' style='margin-right: 10px;'>"
				+ opts.details[detail] + "</span>";
		}

		detailsDiv.style.marginLeft = self.table.style.marginLeft ||
			(window.getComputedStyle ? window.getComputedStyle(self.table).getPropertyValue("margin-left") : "");
			
		table.parentNode.insertBefore(detailsDiv, table.nextSibling);
		self.detailsDiv = detailsDiv;
		self.details = opts.details;

		if(opts.onkeydown) {
			if(onkeydownCallback) {
				onkeydownCallback = opts.onkeydown;
			} else {
				onkeydownCallback = opts.onkeydown;
				handleElmEvent(window, "keydown", function(e) { onkeydownCallback.call(self, e); }, false);
				handlersCreated.onkeydown = true;
			}
		} else {
			if(handlersCreated.onkeydown) {
				onkeydownCallback = function() {/* noop */};
				handlersCreated.onkeydown = false;
			}
		}

		if(opts.onkeyup) {
			if(onkeyupCallback) {
				onkeyupCallback = opts.onkeyup;
			} else {
				onkeyupCallback = opts.onkeyup;
				handleElmEvent(window, "keyup", function(e) { onkeyupCallback.call(self, e); }, false);
				handlersCreated.onkeyup = true;
			}
		} else {
			if(handlersCreated.onkeyup) {
				onkeyupCallback = function() {/* noop */};
				handlersCreated.onkeyup = false;
			}
		}

		if(opts.onkeypress) {
			if(onkeypressCallback) {
				onkeypressCallback = opts.onkeypress;
			} else {
				onkeypressCallback = opts.onkeypress;
				handleElmEvent(window, "keypress", function(e) { onkeypressCallback.call(self, e); }, false);
				handlersCreated.onkeypress = true;
			}
		} else {
			if(handlersCreated.onkeypress) {
				onkeypressCallback = function() {/* noop */};
				handlersCreated.onkeypress = false;
			}
		}
		
		if(opts.onclick) {
			if(onclickCallback) {
				onclickCallback = opts.onclick;
			} else {
				onclickCallback = opts.onclick;
				handleElmEvent(self.table, "click", function(e) { onclickCallback.call(self, e); }, false);
				handlersCreated.onclick = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onclick) {
				onclickCallback = function() {/* noop */};
				handlersCreated.onclick = false;
			}
		}

		if(opts.onmousedown) {
			if(onmousedownCallback) {
				onmousedownCallback = opts.onmousedown;
			} else {
				onmousedownCallback = opts.onmousedown;
				handleElmEvent(self.table, "mousedown", function(e) { onmousedownCallback.call(self, e); }, false);
				handlersCreated.onmousedown = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmousedown) {
				onmousedownCallback = function() {/* noop */};
				handlersCreated.onmousedown = false;
			}
		}
		
		if(opts.onmouseup) {
			if(onmouseupCallback) {
				onmouseupCallback = opts.onmouseup;
			} else {
				onmouseupCallback = opts.onmouseup;
				handleElmEvent(self.table, "mouseup", function(e) { onmouseupCallback.call(self, e); }, false);
				handlersCreated.onmouseup = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmouseup) {
				onmouseupCallback = function() {/* noop */};
				handlersCreated.onmouseup = false;
			}
		}

		if(opts.onmousemove) {
 			if(onmousemoveCallback) {
				onmousemoveCallback = opts.onmousemove;
			} else {
				onmousemoveCallback = opts.onmousemove;
				handleElmEvent(self.table, "mousemove", function(e) { onmousemoveCallback.call(self, e); }, false);
				handlersCreated.onmousemove = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmousemove) {
				onmousemoveCallback = function() {/* noop */};
				handlersCreated.onmousemove = false;
			}
		}

		if(opts.onmouseenter) {
			if(onmouseenterCallback) {
				onmouseenterCallback = opts.onmouseenter;
			} else {
				onmouseenterCallback = opts.onmouseenter;
				handleElmEvent(self.table, "mouseenter", function(e) { onmouseenterCallback.call(self, e); }, false);
				handlersCreated.onmouseenter = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmouseenter) {
				onmouseenterCallback = function() {/* noop */};
				handlersCreated.onmouseenter = false;
			}
		}

		if(opts.onmouseleave) {
			if(onmouseleaveCallback) {
				onmouseleaveCallback = opts.onmouseleave;
			} else {
				onmouseleaveCallback = opts.onmouseleave;
				handleElmEvent(self.table, "mouseleave", function(e) { onmouseleaveCallback.call(self, e); }, false);
				handlersCreated.onmouseleave = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmouseleave) {
				onmouseleaveCallback = function() {/* noop */};
				handlersCreated.onmouseleave = false;
			}
		}

		if(opts.onmouseover) {
			if(onmouseoverCallback) {
				onmouseoverCallback = opts.onmouseover;
			} else {
				onmouseoverCallback = opts.onmouseover;
				handleElmEvent(self.table, "mouseover", function(e) { onmouseoverCallback.call(self, e); }, false);
				handlersCreated.onmouseover = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmouseover) {
				onmouseoverCallback = function() {/* noop */};
				handlersCreated.onmouseover = false;
			}
		}

		if(opts.onmouseout) {
			if(onmouseoutCallback) {
				onmouseoutCallback = opts.onmouseout;
			} else {
				onmouseoutCallback = opts.onmouseout;
				handleElmEvent(self.table, "mouseout", function(e) { onmouseoutCallback.call(self, e); }, false);
				handlersCreated.onmouseout = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmouseout) {
				onmouseoutCallback = function() {/* noop */};
				handlersCreated.onmouseout = false;
			}
		}

		if(opts.onmousewheel) {
			if(onmousewheelCallback) {
				onmousewheelCallback = opts.onmousewheel;
			} else {
				onmousewheelCallback = opts.onmousewheel;
				handleElmEvent(self.table, "mousewheel", function(e) { onmousewheelCallback.call(self, e); }, false);
				handlersCreated.onmousewheel = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.onmousewheel) {
				onmousewheelCallback = function() {/* noop */};
				handlersCreated.onmousewheel = false;
			}
		}

		if(opts.oncontextmenu) {
			if(oncontextmenuCallback) {
				oncontextmenuCallback = opts.oncontextmenu;
			} else {
				oncontextmenuCallback = opts.oncontextmenu;
				handleElmEvent(self.table, "contextmenu", function(e) { oncontextmenuCallback.call(self, e); }, false);
				handlersCreated.oncontextmenu = true;
			}

			table.style.cursor = "default";
		} else {
			if(handlersCreated.oncontextmenu) {
				oncontextmenuCallback = function() {/* noop */};
				handlersCreated.oncontextmenu = false;
			}
		}

		delay = opts.delay || delay;
		self.delay = delay;
		self.flashEndingPosition = 0; 

		self.defaultColor = opts.defaultColor || opts.gray || defaultColor;
		self.white = opts.white || white;
		self.black = opts.black || black;
		self.gray = opts.gray || gray;
		self.red = opts.red || red;
		self.green = opts.green || green;
		self.blue = opts.blue || blue;
		self.yellow = opts.yellow || yellow;
		self.purple = opts.purple || purple;
		self.blueGreen = opts.blueGreen || blueGreen;
		
		hideOnPause = opts.hideOnPause || hideOnPause;
		
		rows = table.rows;
		width = rows[0].length;
		height = rows.length;

		var numRowsIncluded = 0,
			numColsIncluded = 0;
		
		// Store cells in data array.
		rowAdder:
		for(var i = 0, len = rows.length; i < len; i++) {
			var rowArr = [];

			for(var j = 0, jLen = rows[i].cells.length; j < jLen; j++) {
				if(rows[i].cells[j].getAttribute("colspan") && parseInt(rows[i].cells[j].getAttribute("colspan"), 10) > 1) {
					continue rowAdder;
				}

				rowArr.push(rows[i].cells[j]);
				rows[i].cells[j].style.background = "transparent";
			}

			tableArr.push(rowArr);
			numRowsIncluded++;
			numColsIncluded = Math.max(numColsIncluded, rows[i].cells.length);
		}

		screenHeight = self.screenHeight = numRowsIncluded;
		screenWidth = self.screenWidth = numColsIncluded;

		updateCallback = opts.update;
		pauseCallback = opts.onpause;
		unpauseCallback = opts.onunpause;
		onpaintCallback = opts.onpaint;

		opts.init.call(self); // Call init() function immediately
		self.paint(); // Draw intro screen immediately after init()

		// Optionally, wait before beginning animation - gives user time to adjust.
		setTimeout(function() {
			timer = setInterval(updateForTimer, delay);
		}, opts.initialDelay || 20);

		return self;
	}; // End Table2Game() constructor

	Table2Game.prototype.constructor = Table2Game;

	// Default color collection
	Table2Game.defaultColor = defaultColor;
	Table2Game.black = black;
	Table2Game.gray = gray;
	Table2Game.red = red;
	Table2Game.green = green;
	Table2Game.blue = blue;
	Table2Game.yellow = yellow;
	Table2Game.purple = purple;
	Table2Game.blueGreen = blueGreen;

	/**
	 * @description Calls basic game updates for each callback update from the `timer` variable.
	 * @private
	 */
	var updateForTimer = function() {
			if(!paused && !delayedTime) {
				gameTime++;
				updateCallback.call(self);
				self.paint();
			}
	}; // End updateForTimer()

	/**
	 * @desciption
	 *
	 * Emulates a standard window.setTimeout call, while halting current game processes.
	 * Used for instance, to allow time to note that a life has just been lost.
	 *
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.setTimeout = function(callback , time) {
		delayedTime = time;

		window.setTimeout(function() {
			delayedTime = 0;

			callback.call(self);
		}, time);
		
		return this;
	}; // End Table2Game.prototype.setTimeout()

	/**
	 * @description Gets the current number of milliseconds between game updates.
	 * @returns {number}
	 */
	Table2Game.prototype.getDelay = function() {
		return delay;
	}; // End Table2Game.prototype.getDelay()

	/**
	 * @description Sets the wait time between game updates.
	 * @param {number} newDelay The new number of milliseconds to wait between game updates.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.setDelay = function(newDelay) {
		clearInterval(timer);
		delay = newDelay;
		timer = setInterval(updateForTimer, delay);
		return this;
	}; // End Table2Game.prototype.setDelay()

	/**
	 * @description Constructor for a basic visible object to be used in the game.
	 * @param {Object} opts Options to be used to define the Sprite object.
	 * @param {string} opts.name - A name to be used to identify this object in the game.
	 * @param {number} [x] The object's initial x-position onscreen.
	 * @param {number} [y] The object's initial y-position onscreen.
	 * @param {number} [velocityX] The object's initial horizontal velocity. Used by dev in update() callback.
	 * @param {number} [velocityY] The object's initial vertical velocity. Used by dev in update() callback.
	 * @param {number} [width] The number of cells wide that the object should be drawn.
	 * @param {number} [height] The number of cells high that the object should be drawn.
	 * @param {string} [color] The color to draw the Sprite's cells.
	 * @param {Object[]} [polygon] An array of Sprites making up the entire Sprite object's
	 *   shape. If this array is nonempty, then values for x, y, velocityX, velocityY, width, and height above are ignored.
	 * @private
	 */
	var Sprite = function(opts) {
		var defaults = {
			name: undefined,
			x: 0,
			y: 0,
			velocityX: 0,
			velocityY: 0,
			width: 1,
			height: 1,
			color: defaultColor,
			polygon: [] // Example: [new Sprite({name: opts.name + "0", x: 1, y: 1, velocityX: 0, velocityY: 0, width: 1, height: 1})]
		},
		self = this;
		
		for(var opt in defaults) {
			self[opt] = opts[opt] || defaults[opt];
		}

		if(opts.width === 0) {
			self.width = 0;
		}
		
		if(opts.height === 0) {
			self.height = 0;
		}

		/**
		 * @description Resets values of objects within the Sprite object's polygon array.
		 * @param {string} key The name of the object property being updated.
		 * @param {string} valShift The new value for the `key` parameter, or a value to be added/appended to it.
		 * @param {boolean} replaceVal If true, valShift replaces the original value rather than adding/appending to it.
		 */
		self.shiftPolygons = function(key, valShift, replaceVal) {
			if(replaceVal) {
				if(typeof valShift === "function") {
					for(var i = 0, len = self.polygon.length; i < len; i++) {
						self.polygon[i][key] = valShift.call(self, self.polygon[i][key]);
					}
				} else {
					for(var i = 0, len = self.polygon.length; i < len; i++) {
						self.polygon[i][key] = valShift;
					}
				}
			} else {
				if(typeof valShift === "function") {
					for(var i = 0, len = self.polygon.length; i < len; i++) {
						self.polygon[i][key] += valShift.call(self, self.polygon[i][key]);
					}
				} else {
					for(var i = 0, len = self.polygon.length; i < len; i++) {
						self.polygon[i][key] += valShift;
					}
				}
			}
		};
	}; // End Sprite() constructor

	/**
	 * @description Adds a Sprite object to the current game.
	 * @param {string|Object} nameOrSprite The Sprite object or name of the Sprite object being added.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.registerSprite = function(name, opts) {
		opts = opts || {};
		opts.name = name;
		sprites[name] = new Sprite(opts);
		return this;
	}; // End Table2Game.prototype.registerSprite

	/**
	 * @description Removes a Sprite object from the current game.
	 * @param {string|Object} nameOrSprite The Sprite object or name of the Sprite object being removed.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.unregisterSprite = function(nameOrSprite) {
		if(typeof nameOrSprite === "string")
			delete sprites[nameOrSprite];
		else
			delete sprites[nameOrSprite.name];

		return this;
	}; // End Table2Game.prototype.unregisterSprite()

	/**
	 * @description Get the current list of Sprites, or a particular subset by name.
	 * @param {string|Object} name The string name of the variable being checked, or a
	 *   regular expression matching names of sprites to be returned.
	 * @returns {*} May be be a single value defined by the name parameter, or an object containing all
	 *   of the sprites (as name-Sprite pairs) whose name match the regular expression defined in `name`.
	 */
	Table2Game.prototype.getSprites = function(name) {
		var regexpObj = {};

		if(name) {
			if(name instanceof RegExp) {
				for(var x in sprites) {
					if(name.test(x)) {
						regexpObj[x] = sprites[x];
					}
				}

				return regexpObj;
			} else {
				return sprites[name];
			}
		} else {
			return sprites;
		}
	}; // End Table2Game.prototype.getSprites()

	/**
	 * @description Adds a `global` variable object to the current game.
	 * @param {string|Object} name The name of the global object being added.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.registerGlobal = function(name, obj) {
		globals[name] = obj;
		return this;
	}; // End Table2Game.prototype.registerGlobal()

	/**
	 * @description Removes a `global` object from the current game.
	 * @param {string|Object} name The name of the `global` object being removed.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.unregisterGlobal = function(name) {
		delete globals[name];
	}; // Table2Game.prototype.unregisterGlobal()

	/**
	 * @description Get the current list of globals, or a particular subset by name.
	 * @param {string|Object} name The string name of the variable being checked, or a
	 *   regular expression matching names of global variables to be returned.
	 * @returns {*} May be be a single value defined by the name parameter, or an object containing all
	 *   of the globals (as name-global pairs) whose name match the regular expression defined in `name`.
	 */
	Table2Game.prototype.getGlobals = function(name) {
		var regexpObj = {};

		if(name) {
			if(name instanceof RegExp) {
				for(var x in globals) {
					if(name.test(x)) {
						regexpObj[x] = globals[x];
					}
				}

				return regexpObj;
			} else {
				return globals[name];
			}
		} else {
			return globals;
		}
	}; // End Table2Game.prototype.getGlobals()

	/**
	 * @description Updates the value of a given `global` variable in the current game.
	 * @param {string} name The name of the global variable.
	 * @param {*} val The value that the given global is being set to.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.setGlobal = function(name, val) {
		globals[name] = val;
		return this;
	}; // End Table2Game.prototype.setGlobal()

	// Gets the HTML table being used in the current Table2Game instance.
	Table2Game.prototype.getTable = function() {
		return table;
	};

	// Gets the array of table cells being used in the current Table2Game instance.
	Table2Game.prototype.getTableArr = function() {
		return tableArr;
	};

	/**
	 * @description Gets an HTML table cell for given coordinates in the current Table2Game object's table.
	 * @param {number} x The x coordinate (in the game screen) of the cell.
	 * @param {number} y The y coordinate (in the game screen) of the cell.
	 * @returns {Object} The <td> or <th> cell at the given coordinates.
	 */
	Table2Game.prototype.getCell = function(x, y) {
		if(x < 0 || y < 0 || x > screenWidth || y > screenHeight)
			return { style: {color: "", backgroundColor: ""} };
		else 
			return tableArr[y][x];
	}; // End Table2Game.prototype.getCell()

	/**
	 * @description Determines if two objects are colliding on the game screen.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @returns {boolean}
	 */
	Table2Game.prototype.colliding = function(x1, y1, w1, h1, x2, y2, w2, h2) {		
		if(typeof x1 === "object") {
			var obj1 = x1,
				obj2 = y1;

			if(!obj2) {
				return false;				
			}

			if((obj1.polygon && obj1.polygon.length) || (obj2.polygon && obj2.polygon.length))
				return this.collidingPolygons(obj1, obj2);
			else
				return this.colliding(obj1.x, obj1.y, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}
		
		if((x1 < x2 + w2 && x1 + w1 > x2))	{
			if(y1 < y2 + h2 && y1 + h1 > y2) {
				return true;
			}
		}

		return false;
	}; // End Table2Game.prototype.colliding()

	/**
	 * @description Determines if two Sprites are colliding in their polygon objects.
	 * @returns {boolean}
	 */
	Table2Game.prototype.collidingPolygons = function(obj1, obj2) {
		
		if(!(obj1.polygon && obj1.polygon.length) && !(obj2.polygon && obj2.polygon.length)) {
			return this.collidingPolygons({polygon: [{x: obj1.x, y: obj1.y, width: obj1.width, height: obj1.height}]}, {polygon: [{x: obj2.x, y: obj2.y, width: obj2.width, height: obj2.height}]});
		} else if(!obj1.polygon || !obj1.polygon.length) {
			return this.collidingPolygons({polygon: [{x: obj1.x, y: obj1.y, width: obj1.width, height: obj1.height}]}, obj2);
		} else if(!obj2.polygon || !obj2.polygon.length) {
			return this.collidingPolygons(obj1, {polygon: [{x: obj2.x, y: obj2.y, width: obj2.width, height: obj2.height}]});
		}
		
		var coordsStr = "";

		// Current version will assume that each polygon entry has width 1 and height 1
		for(var i = 0, len = obj1.polygon.length; i < len; i++) {
			coordsStr += "_" + obj1.polygon[i].x + "&" + obj1.polygon[i].y + "_";
		}

		for(var i = 0, len = obj2.polygon.length; i < len; i++) {
			if(~coordsStr.indexOf("_" + obj2.polygon[i].x + "&" + obj2.polygon[i].y + "_")) {
				return true;
			}
		}
		
		// Other option, allowing multiple sizes, would be to have a double loop, checking colliding() for each polygon item
		return false;
	}; // End Table2Game.prototype.collidingPolygons()

	/**
	 * @description Determines if an object is colliding into another object from left.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @returns {boolean}
	 */
	Table2Game.prototype.collidingFromLeft = function(obj1, obj2) {
		if(obj1.velocityX !== 0) {
			return this.colliding(obj1.x + Math.abs(obj1.velocityX), obj1.y, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}	else {
			return this.colliding(obj1.x + 1, obj1.y, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}
	}; // End Table2Game.prototype.collidingFromLeft()

	/**
	 * @description Determines if an object is colliding into another object from right.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @returns {boolean}
	 */
	Table2Game.prototype.collidingFromRight = function(obj1, obj2) {
		if(obj1.velocityX !== 0) {
			return this.colliding(obj1.x - Math.abs(obj1.velocityX), obj1.y, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		} else {
			return this.colliding(obj1.x - 1, obj1.y, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}
	}; // End Table2Game.prototype.collidingFromRight()

	/**
	 * @description Determines if an object is colliding into another object from above.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @returns {boolean}
	 */
	Table2Game.prototype.collidingFromAbove = function(obj1, obj2) {
		if(obj1.velocityY !== 0) {
			return this.colliding(obj1.x, obj1.y + Math.abs(obj1.velocityY), obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		} else {
			return this.colliding(obj1.x, obj1.y + 1, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}
	}; // Table2Game.prototype.collidingFromAbove()

	/**
	 * @description Determines if an object is colliding into another object from below.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @returns {boolean}
	 */
	Table2Game.prototype.collidingFromBelow = function(obj1, obj2) {
		if(obj1.velocityY !== 0) {
			return this.colliding(obj1.x, obj1.y - Math.abs(obj1.velocityY), obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		} else {
			return this.colliding(obj1.x, obj1.y - 1, obj1.width, obj1.height, obj2.x, obj2.y, obj2.width, obj2.height);
		}
	}; // End Table2Game.prototype.collidingFromBelow()

	/**
	 * @description Determines whether two objects are colliding from any side.
	 * @param {Object} obj1 A (Sprite or Sprite-like) object being checked for collision with obj2.
	 * @param {Object} obj2 A (Sprite or Sprite-like) object being checked for collision with obj1.
	 * @param {boolean} includeCorners Whether or not to include corners in the check (rather than just sides, top, and bottom).
	 * @returns {boolean}
	 */
	Table2Game.prototype.touching = function(obj1, obj2, includeCorners) {
		
		if(Math.abs(obj1.x - obj2.x) > 1 || Math.abs(obj1.y - obj2.y) > 1) {
			return false;
		}
		
		if(includeCorners) {
			var fromBL = { // To see if obj1 is hitting obj2's bottom left corner, check if this obj1 is colliding this object from bottom
				x: obj2.x - 1, 
				y: obj2.y,
				width: obj2.width,
				height: obj2.height,
				velocityX: 0,
				velocityY: 0
			},
			fromBR = { //... if this is colliding from bottom
				x: obj2.x + 1, 
				y: obj2.y,
				width: obj2.width,
				height: obj2.height,
				velocityX: 0,
				velocityY: 0
			},
			fromTL = { // if this is colliding from top
				x: obj2.x - 1,
				y: obj2.y,
				width: obj2.width,
				height: obj2.height,
				velocityX: 0,
				velocityY: 0
			},
			fromTR = { // if this is colliding from top
				x: obj2.x + 1, 
				y: obj2.y,
				width: obj2.width,
				height: obj2.height,
				velocityX: 0,
				velocityY: 0
			};

			return	(
				// from sides
				this.collidingFromAbove(obj1, obj2) ||
				this.collidingFromBelow(obj1, obj2) ||
				this.collidingFromLeft(obj1, obj2) ||
				this.collidingFromRight(obj1, obj2) ||
			
				// from corners
				this.collidingFromBelow(obj1, fromBL) ||
				this.collidingFromBelow(obj1, fromBR) ||
				this.collidingFromAbove(obj1, fromTL) ||
				this.collidingFromAbove(obj1, fromTR));
		} else {
			return (this.collidingFromAbove(obj1, obj2) || this.collidingFromBelow(obj1, obj2) || this.collidingFromLeft(obj1, obj2) || this.collidingFromRight(obj1, obj2));
		}
	}; // End Table2Game.prototype.touching()

	/**
	 * @description Erases the current game screen.
	 * @returns {Object} The curent Table2Game object.
	 */
	Table2Game.prototype.clear = function() {
		for(var i = 0; i < tableArr.length; i++) {
			for(var j = 0; j < tableArr[i].length; j++) {
				tableArr[i][j].style.background = "transparent";
			}
		}

		return this;
	}; // End Table2Game.prototype.clear()

	/**
	 * @description Draws a rectangular shape to the screen.
	 * @param {number} x The x value of the top-left corner of the rectangle.
	 * @param {number} y The y value of the top-left corner of the rectangle.
	 * @param {number} width The number of cells in the overall shape's width.
	 * @param {number} height The number of cells in the overall shape's height.
	 * @param {string} [color] The color to draw the table cells in this shape.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.fillRect = function(x, y, width, height, color) {
		color = color || defaultColor;

		if(width === 0) {
			for(var i = y, len = Math.min(y + height, screenHeight); i < len; i++) {
				for(var j = x, jLen = Math.min(x + width, screenWidth); j < jLen; j++) {
					this.getCell(j, i).style["border-left"] = "1px solid " + color;
				}
			}		
		} else if(height === 0) {
			for(var i = y, len = Math.min(y + height, screenHeight); i < len; i++) {
				for(var j = x, jLen = Math.min(x + width, screenWidth); j < jLen; j++) {
					this.getCell(j, i).style["border-top"] = "1px solid " + color;
				}
			}			
		} else {
			for(var i = y, len = Math.min(y + height, screenHeight); i < len; i++) {
				for(var j = x, jLen = Math.min(x + width, screenWidth); j < jLen; j++) {
					this.getCell(j, i).style.backgroundColor = color;
				}
			}
		}
		
		return this;
	}; // Table2Game.prototype.fillRect()

	/**
	 * @description Draws a polygon (a Sprite's polygon array) to the game screen.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.fillPolygon = function(polygon, color) {
		for(var i = 0, len = polygon.length; i < len; i++) {
			this.fillRect(polygon[i].x, polygon[i].y, polygon[i].width, polygon[i].height, polygon[i].color || color);
		}
		
		return this;
	}; // End Table2Game.prototype.fillPolygon()
	
	/**
	 * @description Draws the current game screen frame.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.paint = function() {
		this.clear();
		
		if(!paused || !hideOnPause) {
			for(var name in sprites) {
				if(sprites[name].polygon.length) {
					this.fillPolygon(sprites[name].polygon, sprites[name].color);
				} else {
					this.fillRect(sprites[name].x, sprites[name].y, sprites[name].width, sprites[name].height, sprites[name].color);
				}
			}
		}
		
		this.onpaint();

		return this;
	}; // End Table2Game.prototype.paint()

	/**
	 * @description Pauses the current running game.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.pause = function() {		
		if(hideOnPause) {
			this.clear();
			this.detailsDiv.style.display = "none";
		}

		this.onpause();

		paused = true;
		clearInterval(timer);

		return this;
	}; // Table2Game.prototype.pause()

	/**
	 * @description Unpauses the current running game.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.unpause = function() {
		this.onunpause();
		paused = false;

		if(this.detailsDiv.style.display = "none") {
			this.detailsDiv.style.display = "inline block";
		}

		timer = setInterval(updateForTimer, delay);
		
		return this;
	}; // End Table2Game.prototype.unpause()
	
	// Checks if game is currently paused.
	Table2Game.prototype.isPaused = function() {
		return paused;
	};

	// Sets callback to be implemented when game is paused.
	Table2Game.prototype.onpause = function() {
		pauseCallback.call(this);
	};
	
	// Sets callback to be implemented when game is unpaused.
	Table2Game.prototype.onunpause = function() {
		unpauseCallback.call(this);
	};

	// Sets callback to be implemented when game screen is painted.
	Table2Game.prototype.onpaint = function() {
		onpaintCallback.call(this);
	};

	/**
	 * @description Gets the value of a detail (scoreboard) item.
	 * @param {string} detail The name of the detail whose value is being requested.
	 * @returns {*}
	 */
	Table2Game.prototype.getDetails = function(detail) {
		if(typeof detail === "undefined") {
			var detailsObj = {};

			for(var d in details) {
				detailsObj[d] = this.details[d];
			}

			return detailsObj;
		} else {
			return this.details[detail];
		}
	}; // Table2Game.prototype.getDetails()
	
	/**
	 * @description Sets the value of a specific detail, internally and on the scoreboard.
	 * @param {string} detail The name of the detail to be updated.
	 * @param {*} val The new value of the detail. Typecast to a string when posted on scoreboard.
	 */
	Table2Game.prototype.setDetails = function(detail, val) {
		if(typeof detail === "object") {
			for(var d in detail) {
				this.details[d] = detail[d];
				document.getElementById("Table2Game" + d + "Span").innerHTML = detail[d];
			}
		} else {
			this.details[detail] = val;
			document.getElementById("Table2Game" + detail + "Span").innerHTML = val;
		}
		
		return this;
	}; // End Table2Game.prototype.setDetails()

	/**
	 * @description Gets the HTML <span> element aligned to a specific detail, or the element hosting the full collection.
	 * @param detail The name of the specific detail. If none is provided, the entire details <div> element is returned.
	 * @returns {Object}
	 */
	Table2Game.prototype.getDetailsElement = function(detail) {
		if(detail) {
			return document.getElementById("Table2Game" + detail + "Span").innerHTML;
		} else {
			return this.detailsDiv;
		}
	}; // End getDetailsElement()

	/**
	 * @description Gets the closest <td> or <th> ancestor element of an mouse event target.
	 * @param {Object} target The target element of the event.
	 * @returns {Object|null} Returns null of no ancestors are of the form <td> or <th>.
	 */
	Table2Game.prototype.closestCell = function(target) {
		var nodeName = "",
			element = target;
		
		if(!element) {
			return null;
		}

		if(element.nodeName === "TD" || element.nodeName === "TH") {
			return element;
		}

		while(element.parentNode && nodeName !== "TD" && nodeName !== "TH" && nodeName !== "TABLE") {
			var startingElm = element;

			try {
				element = element.parentNode;
				nameName = element.nodeName;
			} catch (e) {
				break;
			}
		}

		if(nodeName === "TD" || nodeName === "TH") {
			return element;
		} else {
			return null;
		}
	}; // End Table2Game.prototype.closestCell()

	/**
	 * @description Gets the x-y coordinates of a table cell on the game screen.
	 * @param {Object} cell The HTML <td> or <th> element being checked.
	 * @returns {Object|number} If the given cell exists in the current stored data, returns an object
	 *   with keys x and y, pointing respectively to the x and y values for this cell. Otherwise returns -1.
	 */
	Table2Game.prototype.cellCoordinates = function(cell) {
		var tableArr = this.getTableArr();

		for(var i = 0; i < tableArr.length; i++) {
			if(tableArr[i].indexOf(cell) !== -1) {
				return {
					x: tableArr[i].indexOf(cell),
					y: i
				}
			}
		}

		return -1;
	}; // End Table2Game.prototype.cellCoordinates()

	/**
	 * @description Attempt to reposition a sprite so that it's the last thing drawn to the screen.
	 * @param {string} spriteName The stored name of the sprite to be moved.
	 * @returns {Object} The current Table2Game object.
	 */
	Table2Game.prototype.moveToTop = function(spriteName) {
		var sprite = this.getSprites(spriteName),
			storedSpriteVals = {};
		
		for(var val in sprite) {
			if(typeof val === "object" && typeof JSON !== "undefined") {
				storedSpriteVals[val] = JSON.parse(JSON.stringify(sprite[val]));
			} else {
				storedSpriteVals[val] = sprite[val];
			}
		}

		return this.unregisterSprite(spriteName).registerSprite(spriteName, storedSpriteVals);
	}; // End Table2Game.prototype.moveToTop()

	/**
	 * @description Creates a basic flashing effect, usually indicating a collision or a game end.
	 * @param {number} numFlashes The total number of flashes to be shown in this animation.
	 * @param {number} delayStep The wait in milliseconds between each flash.
	 * @param {function} callback A function to be implemented after the flashes complete.
	 */
	Table2Game.prototype.flashEnding = function(numFlashes, delayStep, callback) {
		var index = 0,
			delayStep = delayStep || 150,
			numFlashes = numFlashes || 5,
			self = this,
			totalFlashTime = (numFlashes * 2 - 1) * delayStep;

		if(!self.flashEndingPosition) {
			for(var i = 0; i < numFlashes * 2; i +=2) {
				setTimeout(function() {
					self.pause();
				}, delayStep * i);

				setTimeout(function() {
					self.unpause();
					self.paint();
				}, delayStep * (i + 1));
			}

			this.flashEndingPosition = 1;
		}

		setTimeout(function() {
			self.flashEndingPosition = 2;
			
			if(callback) {
				callback.call(self);
			}
		}, totalFlashTime);
	} // End Table2Game.prototype.flashEnding()

	///////////////////////////////////////////////////

	/**
	 *
	 * Below are multiple demos of games built on this engine.
	 *
	 */

	///////////////////////////////////////////////////
	/* Ping Pong */

	demoGamesOpts["Ping Pong"].init = function() {
		this.registerSprite("leftPaddle", {x: 0, y: 2, width: 1, height: 3, velocityX: 0, velocityY: 0, color: this.defaultColor});
		this.registerSprite("rightPaddle", {x: this.screenWidth - 1, y: 2, width: 1, height: 3, velocityX: 0, velocityY: 0, color: this.defaultColor});
		this.registerSprite("ball", {x: 3, y: 2, velocityX: 1, velocityY: 1});
	};

	demoGamesOpts["Ping Pong"].details = {
		Score: 0,
		Lives: 3
	};

	demoGamesOpts["Ping Pong"].update = function() {
		var ball = this.getSprites("ball"),
			leftPaddle = this.getSprites("leftPaddle"),
			rightPaddle = this.getSprites("rightPaddle"),
			self = this;

		// Game is over
		if(!ball) {
			return;
		}

		if(ball.velocityX > 0) {
			if( this.collidingFromLeft(ball, rightPaddle) ) { // Hits player paddle
				ball.velocityX *= -1;
				ball.x += ball.velocityX;
			} else if(ball.x + ball.velocityX <= this.screenWidth) {
				ball.x += ball.velocityX;
			} else { // Passes player
				ball.color = "#ffdddd";
				ball.velocityX *= -1;

				self.setDetails("Lives", self.getDetails("Lives") - 1);
				
				if(self.getDetails("Lives") === 0) {
					self.unregisterSprite("ball");
					self.flashEnding();
					return;
				}

				self.setTimeout(function() {
					ball.x = Math.ceil(self.screenWidth / 2);
					self.paint();

					self.setTimeout(function() {
						ball.color = "#eee";
					}, 500);
				}, 500);
			}
		} else if(ball.velocityX < 0) {
			if( this.collidingFromRight(ball, leftPaddle) ) { // Hits cpu paddle
				ball.velocityX *= -1;
				ball.x += ball.velocityX;
			} else if(ball.x >= 0) {
				ball.x += ball.velocityX;
			} else { // Passes cpu paddle
				ball.color = "#ddffdd";
				ball.velocityX *= -1;

				self.setDetails("Score", self.getDetails("Score") + 100);

				if(self.getDetails("Score") >= 1000) {
					self.unregisterSprite("ball");
					self.flashEnding(3, 300);
					return;
				}
				
				self.setTimeout(function() {
					ball.x = Math.floor(self.screenWidth / 2);
					self.paint();
								
					self.setTimeout(function() {					
						ball.color = "#eee";
					}, 500);
				}, 500);
			}
		}

		if(ball.velocityY > 0) {
			if(ball.y + ball.velocityY < this.screenHeight) {
				ball.y += ball.velocityY;
			} else { // Hitting bottom wall
				ball.velocityY *= -1;
				ball.y += ball.velocityY;
			}
		} else if(ball.velocityY < 0) {
			if(ball.y > 0) {
				ball.y += ball.velocityY;
			} else { // Hitting top wall
				ball.velocityY *= -1;
				ball.y += ball.velocityY;
			}
		}

		// If you create helper functions, it's usually a good idea to pass the current `this` Table2Game reference with .call()
		updateAIPaddle.call(self, ball, leftPaddle);
	};

	updateAIPaddle = function(ball, leftPaddle) {

		// Remember to make the AI a little stupid...
		if(Math.random() * 10 < 5) {
			return;
		}

		// Computer AI	
		if(leftPaddle.y + 1 < ball.y) {
			if(leftPaddle.y + leftPaddle.height < this.screenHeight)
				leftPaddle.y++;
		}
		else
			if(leftPaddle.y > 0)
			leftPaddle.y--;
	};

	demoGamesOpts["Ping Pong"].delay = 100;

	demoGamesOpts["Ping Pong"].onkeydown = function(e) {
		var paddle = this.getSprites("rightPaddle");
		
		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				if(paddle.y > 0)
					paddle.y--;
				break;
			case 40: // Down arrow
			case 83: // S
				if(paddle.y + paddle.height < this.screenHeight)
					paddle.y++;
				break;
			case 32:
				if(this.isPaused()) {
					this.unpause();
				} else {
					this.pause();
				}
			break;
			default: {}
		}

		this.paint();
	};

	///////////////////////////////////////////////////
	/* Snake */

	demoGamesOpts["Snake"].init = function() {
		this.registerSprite("snake", {
			x: Math.floor(this.screenWidth / 2),
			y: Math.floor(this.screenHeight / 2),
			width: 1,
			height: 1,
			velocityX: 1,
			velocityY: 0,
			polygon: [{x: Math.floor(this.screenWidth / 2), y: Math.floor(this.screenHeight / 2), width: 1, height: 1}]
		});
		
		this.registerGlobal("timeCount", 0);
	};

	demoGamesOpts["Snake"].details = {
		Score: 0,
		Lives: 3
	};

	var addBlockToScreen = function(polygon) {
		var searching = true,
			x = 0,
			y = 0,
			stackBuilding = 0;

		while(searching && stackBuilding < 100) {
			
			x = Math.floor(Math.random() * this.screenWidth);
			y = Math.floor(Math.random() * this.screenHeight);

			if(!this.colliding({polygon: polygon}, {polygon: [{x: x, y: y, width: 1, height: 1}]})) {
				if(x !== Math.floor(this.screenWidth / 2) || y !== Math.floor(this.screenHeight / 2)) {
					searching = false;
				}
			}

			stackBuilding++;
		}

		this.registerSprite("block" + Object.keys(this.getSprites()).length, {x: x, y: y, width: 1, height: 1, color: "#ddd"});
	};

	demoGamesOpts["Snake"].update = function() {
		var snake = this.getSprites("snake");
		
		if(!snake) { // Game is over.
			return;
		}
		
		var	lastX = snake.polygon[snake.polygon.length - 1].x,
			lastY = snake.polygon[snake.polygon.length - 1].y,
			idx = 0;

		this.setGlobal("timeCount", this.getGlobals("timeCount") + 1);

		if(this.getGlobals("timeCount") % 15 === 14 && Object.keys(this.getSprites()).length < 2) {
			addBlockToScreen.call(this, snake.polygon);
		}

		var idx = snake.polygon.length;
		while(idx-- > 1) {
			snake.polygon[idx].x = snake.polygon[idx - 1].x;
			snake.polygon[idx].y = snake.polygon[idx - 1].y;
		}

		snake.polygon[0].x += snake.velocityX;
		snake.polygon[0].y += snake.velocityY;

		// Out of bounds
		if(snake.polygon[0].x < 0 || snake.polygon[0].y < 0 ||
			snake.polygon[0].x >= this.screenWidth || snake.polygon[0].y >= this.screenHeight ||
			
			// Snake crashed into itself
			this.colliding({polygon: [snake.polygon[0]]}, {polygon: snake.polygon.slice(3)})) {

			snake.shiftPolygons("color", "#ffdddd", true);
			this.setDetails("Lives", this.getDetails("Lives") - 1);

			if(this.getDetails("Lives") === 0) {
				this.setTimeout(function() {
					resetSnake.call(this, snake);
				}, 500);
			} else {
				var self = this;
				self.flashEnding(null, null, function() { self.unregisterSprite("snake"); });
			}
		} else { // Pick up new block
			var sprites = this.getSprites();
			for(var name in sprites) {
				if(name !== "snake" && this.colliding(snake, sprites[name])) {				
					snake.polygon.push({
						x: lastX,
						y: lastY,
						width: 1,
						height: 1
					});

					this.unregisterSprite(name);
					this.setDetails("Score", this.getDetails("Score") + 100);
				}
			}
		}
	};

	var resetSnake = function(snake) {
		snake.x = Math.floor(this.screenWidth / 2);
		snake.y = Math.floor(this.screenHeight / 2);
		snake.width = 1;
		snake.height = 1;
		snake.velocityX = 1;
		snake.velocityY = 0;
		snake.polygon = [{x: Math.floor(this.screenWidth / 2), y: Math.floor(this.screenHeight / 2), width: 1, height: 1}];
		snake.color = "#ffdddd";

		thie.setDetails({Score: 0, Lives: 3});
		this.setTimeout(function() { snake.color = "#eee"; }, 500);
	};

	demoGamesOpts["Snake"].onkeydown = function(e) {
		var snake = this.getSprites("snake");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				snake.velocityX = 0;
				snake.velocityY = -1;
				break;
			case 40: // Down arrow
			case 83: // S
				snake.velocityX = 0;
				snake.velocityY = 1;
				break;
			case 37: // Left arrow
			case 65: // A
				snake.velocityX = -1;
				snake.velocityY = 0;
				break;
			case 39: // Right arrow
			case 68: // D
				snake.velocityX = 1;
				snake.velocityY = 0;
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					this.pause();
				}
			break;
			default: {}
		}
	};

	demoGamesOpts["Snake"].delay = 180;

	///////////////////////////////////////////////////
	/* Break Bricks */

	demoGamesOpts["Break Bricks"].init = function() {
		this.registerGlobal("score", 0).registerGlobal("lives", 0);

		this.registerSprite("paddle", {
			x: Math.floor(this.screenWidth / 2),
			y: this.screenHeight - 1,
			velocityX: 0,
			velocityY: 0,
			width: 3,
			height: 1
		});

		for(var i = 0; i < 3; i++) {
			for(var j = 0; j < this.screenWidth; j++) {
				this.registerSprite("block_" + i + "_" + j, {
					x: j,
					y: i,
					velocityX: 0,
					velocityY: 0,
					width: 1,
					height: 1
				});
			}
		}
		
		this.registerSprite("ball", {
			x: Math.floor(this.screenWidth / 2) + 1,
			y: this.screenHeight - 2,
			velocityX: 0,
			velocityY: 0,
			width: 1,
			height: 1,
			color: "#ddd"
		});
	};

	demoGamesOpts["Break Bricks"].details = {
		Lives: 3,
		Score: 0
	};

	demoGamesOpts["Break Bricks"].onkeydown = function(e) {
		var paddle = this.getSprites("paddle"),
			ball = this.getSprites("ball");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
					if(ball.y === paddle.y - 1 && ball.x >= paddle.x && ball.x < paddle.x + paddle.width) {
						ball.velocityY = -1;
						
						if(Math.random() * 2 < 1)
							ball.velocityX++;
						else
							ball.velocityX--;
					}
				break;
			case 37: // Left arrow
			case 65: // A
				if(paddle.x > 0) {
					if(ball.y === paddle.y - 1 && ball.x >= paddle.x && ball.x < paddle.x + paddle.width && !ball.velocityX) {
						ball.x--;
					}
					
					paddle.x--;
				}
				break;
			case 39: // Right arrow
			case 68: // D
				if(paddle.x + paddle.width < this.screenWidth) {
					if(ball.y === paddle.y - 1 && ball.x >= paddle.x && ball.x < paddle.x + paddle.width && !ball.velocityX) {
						ball.x++;
					}

					paddle.x++;
				}
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					this.pause();
				}
			break;
			default: {}
		}
	};

	demoGamesOpts["Break Bricks"].update = function() {
		var ball = this.getSprites("ball"),
			blocks = this.getSprites(/block/),
			paddle = this.getSprites("paddle");

		// Game is over
		if(!ball) {
			return;
		}

		if(ball.y + ball.velocityY >= 0) {
			ball.y += ball.velocityY;
		} else { // bounce off ceiling
			ball.velocityY *= -1;
			ball.y += ball.velocityY;
		}

		if(ball.velocityX > 0) {
			if(ball.x + ball.width < this.screenWidth) { // move right
				ball.x += ball.velocityX;
			} else { // bounce off right wall
				ball.velocityX *= -1;
				ball.x += ball.velocityX;
			}
		} else if(ball.velocityX < 0) {
			if(ball.x > 0) { // move left
				ball.x += ball.velocityX;
			} else { // bounce of left wall
				ball.velocityX *= -1;
				ball.x += ball.velocityX;
			}
		}

		// collision detection between ball and blocks
		for(var name in blocks) {
			if(this.touching(ball , blocks[name], true)) {
				ball.velocityX *= -1;
				ball.velocityY = Math.abs(ball.velocityY);
				this.unregisterSprite(name);
				this.setDetails("Score", this.getDetails("Score") + 100);

				// End game when all blocks have been deleted
				if(Object.keys(this.getSprites(/block/)).length === 0) {
					this.unregisterSprite("ball");
					//*** this.setDelay(40);
					this.flashEnding(3, 200);
					return;
				}
			}
		}

		if(this.collidingFromBelow(paddle, ball)) {
			ball.velocityY = -Math.abs(ball.velocityY);
		}

		if(ball.y > this.screenHeight + 2) {
			ball.velocityY = 0;
			ball.velocityX = 0;
			ball.y = this.screenHeight - 2;
			ball.x = paddle.x + 1;
			
			var lives = this.getDetails("Lives");
			this.setDetails("Lives",  --lives);

			if(lives <= 0) {
				this.unregisterSprite("ball");
				this.flashEnding(3, 400);
			}
		}
	};

	demoGamesOpts["Break Bricks"].delay = 200;

	///////////////////////////////////////////////////
	/* Whack-a-mole */

	demoGamesOpts["Whack-a-mole"].init = function() {
		this.registerGlobal("timeCount", 0);
		this.registerGlobal("currentWait", 20);
		this.registerGlobal("gameOver", false);
	};

	demoGamesOpts["Whack-a-mole"].details = {
		Score: 0
	};

	demoGamesOpts["Whack-a-mole"].update = function() {
		if(this.getGlobals("gameOver") === true) {
			return;
		}

		var timeCount = this.getGlobals("timeCount"),
			currentWait = this.getGlobals("currentWait");

		this.setGlobal("timeCount", timeCount + 1);
		timeCount++;

		if(timeCount % currentWait === 0) {
			addMole.call(this);
		}

		if(timeCount === 1000) {
			return winMoleGame.call(this);
		} else if(timeCount % 100 === 0) {
			this.setGlobal("currentWait", currentWait - 1);
		}

		if(Object.keys(this.getSprites()).length > 10) {
			return loseMoleGame.call(this);
		}
	};

	var addMole = function() {
		var moles = this.getSprites(/mole_/g),
			searching = true,
			x = 0,
			y = 0,
			stackBuilding = 0;

		while(searching && stackBuilding < 100) {
			x = Math.floor(Math.random() * this.screenWidth);
			y = Math.floor(Math.random() * this.screenHeight);
			
			if(!this.getSprites("mole_" + x + "_" + y)) {
				searching = false;
			}
		}
		
		this.registerSprite("mole_" + x + "_" + y, {x: x, y: y});
	};

	var winMoleGame = function() {
		this.setGlobal("gameOver", true);
		this.registerSprite("gameOverIndicator", {x: 0, y: 0, width: 1, height: 1, color: "#ddffdd"});
	};

	var loseMoleGame = function() {
		this.setGlobal("gameOver", true);
		this.registerSprite("gameOverIndicator", {x: 0, y: 0, width: 1, height: 1, color: "#ffdddd"});
	};

	demoGamesOpts["Whack-a-mole"].onclick = function(e) {
		var cell = this.closestCell(e.target),
			coords = this.cellCoordinates(cell),
			x = coords.x,
			y = coords.y;

		if(this.getSprites("mole_" + x + "_" + y)) {
			this.setDetails("Score", this.getDetails("Score") + 100);
			this.unregisterSprite("mole_" + x + "_" + y);
		}
	};

	///////////////////////////////////////////////////
	/* Paint */

	demoGamesOpts["Paint"].init = function() {
		var self = this,
			colorInput = document.createElement("input"),
			colorElm = document.createElement("div"),
			table = self.getTable();

		colorInput.type = "color";
		self.registerGlobal("paintedCount", 0);

		colorInput.style.marginLeft = self.table.style.marginLeft ||
			(window.getComputedStyle ? window.getComputedStyle(self.table).getPropertyValue("margin-left") : "");
		
		colorInput.onchange = function(e) {
			self.setGlobal("storedColor", this.value);
		};

		 var detailsElm = this.getDetailsElement();

		table.style.marginBottom = "0";
		colorElm.appendChild(colorInput);
		table.parentNode.insertBefore(colorElm, table.nextSibling);
		self.registerGlobal("colorInput", colorInput)
			.registerGlobal("colorElm", colorElm)
			.registerGlobal("storedColor", "#000000")
			.registerGlobal("overTable", false)
			.registerGlobal("overColorElm", false);

		// We'll pause to hide, when the mouse leaves both the table and color input
		handleElmEvent(colorElm, "mouseleave", function(){
			self.setGlobal("overColorElm", false);

			if(!self.getGlobals("overTable")) {
				self.pause();
			}
		}, false);

		handleElmEvent(colorElm, "mouseenter", function(){
			self.setGlobal("overColorElm", true);
			self.unpause();
		}, false);
	};

	demoGamesOpts["Paint"].onpause = function() {
		this.getGlobals("colorInput").style.display = "none";
	};

	demoGamesOpts["Paint"].onunpause = function() {
		this.getGlobals("colorInput").style.display = "block";
	};

	demoGamesOpts["Paint"].onmouseleave = function(e) {
		this.setGlobal("overTable", false);

		if(!self.getGlobals("overColorElm")) {
			self.pause();
		}
	};

	demoGamesOpts["Paint"].onmouseenter = function(e) {
		this.setGlobal("overTable", true);
		this.unpause();
	};

	demoGamesOpts["Paint"].onclick = function(e) {
		paintCell.call(this, e);
	};

	demoGamesOpts["Paint"].onmousedrag = function(e) {
		paintCell.call(this, e);
	};

	var paintCell = function(e) {
		var colorInput = this.getGlobals("colorInput"),
			cellToPaint = this.closestCell(e.target),
			paintedCount = this.getGlobals("paintedCount");

		this.registerSprite("paintedCount" + paintedCount, {
					x: this.cellCoordinates(cellToPaint).x,
					y: this.cellCoordinates(cellToPaint).y,
					width: 1,
					height: 1,
					color: this.getGlobals("storedColor")
				});

		this.setGlobal("paintedCount", (paintedCount + 1));
	};
	
	///////////////////////////////////////////////////
	/* Maze */

	demoGamesOpts["Maze"].init = function() {

		this.registerSprite("wall1", {
			x: 0,
			y: 0,
			width: 3,
			height: 1	
		}).registerSprite("wall2", {
			x: 6,
			y: 0,
			width: 1,
			height: 1	
		}).registerSprite("wall3", {
			x: 1,
			y: 2,
			width: 3,
			height: 1
		}).registerSprite("wall4", {
			x: 8,
			y: 1,
			width: 1,
			height: 1
		}).registerSprite("wall5", {
			x: 4,
			y: 1,
			width: 1,
			height: 4	
		}).registerSprite("wall6", {
			x: 0,
			y: 4,
			width: 3,
			height: 1	
		}).registerSprite("wall7", {
			x: 5,
			y: 2,
			width: 3,
			height: 1
		}).registerSprite("wall8", {
			x: 9,
			y: 0,
			width: 1,
			height: this.screenHeight	
		}).registerSprite("wall9", {
			x: 0,
			y: 6,
			width: this.screenWidth,
			height: 1
		}).registerSprite("wall10", {
			x: 5,
			y: 4,
			width: 3,
			height: 1
		}).registerSprite("goal", {
			x: 8,
			y: 0,
			width: 1,
			height: 1,
			color: "#ddffdd"
		}).registerSprite("player", {
			x: 0,
			y: 5,
			width: 1,
			height: 1,
			color: "#ddd"
		});
	};

	demoGamesOpts["Maze"].onkeydown = function(e) {
		var player = this.getSprites("player"),
			goal = this.getSprites("goal");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				if(canGoUpInMaze.call(this))
					player.y--;
				break;
			case 40: // Down arrow
			case 83: // S
				if(canGoDownInMaze.call(this))
					player.y++;
				break;
			case 37: // Left arrow
			case 65: // A
				if(canGoLeftInMaze.call(this))
					player.x--;
				break;
			case 39: // Right arrow
			case 68: // D
				if(canGoRightInMaze.call(this))
					player.x++;
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					 this.pause();
				}
			break;
			default: {}
		}

		if(this.colliding(player, goal)) {
			this.flashEnding();
		}
	};

	function canGoUpInMaze() {
		var sprites = this.getSprites(),
			player = this.getSprites("player"),
			goal = this.getSprites("goal");

		if(player.y === 0)
			return false;

		if(this.collidingFromBelow(player, goal))
			return true;

		for(var name in sprites) {
			if(sprites[name] === player) {
				continue;
			}

			if(this.collidingFromBelow(player, sprites[name])) {
				return false;
			}
		}
		
		return true;
	}

	function canGoDownInMaze() {
		var sprites = this.getSprites(),
			player = this.getSprites("player"),
			goal = this.getSprites("goal");

		if(player.y === this.screenHeight - 1)
			return false;

		if(this.collidingFromAbove(player, goal))
			return true;

		for(var name in sprites) {
			if(sprites[name] === player) {
				continue;
			}

			if(this.collidingFromAbove(player, sprites[name])) {
				return false;
			}
		}
		
		return true;
	}

	function canGoLeftInMaze() {
		var sprites = this.getSprites(),
			player = this.getSprites("player"),
			goal = this.getSprites("goal");

		if(player.x === 0)
			return false;

		if(this.collidingFromRight(player, goal))
			return true;

		for(var name in sprites) {
			if(sprites[name] === player) {
				continue;
			}

			if(this.collidingFromRight(player, sprites[name])) {
				return false;
			}
		}
		
		return true;
	}

	function canGoRightInMaze() {
		var sprites = this.getSprites(),
			player = this.getSprites("player"),
			goal = this.getSprites("goal");

		if(player.x === this.screenWidth - 1)
			return false;

		if(this.collidingFromLeft(player, goal))
			return true;
		
		for(var name in sprites) {
			if(sprites[name] === player) {
				continue;
			}

			if(this.collidingFromLeft(player, sprites[name])) {
				return false;
			}
		}
		
		return true;
	}

	///////////////////////////////////////////////////
	/* Creepy Crawler */

	demoGamesOpts["Creepy Crawler"].init = function() {
		this.registerSprite("crawler", {
			velocityX: 1,
			x: -1,
			y: -1,
			polygon:  [{x: 3, y: 0, width: 1, height: 1},
				{x: 2, y: 0, width: 1, height: 1},
				{x: 1, y: 0, width: 1, height: 1},
				{x: 0, y: 0, width: 1, height: 1}]
		});

		this.registerSprite("player", {
			x: Math.floor(this.screenWidth / 2),
			y: Math.floor(this.screenHeight - 1),
			width: 1,
			height: 1
		});
	};

	demoGamesOpts["Creepy Crawler"].details = {
		Score: 0
	};

	demoGamesOpts["Creepy Crawler"].update = function() {
		var centipede = this.getSprites("crawler"),
			idx = centipede.polygon.length,
			playerBullets = this.getSprites(/playerBullet/),
			player = this.getSprites("player");

		if(!centipede.polygon.length) {
			return;
		}

		// centipede walking
		while(idx-- > 1) {
			centipede.polygon[idx].x = centipede.polygon[idx - 1].x;
			centipede.polygon[idx].y = centipede.polygon[idx - 1].y;
		}

		if(centipede.velocityX > 0) { // going right
			if(centipede.polygon[0].x + centipede.velocityX < this.screenWidth) {
				centipede.polygon[0].x += centipede.velocityX;
			} else {
				centipede.polygon[0].y++;
				centipede.velocityX *= -1;
			}
		} else { // going left
			if(centipede.polygon[0].x + centipede.velocityX >= 0) {
				centipede.polygon[0].x += centipede.velocityX;
			} else {
				centipede.polygon[0].y++;
				centipede.velocityX *= -1;
			}
		}

		for(var name in playerBullets) {
			if(this.colliding(playerBullets[name], centipede)) {
				centipede.polygon.pop();
				this.unregisterSprite(playerBullets[name].name);
			}
		}
		
		if(!centipede.polygon.length) {
			// Game is won
			this.flashEnding(3, 400);
		}

		if(this.colliding(player, centipede) || centipede.y > this.screenHeight) {
			var self = this;
			this.flashEnding(null, null, function() { self.unregisterSprite("crawler"); });
		}
	}

	demoGamesOpts["Creepy Crawler"].delay = 200;

	demoGamesOpts["Creepy Crawler"].onkeydown = function(e) {
		var centipede = this.getSprites("crawler"),
			player = this.getSprites("player"),
			delay = this.delay;
		
		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				var b = new PlayerBullet({
					x: player.x,
					y: player.y - 1,
					velocityX: 0,
					velocityY: -1
				}, this);

				setTimeout(function() { b.moveY(); }, delay);
				break;
			case 40: // Down arrow
			case 83: // S

				break;
			case 37: // Left arrow
			case 65: // A
				if(player.x > 0)
					player.x--;
				break;
			case 39: // Right arrow
			case 68: // D
				if(player.x + player.width < this.screenWidth)
					player.x++;
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					 this.pause();
				}
			break;
			default: {}
		}
	}

	function PlayerBullet(opts, Table2GameObj) {
		var bulletCount = Object.keys( Table2GameObj.getSprites(/playerBullet/) || {} ).length;

		this.x = opts.x;
		this.y = opts.y;
		this.velocityX = opts.velocityX;
		this.velocityY = opts.velocityY;
		this.width = opts.width || 1;
		this.height = opts.height || 1;
		this.name = opts.name || "playerBullet" + bulletCount;

		Table2GameObj.registerSprite(this.name, {
			x: opts.x,
			y: opts.y,
			velocityX: opts.velocityX,
			velocityY: opts.velocityY,
			width: opts.width || 1,
			height: opts.height || 1
		});

		var pb = this;
		this.moveY = function() {
			
			// Check dimensions to see if bullet is on screen.
			if(pb.y >= 0 && pb.velocityY < 0) {
				var gto = Table2GameObj.getSprites(pb.name) || {};
				pb.y += pb.velocityY;
				gto.y = pb.y;
				
				setTimeout(pb.moveY, Table2GameObj.delay);
			} else {
				Table2GameObj.unregisterSprite(pb.name);
			}
		};
	} // End PlayerBullet() constructor

	///////////////////////////////////////////////////
	/* Jumper  */

	var hurdleJumpMax = 4,
		hurdleJumpCurrent = 0;

	demoGamesOpts["Jumper"].init = function() {
		this.registerSprite("player", {
				x: 2,
				y: this.screenHeight - 2,
				width: 1,
				height: 1,
				velocityX: 0,
				velocityY: 0
			})
			.registerSprite("ground", {
				x: 0,
				y: this.screenHeight - 1,
				width: this.screenWidth,
				height: 1,
				velocityX: 0,
				velocityY: 0
			})
			.registerGlobal("awaitingReset", false)
			.registerGlobal("walls", {})
			.registerGlobal("timeCount", 0);

		setUpHurdles.call(this);
	};

	demoGamesOpts["Jumper"].details = {
		Score: 0
	};

	demoGamesOpts["Jumper"].update = function() {
		var sprites = this.getSprites(),
			timeCount = this.getGlobals("timeCount"),
			awaitingReset = this.getGlobals("awaitingReset"),
			walls = this.getGlobals("walls"),
			player = this.getSprites("player");

		this.setGlobal("timeCount", timeCount + 1);
		
		for(var name in sprites) {
			if(name === "player" || name === "ground") {
				continue;
			}

			sprites[name].x += sprites[name].velocityX;
			sprites[name].y += sprites[name].velocityY;

			// Wall has left the screen to the left - no need to keep it in memory
			if(sprites[name].x < 0) {
				this.unregisterSprite(name);
				this.setDetails("Score", this.getDetails("Score") + 100);
			}
		}
		
		if(walls[timeCount]) {
			this.registerSprite("hurdle" + (sprites["hurdle" + timeCount] ? timeCount + "" + parseInt(Math.random()*100) : timeCount),
			{
				x: this.screenWidth - 1,
				y: (typeof walls[timeCount].y === "undefined") ? (this.screenHeight - 1 - walls[timeCount].height) : walls[timeCount].y,
				width: 1,
				height: walls[timeCount].height,
				velocityX: -1,
				velocityY: 0
			});
		}

		if(hurdlerCanMove.call(this)) {
			if(player.velocityY < 0 && hurdleJumpCurrent < hurdleJumpMax) {
				player.y += player.velocityY;
				hurdleJumpCurrent++;
			} else {
				player.velocityY = Math.abs(player.velocityY);
				player.y += player.velocityY;
			}

			if(player.velocityY > 0 && this.collidingFromAbove(player, sprites["ground"])) {
				player.velocityY = 0;
				hurdleJumpCurrent = 0;
			}
		} else {
			if(player.velocityY < 0) { // Hit a ceiling
				player.velocityY *= -1;
			} else {
				player.velocityY = 0; // Land
				hurdleJumpCurrent = 0;
			}
		}

		if(!awaitingReset) { // Without this, the flashEnding would be called multiple times, creating bugs in the screen updates.
			for(var name in sprites) {
				if(name === "player" || name === "ground") {
					continue;
				}

				if(this.colliding(player, sprites[name])) {
					this.setGlobal("awaitingReset", true);
					this.flashEnding(null, null, setUpHurdles);
				}
			}
		}

		if(this.getGlobals("timeCount") + this.screenWidth === 231) {
			this.flashEnding(3, 400);
		}
	};

	var setUpHurdles = function() {
		var topStart = this.screenHeight - 7,
			walls = {
				8: {height: 3},
				18: {height: 2},
				30: {height: 3},
				40: {height: 4},
				48: {height: 3},
				60: {height: 2},
				61: {y: 0, height: topStart + 2},
				70: {height: 2 },
				80: {height: 4},
				90: {height: 1},
				100: {height: 2},
				101: {height: 2},
				109: {height: 3},
				112: {height: 5},
				118: {height: 2},
				121: {height: 1},
				123: {height: 1},
				127: {y: 0, height: topStart + 4},
				130: {height: 2},
				144: {height: 1},
				145: {y: 1, height: topStart + 1},
				146: {height: 1},
				147: {y: 1, height: topStart + 2},
				148: {y: 2, height: topStart + 2},
				149: {y: 3, height: topStart + 1},
				//148: {height: 1},
				160: {height: 1},
				164: {height: 2},
				170: {height: 3},
				178: {height: 2},
				178: {y: 0, height: this.screenHeight - 2},
				188: {height: 2},
				194: {height: 1},
				196: {height: 2},
				198: {height: 3},
				200: {height: 5}
			},
			player = this.getSprites("player"),
			wallSprites = this.getSprites(/hurdle/);

		for(var wall in wallSprites) {
			this.unregisterSprite(wall);
		}
		
		this.flashEndingPosition = 0; // Reseting this value allows us to restart/replay the game immediately
		this.setGlobal("walls", walls)
			.setGlobal("timeCount", 0)
			.setGlobal("awaitingReset", false);

		player.x = 2;
		player.y = this.screenHeight - 2;
		player.velocityY = 0;
	};

	var hurdlerCanMove = function() {
		var sprites = this.getSprites(),
			player = sprites["player"];

		if(this.collidingFromAbove(player, sprites["ground"])) {
			return true;
		}

		for(var name in sprites) {
			if(name === "player" || name === "ground") {
				continue;
			}

			if(this.collidingFromAbove(player, sprites[name])) {
				return true;
			}
		}

		return true;
	};

	var hurdlerCanJump = function() {
		var sprites = this.getSprites(),
			player = sprites["player"];

		for(var name in sprites) {
			if(name === "player") {
				continue;
			}

			if(this.collidingFromAbove(player, sprites[name])) {
				return true;
			}
		}

		return false;
	};

	demoGamesOpts["Jumper"].delay = 100;

	demoGamesOpts["Jumper"].onkeydown = function(e) {
		var player = this.getSprites("player");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				if(hurdlerCanJump.call(this)) {
					hurdleJumpCurrent = 0;
					player.velocityY = -1;
				}
				break;
			case 37: // Left arrow
			case 65: // A
				if(player.x > 0 && !player.velocityY)
					player.x--;
				break;
			case 39: // Right arrow
			case 68: // D
				if(player.x < 3 && !player.velocityY)
					player.x++;
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					 this.pause();
				}
			break;
			default: {}
		}
	};

	///////////////////////////////////////////////////
	/* Sniper */

	demoGamesOpts["Sniper"].init = function() {
		var halfWidth = parseInt(this.screenWidth / 2, 10),
			halfHeight = parseInt(this.screenHeight / 2, 10);

		this.registerGlobal("shootingSpot", 0);
		this.registerGlobal("timeCount", 0);

		this.registerSprite("enemy0", {
			x: 2,
			y: 2,
			width: 1,
			height: 1,
			color: "#ffdddd"
		});

		this.registerSprite("enemy1", {
			x: Math.ceil(this.screenWidth / 2),
			y: 2,
			width: 1,
			height: 1,
			color: "#ddffdd"
		});

		this.registerSprite("enemy2", {
			x: 2 * Math.floor(this.screenWidth / 3),
			y: Math.ceil(this.screenHeight / 2),
			width: 1,
			height: 1,
			color: "#ddddff"
		});

		this.registerSprite("enemy3", {
			x: Math.ceil(this.screenWidth / 3),
			y: Math.ceil(this.screenHeight / 2),
			width: 1,
			height: 1,
			color: "#fdddbb"
		});
		
		this.registerGlobal("scopeCoords", {
			x: 1,
			y: 1
		});

		this.registerSprite("scopePart0", {
			x: 0,
			y: 0,
			width: 7,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart1", {
			x: 0,
			y: 1,
			width: 3,
			height: 1,
			color: "#eee"
		});
		this.registerSprite("scopePart2", {
			x: 4,
			y: 1,
			width: 3,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart3", {
			x: 0,
			y: 2,
			width: 2,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart4", {
			x: 5,
			y: 2,
			width: 2,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart5", {
			x: 0,
			y: 3,
			width: 1,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart6", {
			x: 6,
			y: 3,
			width: 1,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart7", {
			x: 0,
			y: 4,
			width: 2,
			height: 1,
			color: "#eee"
		});

		this.registerSprite("scopePart8", {
			x: 5,
			y: 4,
			width: 2,
			height: 1,
			color: "#eee"
		});

		this.registerSprite("scopePart9", {
			x: 0,
			y: 5,
			width: 3,
			height: 1,
			color: "#eee"
		});
		
		this.registerSprite("scopePart10", {
			x: 4,
			y: 5,
			width: 3,
			height: 1,
			color: "#eee"
		});

		this.registerSprite("scopePart11", {
			x: 0,
			y: 6,
			width: 7,
			height: 1,
			color: "#eee"
		});

		this.registerSprite("scopePartTop", {
			x: 0,
			y: -1 * halfHeight,
			width: 7,
			height: halfHeight,
			color: "#eee"
		});

		this.registerSprite("scopePartLeft", {
			x: -1 * halfWidth,
			y: -1 * halfHeight,
			width: halfWidth,
			height: 2 * this.screenHeight,
			color: "#eee"
		});

		this.registerSprite("scopePartRight", {
			x: 7,
			y: -1 * halfHeight,
			width: halfWidth,
			height: 2 * this.screenHeight,
			color: "#eee"
		});
		
		this.registerSprite("scopePartBottom", {
			x: 0,
			y: 6,
			width: 7,
			height: halfHeight,
			color: "#eee"
		});
	};

	demoGamesOpts["Sniper"].details = {
		Score: 0
	};

	demoGamesOpts["Sniper"].update = function() {
		var scopeCoords = this.getGlobals("scopeCoords"),
			shootingSpot = this.getGlobals("shootingSpot"),
			enemies = this.getSprites(/enemy/),
			timeCount = this.getGlobals("timeCount");

		timeCount++
		this.setGlobal("timeCount", timeCount);

		// Detect enemy deaths
		if(shootingSpot) {
			if(shootingSpot === 1) {			
				for(var name in enemies) {
					if(this.colliding({polygon: [{x: scopeCoords.x + 2, y: scopeCoords.y + 2, width: 1, height: 1}]} , enemies[name])) {
						this.setDetails("Score", this.getDetails("Score") + 100);
						this.unregisterSprite(name);
					}
				}
			}

			shootingSpot--;
			this.setGlobal("shootingSpot", shootingSpot);
			
			enemies = this.getSprites(/enemy/);
			if(!Object.keys(enemies).length) {
				this.flashEnding(3, 200);
			}
		}

		// Create enemy movement
		for(var name in enemies) {
			var xChange = Math.floor(Math.random() * 2.9) - 1,
				changeX = Math.round(Math.random() * timeCount) % 2,
				yChange = Math.floor(Math.random() * 2.9) - 1,
				changeY = Math.round(Math.random() * timeCount) % 2,
				check = Math.random()*(timeCount % 10);

			if(enemies[name].x + xChange >= 2 && enemies[name].x + xChange < this.screenWidth - 3 && changeX && check < 1)
				enemies[name].x += xChange;

			if(enemies[name].y + yChange >= 2 && enemies[name].y + yChange < this.screenHeight - 3 && changeY && check < 1)
				enemies[name].y += yChange;
		}
	};

	demoGamesOpts["Sniper"].onpaint = function() {
		var scopeCoords = this.getGlobals("scopeCoords"),
			shootingSpot = this.getGlobals("shootingSpot");

		switch(shootingSpot) {
			case 3:
				this.fillRect(scopeCoords.x + 2, scopeCoords.y, 1, 1);
				this.fillRect(scopeCoords.x + 1, scopeCoords.y + 1, 3, 1);
				this.fillRect(scopeCoords.x, scopeCoords.y + 2, 5, 1);
				this.fillRect(scopeCoords.x + 1, scopeCoords.y + 3, 3, 1);
				this.fillRect(scopeCoords.x + 2, scopeCoords.y + 4, 1, 1);
				break;
			case 2:
				this.fillRect(scopeCoords.x + 2, scopeCoords.y + 1, 1, 1);
				this.fillRect(scopeCoords.x + 1, scopeCoords.y + 2, 3, 1);
				this.fillRect(scopeCoords.x + 2, scopeCoords.y + 3, 1, 1);
				break;
			case 1:
				this.fillRect(scopeCoords.x + 2, scopeCoords.y + 2, 1, 1);
				break;
			default:{
			
			}	
		}
	};

	demoGamesOpts["Sniper"].delay = 50;

	demoGamesOpts["Sniper"].onkeydown = function(e) {
		var scopeParts = this.getSprites(/scopePart/),
			scopeCoords = this.getGlobals("scopeCoords"),
			shootingSpot = this.getGlobals("shootingSpot");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				if(scopeCoords.y > 0)
					shiftScopeParts.call(this, 0, -1);
				break;
			case 40: // Down arrow
			case 83: // S
				if(scopeCoords.y + 5 < this.screenHeight)
					shiftScopeParts.call(this, 0, 1);
				break;
			case 37: // Left arrow
			case 65: // A
				if(scopeCoords.x > 0)
					shiftScopeParts.call(this, -1, 0);
				break;
			case 39: // Right arrow
			case 68: // D
				if(scopeCoords.x + 5 < this.screenWidth)
					shiftScopeParts.call(this, 1, 0);
				break;
			case 13: // Enter
				if(!shootingSpot) {
					this.setGlobal("shootingSpot", 4);
				}
			break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					 this.pause();
				}
			break;
			default: {}
		}
	};

	var shiftScopeParts = function(xShift, yShift) {
		var scopeParts = this.getSprites(/scopePart/),
			scopeCoords = this.getGlobals("scopeCoords");
		
		scopeCoords.x += xShift;
		scopeCoords.y += yShift;
		
		for(var name in scopeParts) {
			scopeParts[name].x += xShift;
			scopeParts[name].y += yShift;
		}
	};

	///////////////////////////////////////////////////
	/* Dungeon  */

	var dungeDoorColor = "#333",
		dungeHoleColor = "#000",
		dungeBlockColor = Table2Game.gray,
		dungePushTime = {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0
		};

	demoGamesOpts["Dungeon"].init = function() {

		// Location of the starting room on the map
		var roomCoords = {x: 1, y: 3};
		this.registerGlobal("roomCoords", roomCoords);

		this.registerGlobal("startingColor", "#ddd");
		this.registerGlobal("roomTimeCount", 0);
		this.registerGlobal("gameOver", false);
		this.registerGlobal("hasKey", false);
		this.registerGlobal("hasBlock", false);
		this.registerGlobal("blockCoords", {
			blockCoords: {
				x: Math.floor(this.screenWidth / 2),
				y: 3,
				color: dungeBlockColor
			},
			mapCoords : {
				x: 3,
				y: 0
			}
		});

		this.registerGlobal("doorCoords", {
			left: {
				x: 0,
				y: Math.floor(this.screenHeight / 2)
			},
			top: {
				x: Math.floor(this.screenWidth / 2),
				y: 0
			},
			bottom: {
				x: Math.floor(this.screenWidth / 2),
				y: this.screenHeight - 1
			},
			right: {
				x: this.screenWidth - 1,
				y: Math.floor(this.screenHeight / 2)
			}
		});

		this.registerSprite("player", {
			x: Math.floor(this.screenWidth / 2),
			y: Math.ceil(this.screenHeight / 2),
			width: 1,
			height: 1,
			color: "#ddd"
		});
		
		this.registerSprite("topWall", {
			x: 0,
			y: 0,
			width: this.screenWidth,
			height: 1
		});
		
		this.registerSprite("bottomWall", {
			x: 0,
			y: this.screenHeight - 1,
			width: this.screenWidth,
			height: 1
		});
		
		this.registerSprite("leftWall", {
			x: 0,
			y: 0,
			width: 1,
			height: this.screenHeight
		});
		
		this.registerSprite("rightWall", {
			x: this.screenWidth - 1,
			y: 0,
			width: 1,
			height: this.screenHeight
		});

		drawDungeonRoom.call(this, roomCoords);
	};

	demoGamesOpts["Dungeon"].onkeydown = function(e) {
		var player = this.getSprites("player"),
			topDoor = this.getSprites("topDoor"),
			rightDoor = this.getSprites("rightDoor"),
			bottomDoor = this.getSprites("bottomDoor"),
			leftDoor = this.getSprites("leftDoor"),
			blockWall = this.getSprites("block"),
			blockCoords = this.getGlobals("blockCoords"),
			key = this.getSprites("key"),
			hasKey = this.getGlobals("hasKey"),
			keyHole = this.getSprites("keyhole"),
			hasBlock = this.getGlobals("hasBlock"),
			gameOver = this.getGlobals("gameOver");

		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				if(keyHole && hasKey && this.collidingFromBelow(player, keyHole)) {
					this.unregisterSprite("keyhole");
					player.y--;
					player.color = this.getGlobals("startingColor");
				}

				if(blockWall && this.collidingFromBelow(player, blockWall)) {
					if(hasBlock) {
						if((player.y > 1 || (topDoor && this.collidingFromBelow(player, topDoor)))  && !gameOver) {
							player.y--;
							
							if(this.colliding(player, blockWall)) {
								blockWall.y--;
								this.setGlobal("hasBlock", false);
								
								if(this.colliding(blockWall, topDoor)) {
									blockCoords.mapCoords.y--;
									blockCoords.blockCoords.y = this.screenHeight - 3;
									this.unregisterSprite("block");
								}
							}
							
							return;
						}
					}

					if(!dungePushTime.bottom)
						dungePushTime.bottom++;

					return;
				}

				if((player.y > 1 || (topDoor && this.collidingFromBelow(player, topDoor)))  && !gameOver) {
					player.y--;
				}
				break;
			case 40: // Down arrow
			case 83: // S
				if(blockWall && this.collidingFromAbove(player, blockWall)) {
					if(hasBlock) {
						if((player.y < this.screenHeight - 2 || (bottomDoor && this.collidingFromAbove(player, bottomDoor)))  && !gameOver) {
							player.y++;
							
							if(this.colliding(player, blockWall)) {
								blockWall.y++;
								this.setGlobal("hasBlock", false);
								
								if(this.colliding(blockWall, bottomDoor)) {
									blockCoords.mapCoords.y++;
									blockCoords.blockCoords.y = 2;
									this.unregisterSprite("block");
								}
							}
							
							return;
						}
					}
				
					if(!dungePushTime.top)
						dungePushTime.top++;
				
					return;
				}

				if(player.y < this.screenHeight - 2 || (bottomDoor && this.collidingFromAbove(player, bottomDoor))) {
					player.y++;
				}
				break;
			case 37: // Left arrow
			case 65: // A
				if(blockWall && this.collidingFromRight(player, blockWall)) {
					if(hasBlock) {
						if(player.x > 1 || (leftDoor && this.collidingFromRight(player, leftDoor)) || gameOver) {
							player.x--;
							
							if(this.colliding(player, blockWall)) {
								blockWall.x--;
								this.setGlobal("hasBlock", false);
								
								if(this.colliding(blockWall, leftDoor)) {
									blockCoords.mapCoords.x--;
									blockCoords.blockCoords.x = this.screenWidth - 3;
									this.unregisterSprite("block");
								}
							}
							
							return;
						}
					}
				
					if(!dungePushTime.right)
						dungePushTime.right++;

					return;
				}
			
				if(player.x > 1 || (leftDoor && this.collidingFromRight(player, leftDoor)) || gameOver) {
					player.x--;
				}

				if(key && this.colliding(player, key)) {
					player.color = key.color;
					this.unregisterSprite("key");
					this.setGlobal("hasKey", true);
					this.unregisterSprite("enemy" + (this.screenWidth - 2));
				}
				
				if(gameOver && player.x < 0) {
					for(var sprite in this.getSprites()) {
						this.unregisterSprite(sprite);
					}
				}
				break;
			case 39: // Right arrow
			case 68: // D
				if(blockWall && this.collidingFromLeft(player, blockWall)) {
					if(hasBlock) {
						if(player.x < this.screenWidth - 2 || (rightDoor && this.collidingFromLeft(player, rightDoor)) || gameOver) {
							player.x++;
							
							if(this.colliding(player, blockWall)) {
								blockWall.x++;
								this.setGlobal("hasBlock", false);
								
								if(this.colliding(blockWall, rightDoor)) {
									blockCoords.mapCoords.x++;
									blockCoords.blockCoords.x = 2;
									this.unregisterSprite("block");
								}
							}
							
							return;
						}
					}
				
					if(!dungePushTime.left)
						dungePushTime.left++;

					return;
				}

				if(player.x < this.screenWidth - 2 || (rightDoor && this.collidingFromLeft(player, rightDoor)) || gameOver) {
					player.x++;
				}

				if(gameOver && player.x > this.screenWidth - 1) {
					for(var sprite in this.getSprites()) {
						this.unregisterSprite(sprite);
					}
				}
				break;
			case 32: // Space
				if(this.isPaused()) {
					this.unpause();
				} else {
					 this.pause();
				}
			break;
			default: {}
		}
		
		// Without this check, the player could just hold down a key to speed through traps
		if([37, 38, 39, 40, 65, 68, 83, 87].indexOf(e.keyCode) !== -1) {
			// Collision detection with traps
			var enemies = this.getSprites(/enemy/);

			for(var enemy in enemies) {
				// The block wall has the power to destroy holes
				if(blockWall && this.colliding(blockWall, enemies[enemy])) {
					this.unregisterSprite(enemy);
					this.unregisterSprite("block");
					this.setGlobal("blockCoords", {
						blockCoords: {
							x: -1,
							y: -1
						},
						mapCoords: {
							x: -1,
							y: -1
						}
					});
				}
			
				if(this.colliding(player, enemies[enemy]) && !this.flashEndingPosition) {
					this.flashEnding(3, 150, resetDungeon);
				}
			}
		}
	}; // End demoGamesOpts["Dungeon"].onkeydown()

	demoGamesOpts["Dungeon"].onkeyup = function(e) {
		switch(e.keyCode) {
			case 38: // Up arrow
			case 87: // W
				dungePushTime.bottom = 0;
				break;
			case 40: // Down arrow
			case 83: // S
				dungePushTime.top = 0;
				break;
			case 37: // Left arrow
			case 65: // A
				dungePushTime.right = 0;
				break;
			case 39: // Right arrow
			case 68: // D
				dungePushTime.left = 0;
				break;
			default: {}
		}
	};

	function drawDungeonRoom(roomCoords) {
		clearRoom.call(this);

		switch(roomCoords.y) {
			case 0: {
					switch(roomCoords.x) {
						case 0:
							drawDungeonDoors.call(this, "bottom", "right");
							this.registerSprite("enemy0", {x: 1, y: 1, color: dungeHoleColor});
							// holes that come down diagonally from top left to bottom right, then disappear
						break;
						case 1:
							drawDungeonDoors.call(this, "bottom", "left", "right");

							var hasKey = this.getGlobals("hasKey"),
								trapLen = this.screenWidth - (hasKey ? 3 : 2);
								
							for(var i = 1; i <= trapLen; i++) {
								this.registerSprite("enemy" + i, {
									x: i,
									y: this.screenHeight - 3,
									width: 1,
									height: 1,
									color: dungeHoleColor
								});
							}

							if(!hasKey) {
								this.registerSprite("key", {
									x: 1,
									y: this.screenHeight - 2,
									color: this.yellow // "#ffffdd"
								});
							}
						break;
						case 2:
							drawDungeonDoors.call(this, "bottom", "left", "right");

							// Hidden doorway
							var doorCoords = this.getGlobals("doorCoords");

							this.registerSprite("topDoor", {
								x: doorCoords["top"].x,
								y: doorCoords["top"].y,
								width: 1,
								height: 1,
								color: this.defaultColor
							});
							
							var enemiesArr = [];
							
							for(var i = 1; i <= this.screenWidth - 2; i++) {
								this.registerSprite("enemy" + i, {
									x: i,
									y: 2,
									width: 1,
									height: 1,
									color: dungeHoleColor
								});
							}
						break;
						case 3:
							drawDungeonDoors.call(this, "bottom", "left");
						break;
						case 4:
							drawDungeonDoors.call(this, "bottom", "top");
							// Final room. Exit door on the top.
							this.registerSprite("block", {
								x: 1,
								y: 2,
								width: this.screenWidth - 2,
								color: dungeBlockColor
							});

							this.registerSprite("keyhole", {
								x: Math.floor(this.screenWidth / 2),
								y: 2,
								color: this.yellow // "#ffffdd"
							});
							
							this.registerSprite("gameWinningDoor", {
								x: Math.floor(this.screenWidth / 2),
								y: 0,
								color: this.green // "#ddffdd"
							});
							
							this.registerSprite("enemy0", {
								x: 1,
								y: 1,
								width: Math.floor(this.screenWidth / 2) - 2,
								color: dungeHoleColor
							});
							
							this.registerSprite("enemy1", {
								x: Math.floor(gt.screenWidth / 2) + 2,
								y: 1,
								width: (gt.screenWidth - Math.floor(gt.screenWidth / 2) - 3),
								color: dungeHoleColor
							});
						break;
						default: {}
					}
				}
				break;
			case 1: {
					switch(roomCoords.x) {
						case 0:
							drawDungeonDoors.call(this, "top", "bottom");
							this.registerSprite("enemy0", {
								x: 2,
								y: 2,
								color: dungeHoleColor
							}).registerSprite("enemy1", {
								x: this.screenWidth - 3,
								y: this.screenHeight - 3,
								color: dungeHoleColor
							});
						break;
						case 1:
							drawDungeonDoors.call(this, "top", "right");
							this.registerSprite("enemy0", {
								polygon: [{
									x: this.screenWidth - 2,
									y: this.screenHeight - 2,
									width: 1,
									height: 1,
									color: dungeHoleColor
								}]							
							});
						break;
						case 2:
							drawDungeonDoors.call(this, "top", "left");
							this.registerSprite("enemy0", {
								x: 2,
								y: 2,
								color: dungeHoleColor
							}).registerSprite("enemy1", {
								x: 2,
								y: 2,
								color: dungeHoleColor
							})	;
						break;
						case 3:
							drawDungeonDoors.call(this, "top", "bottom");
							this.registerSprite("enemy0", {
								x: this.screenWidth - 2,
								y: 2,
								color: dungeHoleColor
							}).registerSprite("enemy1", {
								x: 1,
								y: this.screenHeight - 3,
								color: dungeHoleColor
							})	;
						break;
						case 4:
							drawDungeonDoors.call(this, "top", "bottom");
							
							var player = this.getSprites("player");
							
							if(player.y === 1) { // Came in from above
								this.registerSprite("enemy0", {
									velocityX: -1,
									x: -1,
									y: -1,
									polygon: [{x: this.screenWidth - 2, y: this.screenHeight - 2, width: 1, height: 1, color: dungeHoleColor}]
								});
								
								var enemy0 = this.getSprites("enemy0"),
									enemyLen = Math.floor((this.screenWidth - 2) / 2); // centipede is half the room in length
								
								this.setGlobal("roomTimeCount", (this.screenWidth - 2) * (this.screenHeight - 2));
								
								for(var i = 2; i <= enemyLen; i++) {
									enemy0.polygon.push({x: this.screenWidth - i, y: this.screenHeight - 2, width: 1, height: 1, color: dungeHoleColor});
								}
								
								enemy0.polygon.reverse();
							} else {
								this.registerSprite("enemy0", {
									velocityX: 1,
									x: -1,
									y: -1,
									polygon: [{x: 1, y: 1, width: 1, height: 1, color: dungeHoleColor}]
								});
								
								var enemy0 = this.getSprites("enemy0"),
									enemyLen = Math.floor((this.screenWidth - 2) / 2); // centipede is half the room in length
								
								for(var i = 2; i <= enemyLen; i++) {
									enemy0.polygon.push({x: i, y: 1, width: 1, height: 1, color: dungeHoleColor});
								}
								
								enemy0.polygon.reverse();
							}
						break;
						default: {}
					}
				}
				break;
			case 2: {
					switch(roomCoords.x) {
						case 0:
							drawDungeonDoors.call(this, "bottom", "top", "right");

							var index = Math.min(this.screenWidth, this.screenHeight) - 2,
								startingIndex = index;

							while(index > 1) {
								this.registerSprite("enemy" + index, {
									x: this.screenWidth - 2 - startingIndex + index,
									y: this.screenHeight - 1 - index,
									color: dungeHoleColor
								});
								
								index--;
							}
						break;
						case 1:
							drawDungeonDoors.call(this, "bottom", "left", "right");
							for(var i = 1; i < this.screenWidth - 1; i++) {
								this.registerSprite("enemy" + i, {
									x: i,
									y: 1,
									color: dungeHoleColor
								});
							}
						break;
						case 2:
							drawDungeonDoors.call(this, "left", "right");
							this.registerSprite("enemy0", {
								x: 2,
								y: 2,
								width: this.screenWidth - 4,
								height: this.screenHeight - 4,
								color: dungeHoleColor
							});
						break;
						case 3:
							drawDungeonDoors.call(this, "top", "left");
							this.registerSprite("enemy0", {
								x: 1,
								y: 2,
								width: 1 + Math.floor(this.screenWidth / 2),
								color: dungeHoleColor
							}).registerSprite("enemy1", {
								x: 2 + Math.floor(this.screenWidth / 2),
								y: 2,
								width: 1,
								height: this.screenHeight - 4,
								color: dungeHoleColor
							}).registerSprite("enemy2", {
								x: 2,
								y: this.screenHeight - 3,
								width: Math.floor(this.screenWidth / 2),
								color: dungeHoleColor
							});
						break;
						case 4:
							drawDungeonDoors.call(this, "bottom", "top");

							var holesY = 2;

							this.registerSprite("enemy" + holesY, {
								x: Math.floor(this.screenWidth / 2),
								y: holesY,
								color: dungeHoleColor
							});

							while(holesY++ < this.screenHeight - 3) {
								this.registerSprite("enemy" + holesY, {
									x: Math.floor(this.screenWidth / 2) - (holesY - 2),
									y: holesY,
									color: dungeHoleColor
								}).registerSprite("enemy" + holesY + "B", {
									x: Math.floor(this.screenWidth / 2)  + (holesY - 2),
									y: holesY,
									color: dungeHoleColor
								});
							}
						break;
						default: {}
					}
				}
				break;
			case 3: {
					switch(roomCoords.x) {
						case 0:
							drawDungeonDoors.call(this, "top", "right");
							this.registerSprite("enemy0", {
								x: Math.floor(this.screenWidth / 2),
								y: Math.floor(this.screenHeight / 2),
								color: dungeHoleColor
							});
						break;
						case 1:
							// Starting room
							drawDungeonDoors.call(this, "top", "left", "right");
						break;
						case 2:
							drawDungeonDoors.call(this, "left", "right");
							this.registerSprite("enemy0", {
								x: Math.floor(this.screenWidth / 2),
								y: Math.floor(this.screenHeight / 2),
								color: dungeHoleColor
							});
						break;
						case 3:
							drawDungeonDoors.call(this, "left", "right");
							
							var index = Math.min(this.screenWidth, this.screenHeight) - 2,
								startingIndex = index;
							
							while(index > 1) {
								this.registerSprite("enemy" + index, {
									x: 1 + startingIndex - index,
									y: index,
									color: dungeHoleColor
								});
								
								index--;
							}
						break;
						case 4:
							drawDungeonDoors.call(this, "left", "top");
							this.registerSprite("enemy0", {
								x: Math.floor(this.screenWidth / 2),
								y: Math.floor(this.screenHeight / 2),
								color: dungeHoleColor
							});
						break;
						default: {}
					}
				}
				break;
			default: {
				if(roomCoords.x === 4) {
					drawHappyEndingDungeon.call(this);
				}
			}
		}
		
		var blockCoords = this.getGlobals("blockCoords");
		
		if(blockCoords.mapCoords.x === roomCoords.x && blockCoords.mapCoords.y === roomCoords.y) {
			this.registerSprite("block", blockCoords.blockCoords);
		}

		this.moveToTop("player");
	}

	demoGamesOpts["Dungeon"].delay = 50;

	demoGamesOpts["Dungeon"].update = function(fromKey) {
		var topDoor = this.getSprites("topDoor"),
			leftDoor = this.getSprites("leftDoor"),
			rightDoor = this.getSprites("rightDoor"),
			bottomDoor = this.getSprites("bottomDoor"),
			roomCoords = this.getGlobals("roomCoords"),
			player = this.getSprites("player"),
			roomTimeCount = this.getGlobals("roomTimeCount"),
			enemies = this.getSprites(/enemy/),
			blockWall = this.getSprites("block"),
			hasKey = this.getGlobals("hasKey"),
			exitingRoom = false;

		if(!fromKey) {
			roomTimeCount++;
			this.setGlobal("roomTimeCount", roomTimeCount);
		}

		if(topDoor && this.colliding(player, topDoor)) {
			roomCoords.y--;
			
			if(roomCoords.y < 0 && roomCoords.x === 2) {
				roomCoords.x = 4;
				roomCoords.y = 2;
			}
			
			player.y = this.screenHeight - 2;
			exitingRoom = true;
		} else if(leftDoor && this.colliding(player, leftDoor)) {
			roomCoords.x--;
			player.x = this.screenWidth - 2;
			exitingRoom = true;
		} else if(rightDoor && this.colliding(player, rightDoor)) {
			roomCoords.x++;
			player.x = 1;
			exitingRoom = true;
		} else if(bottomDoor && this.colliding(player, bottomDoor)) {
			roomCoords.y++;
			player.y = 1;
			exitingRoom = true;
		}
		
		if(exitingRoom) {
			this.setGlobal("roomTimeCount", 0);
			this.setGlobal("roomCoords", roomCoords);
			drawDungeonRoom.call(this, roomCoords);
			return; // Current room's collision detection and next step in AI should be bypassed
		}

		if(roomCoords.x === 1 && roomCoords.y === 2) {
			var dropLen = this.screenHeight - 3,
				fallingEnemyIdx = Math.floor((roomTimeCount - 1) / dropLen),
				sprite = this.getSprites("enemy" + (fallingEnemyIdx + 1));

				if(sprite) {
					this.getSprites("enemy" + (fallingEnemyIdx + 1)).y++;
				}
		} else if(roomCoords.x === 2 && roomCoords.y === 3) {

			if(hasKey) {
				if(roomTimeCount % 10 === 5) {
					var enemy0 = this.getSprites("enemy0");

					if(enemy0.x <  player.x) {
						enemy0.x++;
					} else if(enemy0.x > player.x) {
						enemy0.x--;
					}
				} else if(roomTimeCount % 10 === 9) {
					var enemy0 = this.getSprites("enemy0");
				
					if(enemy0.y <  player.y) {
						enemy0.y++;
					} else if(enemy0.y > player.y) {
						enemy0.y--;
					}
				}
			} else { // no key
				if(roomTimeCount % 20 === 10) {
					this.getSprites("enemy0").y++;
				} else if(roomTimeCount % 20 === 19) {
					this.getSprites("enemy0").y--;
				}
			}
		} else if(roomCoords.x === 4 && roomCoords.y === 3 && roomTimeCount % 30 === 29) {
			var enemy0 = this.getSprites("enemy0");
			
			if(enemy0.x - 1 > 0) {
				enemy0.x--;
				enemy0.width++;
			}
			
			if(enemy0.x + enemy0.width + 1 < this.screenWidth) {
				enemy0.width++;
			}

			if(enemy0.y - 1 > 0) {
				enemy0.y--;
				enemy0.height++;
			}

			if(enemy0.y + enemy0.height + 1 < this.screenHeight) {
				enemy0.height++;
			}
		} else if(roomCoords.x === 0 && roomCoords.y === 0 && roomTimeCount % 2 === 1) {
			var maxSpot = Math.min((this.screenWidth - 2), (this.screenHeight - 2)),
				spot = Math.floor(roomTimeCount / 2) % maxSpot,
				enemy0 = this.getSprites("enemy0");
			
			enemy0.x = this.screenWidth - 1 - maxSpot + spot;
			enemy0.y = this.screenHeight - 1 - maxSpot + spot;
		} else if(roomCoords.x === 2 && roomCoords.y === 1) {
			var enemy0 = this.getSprites("enemy0"),
				enemy1 = this.getSprites("enemy1");
			
			if(roomTimeCount % 40 < 10) {
				enemy0.x = 2;
				enemy0.y = 3;
				enemy1.x = this.screenWidth - 3;
				enemy1.y = this.screenHeight - 2;
			} else if(roomTimeCount % 40 < 20) {
				enemy0.x = Math.floor(this.screenWidth / 2) - 1;
				enemy0.y = Math.floor(this.screenHeight / 2) + 1;
				enemy1.x = Math.floor(this.screenWidth / 2) - 2;
				enemy1.y = Math.floor(this.screenHeight / 2) - 1;
			} else if(roomTimeCount % 40 < 30) {
				enemy0.x = 1;
				enemy0.y = 1;
				enemy1.x = this.screenWidth - 2;
				enemy1.y = this.screenHeight - 2;
			} else {
				enemy0.x = Math.floor(this.screenWidth / 3) - 1;
				enemy0.y = 2 * Math.floor(this.screenHeight / 2) - 1;
				enemy1.x = this.screenWidth - 2;
				enemy1.y = Math.floor(this.screenHeight / 2) - 1;
			}
			
			if(roomTimeCount % 10 > 6) {
				enemy0.x = -1;
				enemy0.y = -1;
				enemy1.x = -1;
				enemy1.y = -1;
			}
		} else if(roomCoords.x === 3 && roomCoords.y === 1) {
			var enemy0 = this.getSprites("enemy0"),
				enemy1 = this.getSprites("enemy1"),
				spot = roomTimeCount % (2 * (this.screenWidth - 2));
			
			if(spot < this.screenWidth - 2) {
				enemy0.x = this.screenWidth - 1 - (1 + spot);
				enemy1.x = 1 + spot;
			} else {
				spot %= (this.screenWidth - 2);
				enemy0.x = 1 + spot;
				enemy1.x = this.screenWidth - 1 - (1 + spot);
			}
		} else if(roomCoords.x === 1 && roomCoords.y === 1) {
			var enemy0 = this.getSprites("enemy0"),
				lastSquare = enemy0.polygon[enemy0.polygon.length - 1],
				roomWidth = this.screenWidth - 2,
				newX = this.screenWidth - 2,
				newY = this.screenHeight - 2;

			if(enemy0.polygon.length >= (this.screenWidth - 2) * (this.screenHeight - 2)) {
				return;
			}

			if(lastSquare.y % 2 === 1) { // Going left
				if(lastSquare.x === 1 && enemy0.polygon[enemy0.polygon.length - 2].x === 2) {
					newX = 1;
					newY = lastSquare.y - 1;
				} else {
					newX = lastSquare.x - 1;
					newY = lastSquare.y;
				}
			} else {
				if(lastSquare.x === this.screenWidth - 2 && enemy0.polygon[enemy0.polygon.length - 2].x === this.screenWidth - 3) {
					newX = this.screenWidth - 2;
					newY = lastSquare.y - 1;
				} else {
					newX = lastSquare.x + 1;
					newY = lastSquare.y;
				}
			}

			enemy0.polygon.push({
				x: newX,
				y: newY,
				width: 1,
				height: 1,
				color: dungeHoleColor
			});
		} else if(roomCoords.x === 4 && roomCoords.y === 1) {
			var centipede = this.getSprites("enemy0"),
				idx = centipede.polygon.length,
				returnToTop = false,
				reversing = false,
				roomArea = (this.screenWidth - 2) * (this.screenHeight - 2),
				totalPathLen = (roomArea - idx) * 2,
				halfPathLen = Math.floor(totalPathLen / 2);
			
			if(roomTimeCount === totalPathLen) {
				this.setGlobal("roomTimeCount", this.screenWidth - 1 - centipede.polygon.length);
			}

			if(roomTimeCount % totalPathLen > halfPathLen) {
				reversing = true;
			}

			// centipede walking
			while(idx-- > 1) {
				centipede.polygon[idx].x = centipede.polygon[idx - 1].x;
				centipede.polygon[idx].y = centipede.polygon[idx - 1].y;
			} 

			if(centipede.velocityX > 0) { // going right		
				if(centipede.polygon[0].x + centipede.velocityX < this.screenWidth - 1) {
					centipede.polygon[0].x += centipede.velocityX;
				} else {
					centipede.velocityX *= -1;

					if(reversing && centipede.polygon[0].y > 1) {
						centipede.polygon[0].y--;
					} else if(centipede.polygon[0].y < this.screenHeight - 2) {
						centipede.polygon[0].y++;
					}
				}
			} else { // going left
				if(centipede.polygon[0].x + centipede.velocityX > 0) {
					centipede.polygon[0].x += centipede.velocityX;
				} else {
					centipede.velocityX *= -1;
					
					if(reversing && centipede.polygon[0].y > 1) {
						centipede.polygon[0].y--;
					} else if(centipede.polygon[0].y < this.screenHeight - 2) {
						centipede.polygon[0].y++;
					}
				}
			}
		}

		// Collision detection with traps
		var enemies = this.getSprites(/enemy/);

		for(var enemy in enemies) {
			// The block wall has the power to destroy holes
			if(blockWall && this.colliding(blockWall, enemies[enemy])) {
				this.unregisterSprite(enemy);
				this.unregisterSprite("block");
				this.setGlobal("blockCoords", {
					blockCoords: {
						x: -1,
						y: -1
					},
					mapCoords: {
						x: -1,
						y: -1
					}
				});
			}
		
			if(this.colliding(player, enemies[enemy]) && !this.flashEndingPosition) {					
				this.flashEnding(3, 150, resetDungeon);
				
			}
		}

		if(hasKey) {
			for(var side in dungePushTime) {
				if(dungePushTime[side]) {
					dungePushTime[side]++;
					
					if(dungePushTime[side] >= 60) {
						dungePushTime[side] = 0;
						this.registerGlobal("hasBlock", true);
					}
				}
			}
		}
	}; // End demoGamesOpts["Dungeon"].update

	function resetDungeon() {
		var player = this.getSprites("player");

		this.flashEndingPosition = 0;

		this.setGlobal("hasKey", false);
		this.setGlobal("hasBlock", false);
		this.setGlobal("gameOver", false);
		this.setGlobal("roomTimeCount", 0);

		this.setGlobal("roomCoords", {
			x: 1,
			y: 3
		});

		this.setGlobal("blockCoords", {
			blockCoords: {
				x: Math.floor(this.screenWidth / 2),
				y: 3,
				color: dungeBlockColor
			},
			mapCoords : {
				x: 3,
				y: 0
			}
		});
		
		dungePushTime = {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		};

		player.x = Math.floor(this.screenWidth / 2);
		player.y = Math.ceil(this.screenHeight / 2);
		player.color = this.getGlobals("startingColor");

		drawDungeonRoom.call(this, {x: 1, y: 3});
	}

	function drawDungeonDoors() {
		var doorCoords = this.getGlobals("doorCoords");

		for(var i = 0, len = arguments.length; i < len; i++) {
			this.registerSprite(arguments[i] + "Door", {
				x: doorCoords[arguments[i]].x,
				y: doorCoords[arguments[i]].y,
				width: 1,
				height: 1,
				color: dungeDoorColor
			});
		}
	}

	function clearRoom() {
		var sprites = this.getSprites();

		for(var name in sprites) {
			if(/Wall/i.test(name) || name === "player") {
				continue;
			}
	 
			this.unregisterSprite(name);
		}
	}

	function drawHappyEndingDungeon() {
		var self = this,
			flashesNum = 3,
			flashDelay = 150
			totalFlashTime = (flashesNum * 2 - 1) * flashDelay,
			player = this.getSprites("player");

		player.y = self.screenHeight - 2;
		self.flashEnding(flashesNum);

		setTimeout(function() {
			self.unregisterSprite("leftWall");
		}, totalFlashTime);
					
		setTimeout(function() {
			self.unregisterSprite("rightWall");
		}, totalFlashTime + 1000);

		setTimeout(function() {
			self.unregisterSprite("topWall");
		}, totalFlashTime + 2000);
		
		setTimeout(function() {
			self.unregisterSprite("bottomWall");
		}, totalFlashTime + 3000);

		setTimeout(function() {
			self.registerSprite("sky", {
				x: 0,
				y: 0,
				width: self.screenWidth,
				height: self.screenHeight,
				color: self.blue
			}).registerSprite("grass", {
				x: 0,
				y: self.screenHeight - 1,
				width: self.screenWidth,
				height: 1,
				color: self.green
			}).registerSprite("sun", {
				x: self.screenWidth - 2,
				y: 0,
				width: 2,
				height: 2,
				color: self.yellow
			});

			self.setGlobal("gameOver", true);
			player.x = Math.floor(self.screenWidth / 2);
			player.y = self.screenHeight - 2;
			self.moveToTop("player");
		}, totalFlashTime + 4000);
	}

	// End of built-in demos

	/**
	 * @description Add a <select> element below the Table2Game table with a list of games to choose from.
	 * @param {Object} gamesList A plain JavaScript object with keys representing game names,
	 *   and values representing the respective options.
	 * @returns {Object} The currrent Table2Game object.
	 */
	Table2Game.prototype.addGamesList = function(gamesList) {
		var gamesList = gamesList || {},
			select = document.createElement("select"),
			option = document.createElement("option"),
			text = document.createTextNode("- Select - "),
			self = this;

		if(!gamesList || !Object.keys(gamesList).length) {
			gamesList = demoGamesOpts;
		}

		option.appendChild(text);
		option.value = "0";
		select.appendChild(option);

		for(var game in gamesList) {	
			option = document.createElement("option");
			text = document.createTextNode(game);

			option.appendChild(text);
			option.value = game;
			select.appendChild(option);
		}

		select.onchange = function(e) {
			self.pause();

			if(this.value !== "0") {
				currentTable2Game = new Table2Game( gamesList[ this.value ] );
				this.parentNode.removeChild(this); // Remove games list
			}
		};

		select.style.marginLeft = self.table.style.marginLeft ||
			(window.getComputedStyle ? window.getComputedStyle(self.table).getPropertyValue("margin-left") : "");

		self.table.parentNode.insertBefore(select, self.table.nextSibling);

		return this;
	}; // End Table2Game.prototype.addGamesList()

	/**
	 * @description Returns the first ancestory of the given element that is a <table> element.
	 * @param {Object} elm The HTML element being changed.
	 * @returns {Object} The found table or null if no ancestor is a table.
	 */
	Table2Game.closestTable = function(elm) {
		while(elm && elm.nodeName !== "TABLE") {
			elm = elm.parentNode;
		}

		return elm;
	}; // End Table2Game.closestTable()

	/**
	 * @description Creates handlers allowing user to decide which table to use by clicking on it.
	 */
	Table2Game.clickToChoose = function() {
		var tables = document.getElementsByTagName("table");

		handleElmEvent(window, "click", createTableOnClick, false);
	}; // End Table2Game.clickToChoose()

	/**
	 * @description Creates a Table2Game object from a clicked table.
	 * @param {Object} e The click event that triggered the callback.
	 * @private
	 */
	var createTableOnClick = function(e) {
		if(!tableFound) {
			var tg = new Table2Game({
				table: Table2Game.closestTable(e.target)
			});

			tg.addGamesList();
			tableFound = true;
			unhandleElmEvent(window, "click", createTableOnClick, false);
		}
	}; // End createTableOnClick()

	// Expose the Table2Game constructor and static variables.
	return Table2Game;
}(window));