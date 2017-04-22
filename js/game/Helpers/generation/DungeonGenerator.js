// given a map size (the bounds)
// given a seed
// given a max room size
// given a min room size
// given the mininum number of rooms to place
// given the maximum number of rooms to place
// ...
// start dropping in randomly sized rooms at random locations, skipping if there's overlap, until criteria is met.
// If it's not met (no more room for rooms or failed for X iterations, then start over)

// randomly pick a starting room?
// given a starting room, add the next cloest room to the path. then the next cloest, etc, until all rooms for a chain
// in the order of the chain, draw paths to eachother
// dig the rooms and hallways out of a solid chunk of "nothing" in the map.
DungeonGenerator = function(){

};

// Static
DungeonGenerator.Generate = function(
    seed,
    totalWidth,
    totalHeight,
    minRoomWidth,
    maxRoomWidth,
    minRoomHeight,
    maxRoomHeight,
    minNumRooms,
    maxNumRooms
){
    // The world to return
    var world = new World(totalWidth, totalHeight);
    // The rooms we're creating
    var rooms = [];
    // The carve being made before committing back to the World
    var tiles = world.tiles;
    // Our RNG
    var random = new Random(seed);
    // The number of rooms to place
    var randomRoomsToPlace = random.next(minNumRooms, maxNumRooms);

    // To prevent an endless loop, if we fail to plae a new random room 100 times, then call it done.
    var maxFailedAttempts = 100;
    var failedAttempts = 0;

    // While we still have rooms to place
    while(rooms.length < randomRoomsToPlace && failedAttempts < maxFailedAttempts){
        // Create a new place to put it
        var randomPosition = new Point(
            random.next(0, totalWidth),
            random.next(0, totalHeight)
        );
        // Create a random size
        var randomWidth = random.next(minRoomWidth, maxRoomWidth);
        var randomHeight = random.next(minRoomHeight, maxRoomHeight);

        // Instantiate the room
        var newRoom = new Room(
            randomWidth,
            randomHeight,
            randomPosition
        );

        // If we can place it, then place it
        if(canPlace(newRoom, rooms)){
            // We can place this room, so draw it out
            carveRoom(newRoom, tiles);
            rooms.push(newRoom);
        }
        else{
            failedAttempts++;
        }

        // TODO: corridors
    }

    world.tiles = tiles;
    return world;
};


// One-off Helpers
function canPlace(room, rooms){
    // Check for intersections with any other room
    for(var otherRoom in rooms){
        if(Room.Intersects(room, otherRoom)){
            return false;
        }
    }
    return true;
}

// Carve the room out of the 2d array of tiles
function carveRoom(room,tiles){
    for(var y = room.top(); y<room.bottom(); y++){
        for(var x = room.left(); x<room.right(); x++){
            tiles[y][x] = new Floor();
        }
    }
}
