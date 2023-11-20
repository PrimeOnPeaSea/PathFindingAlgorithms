/** A simple priority queue implementation. */
function PriorityQueue(comparator) {
  this._comparator = comparator;
  this._heap = [];
}

/** Returns the index of the parent of the element at the given index. */
PriorityQueue.prototype._parent = function (idx) {
  return Math.floor((idx - 1) / 2);
};

/** Returns the left child index of the given index. */
PriorityQueue.prototype._leftChild = function (idx) {
  return idx * 2 + 1;
};

/** Returns the right child index of the given index. */
PriorityQueue.prototype._rightChild = function (idx) {
  return idx * 2 + 2;
};

/** Swaps the elements at the two given indexes. */
PriorityQueue.prototype._swap = function (i, j) {
  var temp = this._heap[i];
  this._heap[i] = this._heap[j];
  this._heap[j] = temp;
};

/** Returns the top element of the heap. */
PriorityQueue.prototype.queue = function (value) {
  this._heap.push(value);

  var idx = this._heap.length - 1;

  while (
    idx !== 0 &&
    this._comparator(this._heap[this._parent(idx)], this._heap[idx]) > 0
  ) {
    this._swap(idx, this._parent(idx));
    idx = this._parent(idx);
  }
};

/** Removes the element on the top of the heap and returns it. */
PriorityQueue.prototype.dequeue = function () {
  var root = this._heap[0];

  var end = this._heap.pop();

  if (this._heap.length > 0) {
    this._heap[0] = end;

    var idx = 0;
    var length = this._heap.length;

    while (true) {
      var left = this._leftChild(idx);
      var right = this._rightChild(idx);

      var swapIdx = null;

      if (left < length && this._comparator(this._heap[left], end) < 0) {
        swapIdx = left;
      }

      if (
        right < length &&
        (swapIdx === null ||
          this._comparator(this._heap[right], this._heap[left]) < 0)
      ) {
        swapIdx = right;
      }

      if (swapIdx === null) break;

      this._swap(idx, swapIdx);
      idx = swapIdx;
    }
  }

  return root;
};

/** Returns the length of the queue. */
PriorityQueue.prototype.length = function () {
  return this._heap.length;
};

/** Helper function for better responsiveness and animation. */
function whileAsync(cond, body, chunkSize, period) {
  var chunkSize = chunkSize || 10;
  var period = period || 0;
  return new Promise(function (resolve, reject) {
    var interval = setInterval(function () {
      for (var k = 0; k < chunkSize; k++) {
        if (!cond()) {
          clearInterval(interval);
          resolve();
          return;
        }
        body();
      }
    }, period);
  });
}

/** Adds a CSS class for a short time. */
function addEphemeralClass(element, className, duration) {
  var duration = duration || 1000;
  element.classList.add(className);
  setTimeout(function () {
    element.classList.remove(className);
  }, duration);
}

/** A simple point or pair. */
function Point(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
}

/** Checks if two points are equal. */
Point.prototype.equals = function (other) {
  return other.x == this.x && other.y == this.y;
};

/** Allows for using the point as a key in a set. */
Point.prototype.serialize = function () {
  return JSON.stringify([this.x, this.y]);
};

/** Checks if the point is inside bounds. */
Point.prototype.insideBounds = function (bounds) {
  return this.x >= 0 && this.x < bounds.x && this.y >= 0 && this.y < bounds.y;
};

/** Creates a new point offset by the delta. */
Point.prototype.offset = function (delta) {
  return new Point(this.x + parseInt(delta[0]), this.y + parseInt(delta[1]));
};

/** Calculates the heuristic distance between two points. */
function heuristic(a, b) {
  var d1 = Math.abs(b.x - a.x);
  var d2 = Math.abs(b.y - a.y);
  return d1 + d2;
}

