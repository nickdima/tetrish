/*jslint browser: true, devel: true, plusplus: true, white: true */
var tetrjs, game;

window.Jazz = document.getElementById("Jazz1");

if (!Jazz || !Jazz.isJazz) {
  window.Jazz = document.getElementById("Jazz2");
}

function writeToLine(line, message) {
  line = 23 + line;
  // Jazz.MidiOutLong([240, 71, 127, 21, line, 0, 69, 0, 247])
  var midiMessage = [240, 71, 127, 21, line, 0, 69, 0]
  for (var i = 0; i < 68; i++) {
    if (i < message.length)
      midiMessage.push(message[i].charCodeAt(0));
    else
      midiMessage.push(32);
  };
  midiMessage.push(247);
  Jazz.MidiOutLong(midiMessage);

}

function gameOver() {
  function doSetTimeout(i) {
    setTimeout(function() { Jazz.MidiOut(0x90, i, 5); }, i*10);
  };
  for (var i = 36; i < 100; i++) {
    doSetTimeout(i);
  };
}

function midiProc(t,a,b,c){
  console.log(b)
    if ((game.gameOver || c == 0) && b!=85) {
      return;
    }

    switch (b) {
    case 44:
      // Left
      game.tetromino.move(-1, 0);
      break;
    case 46:
      // Up
      game.tetromino.rotate();
      break;
    case 45:
      // Right
      game.tetromino.move(1, 0);
      break;
    case 47:
      // Down
      game.tetromino.drop();
      break;
    case 85:
      // Play
      DZ.player.pause();
      setTimeout(function(){location.reload()}, 1000);
      break;
    default:
      return;
    }
    game.tetromino.place().render();
}

Jazz.MidiOutOpen('User Port');
Jazz.MidiInOpen('User Port', midiProc);
// Jazz.MidiInOpen('User Port', midiProc);

DZ.init({
  appId  : '102661',
  channelUrl : 'http://harpdev.io:9000/channel.html',
  player : {
        onload : function(){
          console.log('player ready');
          DZ.player.setVolume(0);
          DZ.player.playTracks([13417234], 0, function(response){
            setTimeout(function(){DZ.player.seek(15); DZ.player.setVolume(100)}, 1500);
          });
        }
      }
});

for (var i = 99; i >= 36; i--) {
  Jazz.MidiOut(0x90, i, 0)
};

writeToLine(1, 'TETRiSH');
writeToLine(2, '');
writeToLine(3, 'Level 1');
writeToLine(4, 'Score 0');

