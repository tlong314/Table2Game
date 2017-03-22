# Table2Game
A JavaScript game engine for turning any HTML table into a playable game.

## Usage

A basic game is initialized by calling the Table2Game constructor, with an `options` object:

```javascript
var t = new Table2Game(options);
```

In particular, if there are multiple tables on a page, then the table element you want to use should be passed in as the `table` option. Note that the element must be an HTML `<table>` element (rather than just any elements with a tabular structure) for the library to work.

```javascript
var options = {
  table: document.getElementById("myTable")
};

var t = new Table2Game(options);
```

Remember that the table element you are using must be attached to the DOM before it can be recognized by the script (so use appropriate onload methods before calling the Table2Canvas constructor).

Numerous demo games are included in the library (see below). To simply use one of those for the table, pass its name in to the constructor.

```javascript
var t = new Table2Game("Snake");
```

If you want to override any of that demo game's built in options, pass in your own options object as the second argument:

```javascript
var t = new Table2Game("Snake", {delay: 80});
```

## Options

table {Object} - The HTML `<table>` element to be used as the game canvas. Defaults to the first `<table>` element found in the DOM tree (thus, if your page only contains one element, the table doesn't need to be specified).

globals {Object} - A plain JavaScript object defining internal 'global' variables to be used throughout the game. Properties can have any value, and the keys should represent distinct names for the variables. These variables can also be set later with Table2Game methods. Default is `{}`.

sprites {Object} - A plain JavaScript object defining internal 'Sprite' variables to be used throughout the game. Properties will be internal `Sprite` objects (see `registerSprite` method), and the keys should represent distinct names for the Sprites. These Sprites can also be set later with Table2Game methods. Default is `{}`.

details {Object} - A plain JavaScript object describing variables that shouldNu be displayed on the 'scoreboard', such as `score` and `lives`. These variables can also be set later with Table2Game methods. Default is `{}`.

For all of the callback functions defined as options below, the default is an empty (noop) anonymous function.

init {function} - An initializing function that will be called before gameplay.

update {function} - A function to be called at each animation cycle in the game. Used for basic game logic and updating variables.

onpause {function} - Any extra code that should be executed when the `.pause()` method is called.

onunpause {function} - Any extra code that should be executed when the `.unpause()` method is called.

onpaint {function} - Any etxra code that should be executed whenever the game canvas (table) is painted.

Each of the callback functions defined as options below represents the similarly named event handler callback as defined on the table (for mouse events and touch events) or window (for key events), and passes in a parameter describing the event. For ease of reference within the library, each of these is invoked with the `this` keyword now representing the Table2Game object (rather than the element that triggered the event, as that element can be accessed as `.target` on the passed event).

onkeydown

onkeyup

onkeypress

onclick

onmousedown

onmouseup

onmousemove

onmouseenter

onmouseleave

onmouseover

onmouseout

onmousewheel

oncontextmenu

ontouchstart

ontouchmove

ontouchend

delay {number} - The number of milliseconds between update cycles. Default is `50`.

hideOnPause {boolean} - Whether or not the game canvas (table) should be cleared when the game is paused. Default is `true`.

defaultColor {string} - The basic color to be used when none is specified. Default is `"#eee"`.

Options for 9 other colors follow similarly: white, black, gray, red, green, blue, yellow, purple, and blueGreen.

## Methods

We will use an example Table2Game object, named `tg` to describe the public methods.

`var tg = new Table2Game();`

`tg.constructor(optionsOrDemoGameName, demoGameOptions)`

A pointer to the Table2Game constructor method. If creating a new game, this Table2Game constructor accepts one argument, an object with the options described above in the Options section. If using an existing game from the internal demo games, the constructor takes two arguments: the first one will be the demo game name (as a string) and the second will be a plain JavaScript object with similar options as described above (any options set here will override the equivalent options already defined in the demo game).

The most important public methods relate to the three stored collections of variables: `globals`, which stores internal variables of any type to be used in the game logic; `details`, which stores variables that will be displayed on the table's visible scoreboard area; `sprites`, which stores Sprite objects, which represent objects drawn to the table game canvas.

`tg.registerGlobal(name, value)`

Adds a new object or primitive variable to the current `globals` collection, under the name defined by the string parameter `name` and with the value defined by `value` (which can be any value).

`tg.unregisterGlobal(name)`

Removes the item stored in the current `globals` collection under the name `name`.

`tg.setGlobal(name, val)`

Sets the value of the item with name `name` in the `globals` collection to the value defined by `val` (can be any value).

`tg.getDetails()`

Returns the details variables (used on the scoreboard).

`tg.setDetails(detail, val)`

Either sets a single detail (scoreboard variable) if `detail` is the variable name and `val` is the value to set it to, or sets multiple detail values if `detail` is a plain JavaScript object with detail names pointing to their new values.

`tg.getDetailsElement()`

Returns the HTML element used to display the details (scoreboard variables).

`tg.registerSprite(name, opts)`

Adds a new Sprite object to the current `sprites` collection ('registers' the Sprite), under the name defined in the string parameter `name`. You should use a unique name for any new Sprite (otherwise any Sprite with the same name will be overwritten). The `opts` parameter is a plain JavaScript object with values defining the Sprite's position, size, shape, and velocity.

* `x` - The x-value of the top left corner of the Sprite. Default is 0.
* `y` - The y-value of the top left corner of the Sprite. Default is 0.
* `velocityX` - The Sprite's initial horizontal velocity. Default is 0.
* `velocityY` - The Sprite's initial vertical velocity. Default is 0.
* `width` - The number of table cells that the Sprite spans horizontally. Default is 1.
* `height` - The number of table cells that the Sprite spans vertically. Default is 1.
* `color` - The color to draw the Sprite's cells. Default is Table2Game.defaultColor.
* `polygon` - An array containing multiple Sprites to be used to draw the object. If this option is present and a nonempty array, then this array is used to draw the entire object, overriding all of the other options.

`tg.unregisterSprite(name)`

Removes the Sprite object stored in the `sprites` collection under the name `name` (so this Sprite will no longer be painted to the screen).

`tg.getSprites()`

Returns a plain JavaScript object containing keys as names of all currently registered Sprite objects pointing to values that are the Sprite objects themselves.

`tg.colliding(x1, y1, w1, h1, x2, y2, w2, h2)`

Accepts the x-y coordinates, width, and height of two Sprite objects, or simply the two Sprite objects themselves.

`tg.collidingFromAbove(obj1, obj2)`

returns true if Sprite object obj1 is colliding into Sprite object obj2 from above. The next three methods are similar.

`tg.collidingFromBelow(obj1, obj2)`

`tg.collidingFromLeft(obj1, obj2)`

`tg.collidingFromRight(obj1, obj2)`

`tg.collidingPolygons(obj1, obj2)`

Detects whether two Sprites objects, both with their shapes defined by a `polygon` property, are colliding.

`tg.touching(obj1, obj2, includeCorners)`

Determines if two objects `obj1` and `obj2` are colliding from any side (or any corners if the `includeCorners` parameter is true).

`tg.closestCell(target)`

Returns the closest ancestor of the `target` element (of, say, a mouse click) that is a table cell.

`tg.getCellCoords(cell)`

Returns and object with two keys: `x` with a value of the x-value (in the table game canvas) of the table cell `cell`, and `y` with a value of the x-value (in the table game canvas) of the table cell `cell`.

`tg.getCellAt(x, y)`

Returns the table cell element at the x-y point (`x`, `y`) in the table game canvas.

`tg.getTable()`

Returns the HTML `<table>` element being used for the current Table2Game object.

`tg.getTableArr()`

Returns an array of table cells from the HTML `<table>` element being used for the current Table2Game object.

`tg.clear()`

Erases current game canvas.

`tg.paint()`

Paints all of the currently registered Sprite objects onto the game canvas (and invokes the onpaint() callback if one was created.

`tg.fillPolygon(polygon, color)`

Paints a given Sprite polygon `polygon` to the game canvas (with the color defined by the `color` parameter, for any part of the polygon that has not already defined one).

`tg.fillRect(x, y, width, height, color)`

Fills a rectangular area to the game canvas, with top left corner defined by `x` and `y`, width and height defined by `width` and `height`, and shaded with the optional `color` paramater (or else with Table2Game.defaultColor).

`tg.moveToTop(sprite)`

Moves Sprite object `sprite` so that it is drawn to the screen after all other sprites.

`tg.flashEnding(numFlashes, delayStep, callback)`

Creates a temporary flash effect, used to indicate a major event, such as a game ending. All parameters are optional - `numFlashes` will determine the number of total flashes, `delayStep` will determine how long the animation delay is for the flashes, and `callback` is a function to be called once the flashes complete.

`tg.pause()`

Pauses the game (and hides the game Sprites and scoreboard if the hideOnPause option was set to true in the constructor).

`tg.unpause()`

Unpauses the game (and unhides the game Sprites and scoreboard if the hideOnPause option was set to true in the constructor).

`tg.isPaused()`

Returns true if the game is currently paused.

`tg.onpause()`

Calls the onpause callback defined in the constructor.

`tg.onunpause()`

Calls the onunpause callback defined in the constructor.

`tg.onpaint()`

Calls the onpaint callback defined in the constructor.

`tg.getDelay()`

Returns the game update delay (in milliseconds).

`tg.setDelay(newDelay)`

Sets the game update delay to `newDelay` milliseconds.

`tg.addGamesList(gamesList)`

Creates a `<select>` element after the table, containing names of games to choose from, based on the `gamesList` parameter, which is a plain JavaScript object of game names pointing to their Table2Game constructor options.

Again, this section is still being updated. There are a few more methods that need to be included.

## Demo Games

These are games built into the engine for use and for code examples. Pass any of these strings into the Table2Game constructor (and a second argument for the options, including a `table` key pointing to your table) and you can play the game.

"Ping Pong"

"Snake"

"Break Bricks"

"Whack-a-mole"

"Maze"

"Creepy Crawler"

"Jumper"

"Paint"

"Sniper"

"Dungeon"

## License

This product is available to use under the MIT License.