/** The main game object. */
function Maze(options) {
  var options = Object.assign(
    {
      gridElement: document.getElementById("body"),
      gridSize: new Point(20, 10),
      startPosition: new Point(0, 0),
      targetPosition: null,
      blockSize: 25,
      onSolved: function () {},
    },
    options || {}
  );

  this.gridElement = options.gridElement;
  this.blockSize = options.blockSize;
  this.onSolved = options.onSolved;
  this.bounds = options.gridSize;
  this.startPosition = options.startPosition;
  this.targetPosition = options.targetPosition || this.bounds.offset([-1, -1]);

  this.sides = ["bottom", "right", "top", "left"];
  this.oppositeSides = ["top", "left", "bottom", "right"];
  this.delta = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  this.keyCodeDirMap = { 37: "left", 38: "top", 39: "right", 40: "bottom" };

  this.blocks = new Array(this.bounds.y);
  for (var i = 0; i < this.bounds.y; i++) {
    this.blocks[i] = new Array(this.bounds.x);
  }

  var self = this;
  document.onkeydown = function (e) {
    if (self.solving || self.solved) {
      return;
    }
    if (e.keyCode in self.keyCodeDirMap) {
      self.movePlayer(self.keyCodeDirMap[e.keyCode]);
      e.preventDefault();
    }
  };
}

/** Creates a single block and sets its position. */
Maze.prototype.createBlock = function (p) {
  var block = document.createElement("div");
  block.classList.add("block");
  block.style.left = p.x * this.blockSize + "px";
  block.style.top = p.y * this.blockSize + "px";
  block.open = { left: false, top: false, bottom: false, right: false };
  return block;
};

/** Fetches a block by a given position. */
Maze.prototype.getBlock = function (point) {
  return this.blocks[point.y][point.x];
};

/** Fetches the player's position block. */
Maze.prototype.getPlayerBlock = function () {
  return this.getBlock(this.position);
};

/** Resets the game. */
Maze.prototype.reset = function () {
  if (this.solving || this.reseting) {
    return false;
  }

  this.reseting = true;
  this.position = this.startPosition;
  this.solving = false;
  this.solved = false;

  while (this.gridElement.firstChild) {
    this.gridElement.removeChild(this.gridElement.firstChild);
  }

  var fragment = document.createDocumentFragment();
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.createBlock(new Point(x, y), 25);
      this.blocks[y][x] = block;
      fragment.appendChild(block);
    }
  }
  this.gridElement.appendChild(fragment);

  this.getBlock(this.targetPosition).classList.add("target");

  var self = this;
  return this.generate().then(function () {
    self.setPlayerPosition(self.startPosition);
    self.reseting = false;
  });
};

/** Gets the valid adjacent points which were not visited. */
Maze.prototype.getAdjacents = function (point, visitedSet) {
  var adjacents = [];
  for (var i = 0; i < this.delta.length; i++) {
    var cp = point.offset(this.delta[i]);
    // We add the direction information w.r.t. the original point.
    cp.side = this.sides[i];
    cp.oppositeSide = this.oppositeSides[i];
    if (cp.insideBounds(this.bounds) && !visitedSet.has(cp.serialize())) {
      adjacents.push(cp);
    }
  }
  return adjacents;
};

/** Moves the player to the specified direction (top, left, right, bottom). */
Maze.prototype.movePlayer = function (direction) {
  var currentBlock = this.getPlayerBlock();
  var delta = this.delta[this.sides.indexOf(direction)];
  var nextPosition = this.position.offset(delta);

  if (!nextPosition.insideBounds(this.bounds)) {
    addEphemeralClass(currentBlock, "error", 100);
    return;
  }

  if (!currentBlock.open[direction]) {
    addEphemeralClass(currentBlock, "error", 100);
    return;
  }

  this.setPlayerPosition(nextPosition);
};

/** Sets the player's block to the specified point and checks for the goal. */
Maze.prototype.setPlayerPosition = function (position) {
  this.getPlayerBlock().classList.remove("current");
  this.position = position;
  this.getPlayerBlock().classList.add("current");
  if (!this.solved && this.position.equals(this.targetPosition)) {
    this.solved = true;
    if (!this.solving) {
      this.onSolved();
    }
  }
};