tetrjs = (function($) {
  'use strict';

  /** @namespace */
  var tetrjs = {};

  /**
   * Create a new game
   *
   * @constructor
   * @return {Game}
   */
  tetrjs.Game = function() {
    var self = this;

    /** @member */
    this.shapes = ['ddd', 'drr', 'ddr', 'drd', 'rdr', 'dru', 'rdur'];

    /** @member */
    this.blockSize = {
      main: 30,
      queue: 15
    };

    /** @member */
    this.level = 1;

    /** @member */
    this.score = 0;

    /** @member */
    this.linesCleared = 0;

    /** @member */
    this.gameOver = false;

    /** @member */
    this.delay = 1000;

    /** @member */
    this.lastId = 0;

    /** @member */
    this.tetromino = null;

    /** @member */
    this.queue = [];

    /** @member */
    this.field = {
      main: new tetrjs.Field(this, 'main', 8, 8),
      queue: new tetrjs.Field(this, 'queue', 100, 4)
    };

    /** @member */
    this.interval = setInterval(function() {
      self.progress.call(self);
    }, this.delay);

    $.each(new Array(6), function() {
      self.queueAdd();
    });

    this.next();

    return this;
  };

  /**
   * Progress the game
   *
   * @return {Game}
   */
  tetrjs.Game.prototype.progress = function() {
    this.tetromino.move(0, 1).place().render();

    return this;
  };

  /**
   * Update score and level
   *
   * @param {integer} cleared
   * @return {Game}
   */
  tetrjs.Game.prototype.cleared = function(cleared) {
    var self = this;

    this.linesCleared += cleared;

    this.score += this.level * cleared * 100;

    writeToLine(4, "Score " + this.numberFormat(this.score));

    if (this.level < Math.ceil(this.linesCleared / 10)) {
      this.level++;

      writeToLine(3, "Level " + this.level);

      clearInterval(this.interval);

      this.delay *= 0.9;

      this.interval = setInterval(function() {
        self.progress.call(self);
      }, this.delay);
    }

    return this;
  };

  /**
   * Add thousands separator to number
   *
   * @param {integer} n
   * @return {string}
   */
  tetrjs.Game.prototype.numberFormat = function(n) {
    var regex = /(\d+)(\d{3})/;

    n = n.toString();

    while (regex.test(n)) {
      n = n.replace(regex, '$1' + ',' + '$2');
    }

    return n;
  }

  /**
   * Get the next tetromino in the queue
   *
   * @return {Game}
   */
  tetrjs.Game.prototype.next = function() {
    var size;

    if (this.gameOver) {
      return;
    }

    this.tetromino = this.queue.shift();

    size = this.tetromino.size();

    // Move to middle of main field
    this.tetromino.move(-this.tetromino.offset().x + Math.floor((this.field.main.cols - size.x) / 2), -size.y + 1).field = this.field.main;

    // Move remaining queue to the left
    $.each(this.queue, function() {
      this.move(-size.x - 1, 0);
    });

    $.each(this.queue, function() {
      this.place().render();
    });

    this.tetromino.place().render();

    return this.queueAdd();
  };

  /**
   * Add a tetromino to the queue
   *
   * @return {Game}
   */
  tetrjs.Game.prototype.queueAdd = function() {
    var
    tetromino = new tetrjs.tetromino(this.field.queue),
      offset = 0;

    // Append to the queue
    $.each(this.queue, function() {
      offset += this.size().x + 1;
    });

    tetromino.move(offset, 0).place().render();

    this.queue.push(tetromino);

    return this;
  };

  /**
   * Game over
   *
   * @return {Game}
   */
  tetrjs.Game.prototype.end = function() {
    this.gameOver = true;

    clearInterval(this.interval);
    DZ.player.pause()
    var scWidget = SC.Widget('soundcloud');
    scWidget.play();
    gameOver();

    return this;
  };

  /**
   * Create a new tetromino
   *
   * @constructor
   * @param {Field} field
   * @param {Block} [block]
   */
  tetrjs.tetromino = function(field, block) {
    var
    self = this,
      x = 0,
      y = 0;

    /** @member */
    this.field = field;

    /** @member */
    this.game = field.game;

    /** @member */
    this.id = ++this.game.lastId;

    if (block) {
      this.blocks = [block];
    } else {
      this.blocks = [];

      // Generate a random tetromino
      this.shape = this.game.shapes[Math.ceil(Math.random() * this.game.shapes.length - 1)];

      this.blocks.push(new tetrjs.Block(this, x, y));

      $.each(this.shape.split(''), function() {
        var available = true;

        switch (this.toString()) {
        case 'r':
          x++;
          break;
        case 'd':
          y++;
          break;
        case 'u':
          y--;
          break;
        }

        $.each(self.blocks, function() {
          if (this.pos.x === x && this.pos.y === y) {
            available = false;
          }
        });

        if (available) {
          self.blocks.push(new tetrjs.Block(self, x, y));
        }
      });
    }

    return this;
  };

  /**
   * Move each block
   *
   * @param {integer} x
   * @param {integer} y
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.move = function(x, y) {
    $.each(this.blocks, function() {
      this.move(x, y);
    });

    return this;
  };

  /**
   * Move the tetromino down until it collides
   *
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.drop = function() {
    while (!this.game.gameOver && this.id === this.game.tetromino.id) {
      this.move(0, 1).place();
    }

    return this;
  };

  /**
   * Rotate 90 degrees clockwise
   *
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.rotate = function() {
    var
    size = this.size(),
      offset = this.offset();

    $.each(this.blocks, function() {
      this.move(
      offset.x - (this.pos.y - offset.y) + size.y - 1 - this.pos.x, offset.y + (this.pos.x - offset.x) - this.pos.y);
    });

    return this.place();
  };

  /**
   * Place each block on the grid and check for collisions
   *
   * @param {boolean} [stopRecursion]
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.place = function(stopRecursion) {
    var
    field = this.field,
      collision = false,
      land = false;

    $.each(this.blocks, function() {
      var block = field.get(this.pos.x, this.pos.y);

      if (this.destroyed) {
        return true;
      }

      if (block === null || block.tetromino === this.tetromino) {
        field.grid[this.pos.x][this.pos.y] = this;
      } else {
        collision = true;
      }
    });

    if (collision) {
      // Restore blocks to their previous position
      $.each(this.blocks, function() {
        if (this.pos.y > this.oldPos.y && field.get(this.pos.x, this.pos.y + 1, this)) {
          land = true;
        }

        this.move(this.oldPos.x - this.pos.x, this.oldPos.y - this.pos.y);

        this.pos = $.extend({}, this.oldPos);
      });

      if (!stopRecursion) {
        this.place(true);
      } else {
        console.log('Unrecoverable collision');
      }

      if (land) {
        this.land();
      }
    }

    $.each(this.blocks, function() {
      this.oldPos = $.extend({}, this.pos);
    });

    return this;
  };

  /**
   * Land the tetromino when it touches down
   *
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.land = function() {
    this.render().split();

    this.field.checkLines();

    this.game.next();

    return this;
  };

  /**
   * Get the left and top offset
   *
   * @return {object}
   */
  tetrjs.tetromino.prototype.offset = function() {
    var offset = {
      x: Infinity,
      y: Infinity
    };

    $.each(this.blocks, function() {
      offset = {
        x: Math.min(offset.x, this.pos.x),
        y: Math.min(offset.y, this.pos.y)
      };
    });

    return offset;
  };

  /**
   * Get the dimensions
   *
   * @return {object}
   */
  tetrjs.tetromino.prototype.size = function() {
    var
    offset = this.offset(),
      max = {
        x: 0,
        y: 0
      };

    $.each(this.blocks, function() {
      max = {
        x: Math.max(max.x, this.pos.x + 1),
        y: Math.max(max.y, this.pos.y + 1)
      };
    });

    return {
      x: max.x - offset.x,
      y: max.y - offset.y
    };
  };

  /**
   * Animate each block
   *
   * @param {boolean|string} animation
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.animate = function(animation) {
    $.each(this.blocks, function() {
      this.animation = animation;
    });

    return this;
  };

  /**
   * Render each block
   *
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.render = function() {
    $.each(this.blocks, function() {
      this.render();
    });

    return this;
  };

  /**
   * Split the tetromino into a separate tetromino for each block
   *
   * @return {tetromino}
   */
  tetrjs.tetromino.prototype.split = function() {
    $.each(this.blocks, function() {
      this.tetromino = new tetrjs.tetromino(this.tetromino.field, this);
    });

    this.blocks = [];

    return this;
  };

  /**
   * Create a new block
   *
   * @constructor
   * @param {tetromino} tetromino
   * @param {integer} x
   * @param {integer} y
   * @return {Block}
   */
  tetrjs.Block = function(tetromino, x, y) {
    /** @member */
    this.tetromino = tetromino;

    /** @member */
    this.game = tetromino.game;

    /** @member */
    this.animation = {};

    /** @member */
    this.destroyed = false;

    /** @member */
    this.pos = {
      x: x,
      y: y
    };

    /** @member */
    this.oldPos = {
      x: x,
      y: y
    };

    return this.animate({});
  };

  /**
   * Animate
   *
   * @param {object} animation
   * @return {Block}
   */
  tetrjs.Block.prototype.animate = function(animation) {
    this.animation = $.extend({
      delay: 0,
      duration: 0,
      easing: null
    }, animation);

    return this;
  };

  /**
   * Render the block
   *
   * @return {Block}
   */
  tetrjs.Block.prototype.render = function() {
    if (this.animation.delay) {
      (function(self) {
        setTimeout(function() {
          self.render();
        }, self.animation.delay);
      }(this));

      this.animation.delay = 0;

      return this;
    }

    if (this.destroyed) {
    } else {

      if (this.pos.y < 0) {
      }
      else {
        if (this.tetromino.field.id == 'main') {
          switch(this.tetromino.shape)
          {
          case 'ddd':
            this.color = 57;
            break;
          case 'drr':
            this.color = 5;
            break;
          case 'ddr':
            this.color = 33;
            break;
          case 'drd':
            this.color = 53;
            break;
          case 'rdr':
            this.color = 21;
            break;
          case 'dru':
            this.color = 9;
            break;
          case 'rdur':
            this.color = 29;
            break;
          }
          var apBlock = 36 + (7 - this.pos.y)*8 + this.pos.x
          Jazz.MidiOut(0x90, apBlock, this.color);
        };
      }
    }

    this.animate({});

    return this;
  };

  /**
   * Move the block
   *
   * @param {integer} x
   * @param {integer} y
   * @return {Block}
   */
  tetrjs.Block.prototype.move = function(x, y) {
    var field = this.tetromino.field;

    if (field.get(this.pos.x, this.pos.y) === this) {
      field.grid[this.pos.x][this.pos.y] = null;
    }

    if (this.tetromino.field.id == 'main') {
      console.log("x is " + this.pos.x + " y is " + this.pos.y);
      var apBlock = 36 + (7 - this.pos.y)*8 + this.pos.x
      console.log("apBlock is " + apBlock);        
      Jazz.MidiOut(0x90, apBlock, 0);
    };

    this.pos.x += x;
    this.pos.y += y;

    return this;
  };

  /**
   * Destroy the block
   *
   * @return {Block}
   */
  tetrjs.Block.prototype.destroy = function() {
    this.destroyed = true;
    for (var i = 0; i < 2; i++) {
      var apBlock = 36 + (7 - this.pos.y)*8 + this.pos.x;
      setTimeout(function(){Jazz.MidiOut(0x90, apBlock, 87);}, i*200);
      setTimeout(function(){Jazz.MidiOut(0x90, apBlock, 0);}, (i+1)*300);
    };

    return this.move(0, 0).animate({
      duration: 1000,
      easing: 'easeOutBounce'
    }).render();
  };

  /**
   * Create a new field
   *
   * @constructor
   * @param {Game} game
   * @param {string} id
   * @param {integer} cols
   * @param {integer} rows
   * @return {Field}
   */
  tetrjs.Field = function(game, id, cols, rows) {
    var self = this;

    /** @member */
    this.game = game;

    /** @member */
    this.cols = cols;

    /** @member */
    this.rows = rows;

    /** @member */
    this.id = id;

    /** @member */
    this.grid = [];

    $.each(new Array(cols), function(x) {
      self.grid[x] = {};

      $.each(new Array(rows), function(y) {
        self.grid[x][y] = null;
      });
    });

    return this;
  };

  /**
   * Get the value of a grid cell
   * Returns a boolean if the coordinate is invalid, true invokes a landing
   *
   * @param {integer} x
   * @param {integer} y
   * @param {Block} [block]
   * @return {Block|null|boolean}
   */
  tetrjs.Field.prototype.get = function(x, y, block) {
    if (x < 0 || x >= this.cols) {
      return false;
    }

    if (y >= this.rows) {
      return true;
    }

    if (y < 0) {
      return null;
    }

    if (this.grid[x][y] === block) {
      return null;
    }

    return this.grid[x][y];
  };

  /**
   * Check for completed lines
   *
   * @return {Field}
   */
  tetrjs.Field.prototype.checkLines = function() {
    var x, y, count, cleared = 0,
      self = this;

    for (y = this.rows - 1; y >= 0; y--) {
      count = 0;

      for (x = 0; x < this.cols; x++) {
        count += this.grid[x][y] ? 1 : 0;
      }

      if (count === this.cols) {
        this.clearLine(y);

        cleared++;

        y++;
      }
    }

    if (cleared) {
      this.game.cleared(cleared);
    }

    this.each(function() {
      this.tetromino.render();
    }, true);

    for (x = 0; x < this.cols; x++) {
      if (this.grid[x][0]) {
        self.game.end();
      }
    }

    return this;
  };

  /**
   * Clean a completed line
   *
   * @param {integer} row
   * @return {field}
   */
  tetrjs.Field.prototype.clearLine = function(row) {
    var self = this;

    this.each(function(x, y) {
      if (y === row) {
        self.grid[x][row].destroy();
      }

      // Drop blocks above cleared line
      if (y < row) {
        this.tetromino.move(0, 1).place().animate({
          delay: 700,
          duration: 700,
          easing: 'easeOutBounce'
        });
      }
    }, true);

    return this;
  };

  /**
   * Loop through each position on the field, bottom to top
   *
   * @this  Block
   * @param {requestCallback} callback
   * @param {boolean}         [skipEmpty] Only return blocks
   */
  tetrjs.Field.prototype.each = function(callback, skipEmpty) {
    var x, y;

    for (x = 0; x < this.cols; x++) {
      for (y = this.rows - 1; y >= 0; y--) {
        if (this.grid[x][y] || !skipEmpty) {
          callback.call(this.grid[x][y], x, y);
        }
      }
    }

    return this;
  };

  $(function() {
    game = new tetrjs.Game();
  });

  return tetrjs;
}(jQuery));