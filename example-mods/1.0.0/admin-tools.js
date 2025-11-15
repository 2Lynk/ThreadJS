// admin-tools.js
// Simple admin-style commands that show off ctx.player helpers.

api.registerMod("admin_tools", {
    onInitialize(api) {
        // /js heal_me
        api.registerCommand("heal_me", (ctx, args) => {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }
            api.playerSetHealth(ctx.player, ctx.player.maxHealth);
            ctx.reply("You feel much better now.");
        });

        // /js heal <player> <amount>
        // provide argSpec so tab-completion suggests player names and an amount
        api.registerCommand("heal", (ctx, args) => {
            if (args.length < 2) {
                ctx.reply("Usage: /heal <player> <amount>");
                return;
            }
            const targetName = String(args[0]);
            const amount = Number(args[1]) || 0;
            
            api.log("Heal command: target=" + targetName + ", amount=" + amount);
            
            // Use the built-in helper that works with player names
            const success = api.heal(targetName, amount);
            
            api.log("Heal result: " + success);
            
            if (success) {
                ctx.reply(`Healed ${targetName} by ${amount} health.`);
            } else {
                ctx.reply("Player not found or heal failed: " + targetName);
            }
        }, 0, false, ["player", "int"]);

        // /js tp_me <x> <y> <z>
        // provide argSpec so tab-completion suggests numeric coordinates
        api.registerCommand("tp_me", (ctx, args) => {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }
            if (args.length < 3) {
                ctx.reply("Usage: /js tp_me <x> <y> <z>");
                return;
            }
            const [xStr, yStr, zStr] = args;
            const [_, y, __] = ctx.player.pos;
            const x = Number(xStr) || ctx.player.pos[0];
            const yNew = Number(yStr) || y;
            const z = Number(zStr) || ctx.player.pos[2];

            api.playerSetPos(ctx.player, x, yNew, z);
            ctx.reply(`Teleported to ${x}, ${yNew}, ${z}.`);
        }, 0, false, ["double", "double", "double"]);

        // /js gm <mode>
        api.registerCommand("gm", (ctx, args) => {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }
            if (args.length < 1) {
                ctx.reply("Usage: /js gm <survival|creative|adventure|spectator>");
                return;
            }
            const mode = args[0].toUpperCase();
            api.playerSetGamemode(ctx.player, mode);
            ctx.reply("Gamemode changed (if permitted by server settings).");
        });

        // /js kit
        api.registerCommand("kit", (ctx, args) => {
            if (!ctx.player) {
                ctx.reply("Only players can use this.");
                return;
            }
            api.playerGiveItem(ctx.player, "minecraft:diamond_sword", 1);
            api.playerGiveItem(ctx.player, "minecraft:golden_apple", 8);
            ctx.reply("Basic kit given.");
        });

        api.log("[admin-tools] Commands registered: heal_me, heal, tp_me, gm, kit");
    }
});