/** Generates the maze by randomly traversing and removing walls. */
Maze.prototype.generate = function () {
  var blockCount = this.bounds.x * this.bounds.y;
  var stack = [];
  var visited = new Set();
  var start = this.startPosition;
  stack.push(start);

  var i = 0;
  return whileAsync(
    () => visited.size < blockCount,
    () => {
      var point = stack[stack.length - 1];
      var ps = point.serialize();

      var block = this.getBlock(point);

      if (!visited.has(ps)) {
        visited.add(ps);
        block.dataset.index = i;
        block.classList.add("generated");
        i++;
      }

      var adjacents = this.getAdjacents(point, visited);

      if (adjacents.length == 0) {
        stack.pop();
        return;
      }

      var rand = parseInt(Math.random() * 1000);
      var np = adjacents[rand % adjacents.length];
      var ajdBlock = this.getBlock(np);
      stack.push(np);

      // Remove the wall on the current block.
      block.classList.add(np.side);
      block.open[np.side] = true;

      // And the opposite side for the adjacent block's perspective.
      ajdBlock.classList.add(np.oppositeSide);
      ajdBlock.open[np.oppositeSide] = true;
    },
    100
  );
};

/** Solves the maze using the BFS algorithm including simple animation. */
Maze.prototype.solve = function () {
  if (this.solving || this.reseting) {
    console.log("Solving or resetting, returning early.");
    return;
  }

  console.log("Starting BFS algorithm...");
  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = [position];
  var self = this;

  // The familiar BFS loop.
  return whileAsync(
    () => {
      console.log("Queue length:", queue.length, "Current position:", position);
      return queue.length > 0 && !position.equals(self.targetPosition);
    },
    () => {
      position = queue.shift();
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        console.log("Already visited:", position);
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        // Keep track so we can traverse back using the shortest path.
        nextPosition.previous = position;

        console.log("Pushing to queue:", nextPosition);
        queue.push(nextPosition);
      }
    }
  )
    .then(function () {
      console.log("Building shortest path...");
      // Build up the shortest path.
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      // Animation for showing the shortest path.
      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      // Animation for moving the player block to the target.
      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      console.log("Finished BFS algorithm.");
      self.solving = false;
    });
};

/** Solves the maze using the DFS algorithm including simple animation. */
Maze.prototype.solveDFS = function () {
  if (this.solving || this.reseting) {
    console.log("Solving or resetting, returning early.");
    return;
  }

  console.log("Starting DFS algorithm...");
  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var stack = [position];
  var self = this;

  return whileAsync(
    () => {
      console.log("Stack length:", stack.length, "Current position:", position);
      return stack.length > 0 && !position.equals(self.targetPosition);
    },
    () => {
      position = stack.pop();
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        console.log("Already visited:", position);
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        // Keep track so we can traverse back using the shortest path.
        nextPosition.previous = position;

        console.log("Pushing to stack:", nextPosition);
        stack.push(nextPosition);
      }
    }
  )
    .then(function () {
      console.log("Building shortest path...");
      // Build up the shortest path.
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      // Animation for showing the shortest path.
      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      // Animation for moving the player block to the target.
      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      console.log("Finished DFS algorithm.");
      self.solving = false;
    });
};

/** Clears the visited and path classes from the maze. */
Maze.prototype.clearMaze = function () {
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.getBlock(new Point(x, y));
      block.classList.remove("visited", "path");
    }
  }
};

/** Clears the maze and resets the player to the starting point. */
Maze.prototype.clearMazeAndReset = function () {
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.getBlock(new Point(x, y));
      block.classList.remove("visited", "path");
    }
  }
  this.setPlayerPosition(this.startPosition);
};

/** Generates a maze with multiple solutions. */
Maze.prototype.generateMultipleSolutions = function () {
  var blockCount = this.bounds.x * this.bounds.y;
  var stack = [];
  var visited = new Set();
  var start = this.startPosition;
  stack.push(start);

  var i = 0;
  return whileAsync(
    () => visited.size < blockCount,
    () => {
      var point = stack[stack.length - 1];
      var ps = point.serialize();

      var block = this.getBlock(point);

      if (!visited.has(ps)) {
        visited.add(ps);
        block.dataset.index = i;
        block.classList.add("generated");
        i++;
      }

      var adjacents = this.getAdjacents(point, visited);

      if (adjacents.length == 0) {
        stack.pop();
        return;
      }

      // Shuffle the adjacent points randomly to introduce randomness.
      shuffleArray(adjacents);

      var np = adjacents.pop();
      var ajdBlock = this.getBlock(np);
      stack.push(np);

      // Remove the wall on the current block.
      block.classList.add(np.side);
      block.open[np.side] = true;

      // And the opposite side for the adjacent block's perspective.
      ajdBlock.classList.add(np.oppositeSide);
      ajdBlock.open[np.oppositeSide] = true;
    },
    100
  );
};

