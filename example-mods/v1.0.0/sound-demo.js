// sound-demo.js
// Demonstrates the ThreadJS sound system with various examples

api.registerMod("sound_demo", {
    onInitialize(api) {
        api.log("[sound-demo] Initializing sound system examples...");

        // Command: /play_sound - Play a sound to everyone
        // Register with just sound ID (volume and pitch default to 1.0)
        api.registerCommand("play_sound", function (ctx, args) {
            api.log("[sound-demo] play_sound called with args: " + JSON.stringify(args));
            api.log("[sound-demo] args.length: " + args.length);
            
            if (args.length < 1) {
                ctx.reply("Usage: /play_sound <sound_id> [volume] [pitch]");
                ctx.reply("Example: /play_sound entity.player.levelup 1.0 1.0");
                return;
            }

            var soundId = args[0];
            api.log("[sound-demo] soundId = " + soundId);
            var volume = args.length > 1 ? Number(args[1]) : 1.0;
            var pitch = args.length > 2 ? Number(args[2]) : 1.0;

            // Add minecraft: prefix if not present
            if (soundId.indexOf(":") === -1) {
                soundId = "minecraft:" + soundId;
            }

            api.log("[sound-demo] Playing sound: " + soundId + " vol=" + volume + " pitch=" + pitch);
            try {
                api.playSound(soundId, volume, pitch);
                ctx.reply("§aPlaying sound: " + soundId);
            } catch (e) {
                ctx.reply("§cError playing sound: " + e);
                api.log("[sound-demo] Error: " + e);
            }
        }, 0, false, ["string"]);  // Only require the sound ID, make volume/pitch optional in the handler

        // Command: /test_sound - Quick test with common sounds
        api.registerCommand("test_sound", function (ctx, args) {
            ctx.reply("§6Testing sounds...");
            api.playSound("minecraft:entity.player.levelup", 1.0, 1.0);
            ctx.reply("§aPlayed: entity.player.levelup");
        });

        // Command: /sound_alert - Server-wide alert with bell sound
        api.registerCommand("sound_alert", function (ctx, args) {
            if (args.length < 1) {
                ctx.reply("Usage: /sound_alert <message...>");
                return;
            }

            var message = args.join(" ");
            api.playSound("block.bell.use", 1.0, 0.8);
            api.sendMessage("§c§l[ALERT] §r" + message);
            ctx.reply("Alert sent!");
        }, 2, false, ["greedy"]);

        // Event: Play achievement sound when player finds diamonds
        api.onBlockBreak(function (evt) {
            if (evt.blockId === "minecraft:diamond_ore" || evt.blockId === "minecraft:deepslate_diamond_ore") {
                api.playSoundTo(evt.playerName, "entity.player.levelup", 0.8, 1.0);
                api.sendMessageTo(evt.playerName, "§b✨ You found diamonds! ✨");
            }
        });

        // Event: Play eerie sound when entering the nether
        api.onPlayerJoin(function (player) {
            // Welcome sound
            api.playSoundTo(player.name, "block.note_block.pling", 0.5, 1.5);
        });

        // Command: /spawn_firework_sound - Play firework at player position
        api.registerCommand("spawn_firework_sound", function (ctx, args) {
            if (!ctx.player) {
                ctx.reply("Only players can use this command.");
                return;
            }

            var pos = ctx.player.pos;
            var dim = ctx.player.dimensionId;

            api.playSoundAt(
                pos[0], pos[1], pos[2],
                dim,
                "entity.firework_rocket.blast",
                1.0, 1.0
            );

            ctx.reply("§dFirework sound spawned at your location!");
        });

        // Command: /victory_sound - Celebration sound
        api.registerCommand("victory_sound", function (ctx, args) {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }

            // Play multiple sounds in sequence using scheduler
            api.playSoundTo(ctx.player.name, "entity.player.levelup", 1.0, 1.0);

            api.runLater(10, function () {
                api.playSoundTo(ctx.player.name, "ui.toast.challenge_complete", 1.0, 1.0);
            });

            api.runLater(20, function () {
                api.playSoundTo(ctx.player.name, "entity.firework_rocket.twinkle", 1.0, 1.5);
            });

            ctx.reply("§6✨ VICTORY! ✨");
        });

        // Command: /music_note - Play a musical note
        api.registerCommand("music_note", function (ctx, args) {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }

            var pitch = args.length > 0 ? Number(args[0]) : 1.0;
            api.playSoundTo(ctx.player.name, "block.note_block.harp", 0.8, pitch);
            ctx.reply("Playing note at pitch: " + pitch);
        }, 0, false, ["double"]);

        // Event: Ambient cave sounds in caves (example using player tick)
        var tickCounter = 0;
        api.onPlayerTick(function (player) {
            tickCounter++;
            
            // Check every 10 seconds (200 ticks)
            if (tickCounter % 200 === 0) {
                var pos = player.pos;
                var y = pos[1];
                
                // If player is underground
                if (y < 50) {
                    // 10% chance to play ambient sound
                    if (Math.random() < 0.1) {
                        api.playSoundTo(player.name, "ambient.cave", 0.3, 0.8);
                    }
                }
            }
        });

        api.log("[sound-demo] Sound commands registered: play_sound, sound_alert, spawn_firework_sound, victory_sound, music_note");
    }
});
