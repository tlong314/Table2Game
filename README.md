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

Each of the callback functions defined as options below represent the similarly named event handler callback as defined on the table (for mouse events) or window (for key events), passing in a parameter describing the event. For ease of reference within the library, each of these is invoked with the `this` keyword now representing the Table2Game object (rather than the element that triggered the event, as that element can be accessed as `.target` on the passed event).

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

delay {number} - The number of milliseconds between update cycles. Default is `50`.

hideOnPause {boolean} - Whether or not the game canvas (table) should be cleared when the game is paused. Default is `true`.

defaultColor {string} - The basic color to be used when none is specified. Default is `"#eee"`.

Options for 9 other colors follow similarly: white, black, gray, red, green, blue, yellow, purple, and blueGreen.

## Methods

This section is still being updated. For now, please see documentation within the library for various methods and explanations.

## Demo Games

These are games built into the engine for use and for code examples. Pass any of these strings into the Table2Game constructor (and a second argument for the options, to point to your table) and you can play the game.

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