/** Shuffles an array in place. */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/** Generates a maze with a random target position. */
Maze.prototype.generateRandomEnd = function () {
  // Reset the existing maze and blocks.
  this.reset();

  // Generate a random target position within the bounds of the maze.
  var randomX = Math.floor(Math.random() * this.bounds.x);
  var randomY = Math.floor(Math.random() * this.bounds.y);
  this.targetPosition = new Point(randomX, randomY);

  document.querySelector(".target").classList.remove("target");
  // Update the target position in the maze.
  this.getBlock(this.targetPosition).classList.add("target");

  var self = this;
  return this.generate().then(function () {
    // Regenerate the maze with the new random target position.
    self.setPlayerPosition(self.startPosition);
  });
};

/** Solves the maze using the A* algorithm including simple animation. */
Maze.prototype.solveAStar = function () {
  if (this.solving || this.reseting) {
    console.log("Solving or resetting, returning early.");
    return;
  }

  console.log("Starting A* algorithm...");
  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = new PriorityQueue((a, b) => a.f - b.f);
  queue.queue({ position: startPosition, f: 0, g: 0 });
  var self = this;

  return whileAsync(
    () => {
      console.log(
        "Queue length:",
        queue.length(),
        "Current position:",
        position
      );
      return queue.length() > 0 && !position.equals(self.targetPosition);
    },
    () => {
      var node = queue.dequeue();
      position = node.position;
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        console.log("Already visited:", position);
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        // Keep track so we can traverse back using the shortest path.
        nextPosition.previous = position;

        // Calculate the 'f' value for A*.
        var g = node.g + heuristic(position, nextPosition);
        var h = heuristic(nextPosition, self.targetPosition);
        var f = g + h;

        console.log("Queuing position:", nextPosition, "with f value:", f);
        queue.queue({ position: nextPosition, f: f, g: g });
      }
    }
  )
    .then(function () {
      console.log("Building shortest path...");
      // Build up the shortest path.
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      // Animation for showing the shortest path.
      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      // Animation for moving the player block to the target.
      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      console.log("Finished A* algorithm.");
      self.solving = false;
    });
};

/** Solves the maze using the Dijkstra's algorithm including simple animation. */
Maze.prototype.solveDijkstra = function () {
  if (this.solving || this.reseting) {
    console.log("Solving or resetting, returning early.");
    return;
  }

  console.log("Starting Dijkstra's algorithm...");
  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = new PriorityQueue((a, b) => a.distance - b.distance);
  queue.queue({ position: startPosition, distance: 0 });
  var self = this;

  return whileAsync(
    () => {
      console.log(
        "Queue length:",
        queue.length(),
        "Current position:",
        position
      );
      return queue.length() > 0 && !position.equals(self.targetPosition);
    },
    () => {
      var node = queue.dequeue();
      position = node.position;
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        console.log("Already visited:", position);
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        // Keep track so we can traverse back using the shortest path.
        nextPosition.previous = position;

        // Calculate the 'distance' value for Dijkstra's.
        var distance = node.distance + 1; // Assuming each move costs 1

        console.log(
          "Queuing position:",
          nextPosition,
          "with distance value:",
          distance
        );
        queue.queue({ position: nextPosition, distance: distance });
      }
    }
  )
    .then(function () {
      console.log("Building shortest path...");
      // Build up the shortest path.
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      // Animation for showing the shortest path.
      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      // Animation for moving the player block to the target.
      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      console.log("Finished Dijkstra's algorithm.");
      self.solving = false;
    });
};
