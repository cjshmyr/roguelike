Game = function(renderer){
    this.renderer = renderer;
    this.frameClock = null;
    this.framesPerSecond = 1; //20 might be reasonable
    var seed = (new Date).getTime();
    console.log('GENERATED WITH SEED ' + seed);

    this.world = DungeonGenerator.Generate(
        seed,//seed,
        75,//totalWidth,
        50,//totalHeight,
        6,//minRoomWidth,
        15,//maxRoomWidth,
        6,//minRoomHeight,
        10,//maxRoomHeight,
        4,//minNumRooms,
        15//maxNumRooms
    );

    this.renderer.init();

    this.start = function(){
        this.frameClock= setInterval(this.frameTick, (1/this.framesPerSecond)*1000);
    };
    this.stop = function(){
        this.frameClock = null;
    };
    this.frameTick = function(){
        this.renderer.drawFrame(this.world);
    }.bind(this);
};
