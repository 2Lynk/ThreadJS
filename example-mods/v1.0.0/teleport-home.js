/**
 * Teleport Home - Simple home system
 *
 * Showcases:
 * - Command registration with optional arguments
 * - Player location tracking
 * - Data persistence (save/load)
 * - Teleportation API
 * - Particle effects
 */

api.registerMod("teleport-home", {
  onInitialize(api) {
    api.log("§6[TeleportHome] Loading Teleport Home mod...");

    // Load saved homes
    let homesRaw = api.loadData("homes", {});
    let homes = {};
    try {
      homes = JSON.parse(JSON.stringify(homesRaw)) || {};
    } catch (e) {
      api.log("[TeleportHome] Failed to parse homes: " + e);
      homes = {};
    }

    api.registerCommand({
      command: "home",
      description: "Teleport to your home",
      args: [
        { name: "action", type: "string", hint: ["set", "delete", "list"], optional: true }
      ],
      execute: function(ctx) {
        if (!ctx.player) {
          ctx.reply("§cOnly players can use this command!");
          return;
        }

        let playerName = ctx.playerName;
        let action = ctx.args.action ? ctx.args.action.toLowerCase() : "tp";

        if (action === "set") {
          // Save current location as home
          let playerInfo = api.getPlayer(playerName);
          // playerInfo is a Java HashMap, use .get() to access properties
          let x = playerInfo.get ? playerInfo.get("x") : playerInfo.x;
          let y = playerInfo.get ? playerInfo.get("y") : playerInfo.y;
          let z = playerInfo.get ? playerInfo.get("z") : playerInfo.z;
          let dimension = playerInfo.get ? playerInfo.get("dimensionId") : playerInfo.dimensionId;
          let yaw = playerInfo.get ? (playerInfo.get("yaw") || 0) : (playerInfo.yaw || 0);
          let pitch = playerInfo.get ? (playerInfo.get("pitch") || 0) : (playerInfo.pitch || 0);

          homes[playerName] = {
            x: x,
            y: y,
            z: z,
            dimension: dimension,
            yaw: yaw,
            pitch: pitch
          };
          api.saveData("homes", homes);
          ctx.reply(`§aHome set at §f${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`);
          api.spawnParticle("minecraft:happy_villager", x, y + 1, z, 20);
          api.playSound("minecraft:block.note_block.pling", x, y, z, 1.0, 1.5);

        } else if (action === "delete") {
          if (!homes[playerName]) {
            ctx.reply("§cYou don't have a home set!");
            return;
          }
          delete homes[playerName];
          api.saveData("homes", homes);
          ctx.reply("§aHome deleted!");

        } else if (action === "list") {
          if (!homes[playerName]) {
            ctx.reply("§cYou don't have a home set!");
            return;
          }
          let home = homes[playerName];
          ctx.reply("§6=== Your Home ===");
          ctx.reply(`§eLocation: §f${Math.floor(home.x)}, ${Math.floor(home.y)}, ${Math.floor(home.z)}`);
          ctx.reply(`§eDimension: §f${home.dimension}`);

        } else {
          // Teleport to home
          if (!homes[playerName]) {
            ctx.reply("§cYou don't have a home set! Use §e/home set");
            return;
          }

          let home = homes[playerName];
          let currentInfo = api.getPlayer(playerName);
          let currentX = currentInfo.get ? currentInfo.get("x") : currentInfo.x;
          let currentY = currentInfo.get ? currentInfo.get("y") : currentInfo.y;
          let currentZ = currentInfo.get ? currentInfo.get("z") : currentInfo.z;

          // Spawn particles at departure
          api.spawnParticle("minecraft:portal", currentX, currentY + 1, currentZ, 50);

          // Teleport
          api.teleportPlayer(playerName, home.x, home.y, home.z);

          // Spawn particles at arrival
          api.spawnParticle("minecraft:portal", home.x, home.y + 1, home.z, 50);
          api.playSound("minecraft:entity.enderman.teleport", home.x, home.y, home.z, 1.0, 1.0);

          ctx.reply("§aTeleported home!");
        }
      }
    });

    api.log("§a✓ Teleport Home mod loaded!");
  }
});
