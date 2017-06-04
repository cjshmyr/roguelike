class Game {

    frameClock: any;
    framesPerSecond: number;
    ticksPerSecond: number;
    renderer: PixiRenderer;
    seed: number;
    player: Player;
    world: World;
    state: GameState;
    settings: GameSettings;
    gameLog: LogMessage[];
    random: Random;
    dungeonNumber: number;

    pauseMenu: Menu;
    inventoryMenu: Menu;
    activeMenu: Menu = null;

    constructor(renderer: PixiRenderer, seed: number, settings: GameSettings, dungeonNumber: number = 1) {
        this.renderer = renderer;
        this.renderer.game = this; // set up a reference
        this.seed = seed;
        this.dungeonNumber = dungeonNumber;
        this.random = new Random(seed);
        this.settings = settings;

        this.frameClock = null;

        this.framesPerSecond = GameDefault.FramesPerSecond;
        this.ticksPerSecond = GameDefault.TicksPerSecond;



        // Add a Player to the first room with a reference back to this game
        this.player = new Player(this);

        this.world = null;

        this.state = GameState.NotStarted;

        // Initialize the renderer
        this.renderer.init();

        this.gameLog = [];


        // Menus
        // Main
        this.pauseMenu = MainMenu;
        this.pauseMenu.linkToGame(this);
        // Inventory
        this.inventoryMenu = InventoryMenu;
        this.inventoryMenu.linkToGame(this);

    }

    saveSettings() {
        GameSettingsProvider.saveSettings(this.settings);
    }

    start() {
        this.state = GameState.Playing;
        //Tick once
        this.gameTick(this);
        this.renderer.startFrameLoop();
    }

    pause() {
        this.state = GameState.Paused;
        this.activeMenu = this.pauseMenu;
    }
    openInventory() {
        this.state = GameState.Paused;
        this.activeMenu = this.inventoryMenu;
    }

    killActiveMenu() {
        this.state = GameState.Playing;
        this.activeMenu = null;
    }


    log(message: LogMessage) {
        this.gameLog.push(message);
    }

    getLastLog(count: number): LogMessage[] {
        return this.gameLog.clone().reverse().slice(0, count);
    }

    gameTick(game: Game) {
        if (this.state !== GameState.Paused) {
            var actorsToTick = this.getTickableActors();
            for (var a = 0; a < actorsToTick.length; a++) {
                actorsToTick[a].tick();
            }
        }
    }

    getTickableActors() {
        var tickableActors = [];
        if (this.world !== null) {
            var actor = null;
            for (var l = 0; l < this.world.layers.length; l++) {
                for (var y = 0; y < this.world.layers[l].tiles.length; y++) {
                    for (var x = 0; x < this.world.layers[l].tiles[y].length; x++) {
                        actor = this.world.layers[l].getTile(x, y);
                        if (actor instanceof Actor && actor.doesSubscribeToTicks) {
                            tickableActors.push(actor);
                        }
                    }
                }
            }
        }

        // Place player first
        var player = null;
        for (var actor of tickableActors) {
            if (actor instanceof Player) {
                player = actor;
                tickableActors.remove(player);
            }
        }
        if (player !== null) {
            tickableActors.unshift(player);
        }

        return tickableActors;
    }

    controlPressed(control: Control) {
        // PAUSED
        if (this.activeMenu !== null) {
            if (control === Control.UpArrow) {
                this.activeMenu.navUp();
            }

            if (control === Control.DownArrow) {
                this.activeMenu.navDown();
            }

            if (control === Control.Enter || control === Control.Space) {
                this.activeMenu.executeCurrentOption();
            }

            if (control === Control.Backspace) {
                this.activeMenu.goBackAPage();
            }

            if (control === Control.Escape) {
                this.activeMenu.resetNavStack();
                this.killActiveMenu();
            }

            // Let the Inventory key toggle itself
            if (control === Control.I && this.activeMenu === this.inventoryMenu) {
                this.activeMenu.resetNavStack();
                this.killActiveMenu();
            }

            return;
        }

        // PLAYING
        if (this.state === GameState.Playing) {
            // Arrows
            if ([Control.UpArrow, Control.DownArrow, Control.LeftArrow, Control.RightArrow].contains(control)) {

                // If we're not moving, issue a new move
                if (!this.player.isMoving()) {
                    var directionToMove = Movement.ControlArrowToDirection(control);
                    var offset = Movement.DirectionToOffset(directionToMove);
                    var resultLocation = Movement.AddPoints(this.player.location, offset);
                    this.player.addCommand(
                        new MoveTo(this.player, resultLocation)
                    );
                }

                // Regardless, tick once
                this.gameTick(this);
            }

            if (control === Control.Escape) {
                this.pause();
            }

            if (control === Control.P) {
                this.player.tryUseInventory(Potion);
            }

            if (control === Control.I) {
                this.activeMenu = this.inventoryMenu;
            }

            return;
        }
    }

    getWorldSettingsForDungeonNumber(dungeonNumber: number): WorldGeneratorSettings {
        var settings = new WorldGeneratorSettings();
        var incrementConstant = 2;

        var startingWidth = 25;
        var startingMinNumRooms = 3;


        settings.totalWidth = Math.ceil(startingWidth + (dungeonNumber * incrementConstant * 0.5));
        settings.totalHeight = settings.totalWidth; // mirror the width for always a square
        settings.minRoomWidth = 3;
        settings.maxRoomWidth = settings.minRoomWidth + (dungeonNumber * incrementConstant * 0.15); // allow 1*constant tile bigger each floor
        settings.minRoomHeight = 3;
        settings.maxRoomHeight = settings.minRoomHeight + (dungeonNumber * incrementConstant * 0.15);
        settings.minNumRooms = Math.floor(startingMinNumRooms + (dungeonNumber * 0.75));
        settings.maxNumRooms = settings.minNumRooms * 2;

        settings.minHallThickness = 1;
        settings.maxHallThickness = settings.maxRoomWidth > 25 ? 3 : 1;
        settings.retryAttempts = 1000;
        settings.floorActorType = Floor;
        this.world = WorldGenerator.GenerateCarvedWorld(
            this.seed,  // seed,
            settings,   // settings,
            this        // forward on the reference to this game instance
        );

        return settings;
    }

    generateNextDungeon() {
        console.log('Generating dungeon with seed "' + this.seed + '"');
        this.log(
            new LogMessage("You've entered dungeon #" + this.dungeonNumber, LogMessageType.Informational)
        );
        this.seed++;

        // Generate the dungeon
        var settings: WorldGeneratorSettings = this.getWorldSettingsForDungeonNumber(this.dungeonNumber);
        this.world = WorldGenerator.GenerateCarvedWorld(
            this.seed,  // seed,
            settings,   // settings,
            this        // forward on the reference to this game instance
        );
        this.dungeonNumber++;

        // Decorate it
        var decoratorSettings = new WorldDecoratorSettings();
        var decorator = new WorldDecorator(decoratorSettings, this.seed);
        decorator.decorate(this.world);

        // Pass a reference to the world so the player can navigate it
        this.player.world = this.world;

        var mainLayer = this.world.layers.filter(function(layer) {
            return layer.type == LayerType.Wall;
        }).first();
        var starterRoomCenter = this.world.rooms.first().getCenter();
        var lastRoomCenter = this.world.rooms.last().getCenter();

        var spawnLocation = new Point(starterRoomCenter.x, starterRoomCenter.y);
        var exitLocation = new Point(lastRoomCenter.x, lastRoomCenter.y);

        // Drop the stairs we just took down into the center of the rooms
        var stairsUp = new StairsUp(this);
        mainLayer.placeActor(stairsUp, spawnLocation);
        mainLayer.placeActor(this.player, Movement.AddPoints(spawnLocation, new Point(0, 1)));

        var exit = new StairsDown(this);
        mainLayer.placeActor(exit, exitLocation);

        // Throw in some demo enemies protecting the exit
        var chaser = new GreenBlob(this);
        mainLayer.placeActor(chaser, exitLocation.offsetBy(1, 1));
        var chaser2 = new GreenBlob(this);
        mainLayer.placeActor(chaser2, exitLocation.offsetBy(0, 1));
        var chaser3 = new GreenBlob(this);
        mainLayer.placeActor(chaser3, exitLocation.offsetBy(1, 0));
        var chaser4 = new Skeleton(this);
        mainLayer.placeActor(chaser4, exitLocation.offsetBy(-1, -1));
        var chaser5 = new Skeleton(this);
        mainLayer.placeActor(chaser5, exitLocation.offsetBy(-1, 0));
        var chaser6 = new Skeleton(this);
        mainLayer.placeActor(chaser6, exitLocation.offsetBy(0, -1));
        var chaser7 = new Ghost(this);
        mainLayer.placeActor(chaser7, exitLocation.offsetBy(1, -1));
        var chaser8 = new Ghost(this);
        mainLayer.placeActor(chaser8, exitLocation.offsetBy(-1, 1));
        chaser8.addBuff(
            new PetrifiedDebuff()
        );

        var spriteRandom = new Random(this.seed);
        var demoChest = new Chest(this, [new Potion(spriteRandom)]);

        var buffedSteelBoots = new SteelBoots(5, spriteRandom);
        buffedSteelBoots.addBuff(
            new WallBreakerBuff()
        );

        var buffedShirt = new Shirt(2, spriteRandom);
        buffedShirt.addBuff(
            new InvisibilityBuff()
        );

        var dagger = new Dagger(spriteRandom, 2);

        var demoChest2 = new Chest(this, [
            new Potion(spriteRandom),
            new Potion(spriteRandom),
            new Potion(spriteRandom),
            buffedShirt,
            new Chestplate(5, spriteRandom),
            new LeatherBoots(4, spriteRandom),
            new SteelBoots(5, spriteRandom),
            buffedSteelBoots,
            dagger
        ]);

        mainLayer.placeActor(demoChest, this.world.rooms.second().getCenter());
        mainLayer.placeActor(demoChest2, Movement.AddPoints(spawnLocation, new Point(1, 0)));

    }
}
