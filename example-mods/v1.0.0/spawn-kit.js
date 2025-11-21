/**
 * Spawn Kit - Give players starter items
 *
 * Showcases:
 * - Giving items to players
 * - Data persistence for one-time actions
 * - Sound effects
 * - Message formatting
 *
 * This module provides a one-time starter kit that players can claim
 * via the `/kit` command. Admins can reset kit status with `/kitreset`.
 */

/**
 * @typedef {Object} CommandContext
 * @property {Object} args - Parsed command arguments.
 * @property {string} [args.player] - Target player name for kitreset command.
 * @property {Object} player - Player object (if the sender is a player).
 * @property {string} playerName - Name of the sender/player.
 * @property {(msg:string)=>void} reply - Sends a chat message back to the sender.
 */

/**
 * @typedef {Object} ItemStack
 * @property {string} itemId - The Minecraft item ID (e.g., "minecraft:stone_pickaxe").
 * @property {number} count - Number of items in the stack.
 */

/**
 * @typedef {Object} PlayerInfo
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string|number} dimensionId
 *
 * Note: When returned as a Java object, fields must be accessed using `.get()`.
 */

/**
 * @typedef {Object} APIMethods
 * @property {(msg:string)=>void} log - Log text to the server console.
 * @property {(key:string, defaultValue:any)=>any} loadData - Load saved JSON data.
 * @property {(key:string, value:any)=>void} saveData - Save JSON data.
 * @property {(player:string, itemId:string, count:number)=>void} giveItem - Give items to a player.
 * @property {(name:string)=>PlayerInfo|Map} getPlayer - Get all data for a player.
 * @property {(particle:string, x:number, y:number, z:number, count:number)=>void} spawnParticle - Spawn particles.
 * @property {(sound:string, x:number, y:number, z:number, volume:number, pitch:number)=>void} playSound - Play a sound.
 * @property {(cmd:Object)=>void} registerCommand - Register a new command.
 * @property {(id:string, implementation:Object)=>void} registerMod - Register a new JavaScript mod.
 */

/**
 * Registers the Spawn Kit mod.
 * @param {APIMethods} api - The Thread.JS modding API.
 */
api.registerMod("spawn-kit", {

  /**
   * Fired when the mod initializes.
   * Loads kit received data and registers the `/kit` and `/kitreset` commands.
   *
   * @param {APIMethods} api - API instance provided on startup.
   */
  onInitialize(api) {
    api.log("§6[SpawnKit] Loading Spawn Kit mod...");

    /** @type {Record<string, number>} - Maps player names to timestamp when kit was received */
    let received = {};

    // Track who has received the kit
    let receivedRaw = api.loadData("kit_received", {});
    try {
      received = JSON.parse(JSON.stringify(receivedRaw)) || {};
    } catch (e) {
      api.log("[SpawnKit] Failed to parse received data: " + e);
      received = {};
    }

    /** @type {ItemStack[]} */
    const starterKit = [
      { itemId: "minecraft:stone_pickaxe", count: 1 },
      { itemId: "minecraft:stone_axe", count: 1 },
      { itemId: "minecraft:stone_shovel", count: 1 },
      { itemId: "minecraft:stone_sword", count: 1 },
      { itemId: "minecraft:bread", count: 16 },
      { itemId: "minecraft:torch", count: 32 },
      { itemId: "minecraft:oak_planks", count: 64 }
    ];

    // Register /kit command
    api.registerCommand({
      command: "kit",
      description: "Receive your starter kit (one-time only)",
      args: [
        // No arguments
      ],

      /**
       * Execute the /kit command.
       * Gives the player a one-time starter kit if they haven't received it yet.
       *
       * @param {CommandContext} ctx
       */
      execute: function(ctx) {
        if (!ctx.player) {
          ctx.reply("§cOnly players can use this command!");
          return;
        }

        let playerName = ctx.playerName;

        // Check if already received
        if (received[playerName]) {
          ctx.reply("§cYou've already received your starter kit!");
          let receivedDate = new Date(received[playerName]);
          ctx.reply(`§7Received on: ${receivedDate.toLocaleString()}`);
          return;
        }

        // Give items
        ctx.reply("§6=== Starter Kit ===");
        for (let i = 0; i < starterKit.length; i++) {
          let item = starterKit[i];
          api.giveItem(playerName, item.itemId, item.count);
          let itemName = item.itemId.replace("minecraft:", "").replace(/_/g, " ");
          ctx.reply(`§a+ §f${item.count}x §e${itemName}`);
        }

        // Mark as received
        received[playerName] = Date.now();
        api.saveData("kit_received", received);

        // Effects
        let playerInfo = api.getPlayer(playerName);
        let x = playerInfo.get ? playerInfo.get("x") : playerInfo.x;
        let y = playerInfo.get ? playerInfo.get("y") : playerInfo.y;
        let z = playerInfo.get ? playerInfo.get("z") : playerInfo.z;
        api.spawnParticle("minecraft:happy_villager", x, y + 1, z, 50);
        api.playSound("minecraft:entity.player.levelup", x, y, z, 1.0, 1.0);

        ctx.reply("§a✓ Starter kit received!");
      }
    });

    // Register /kitreset command (admin only)
    api.registerCommand({
      command: "kitreset",
      description: "Reset kit status for a player (admin only)",
      requiresOp: true,
      permissionLevel: 2,
      args: [
        { name: "player", type: "player", hint: "<player>" }
      ],

      /**
       * Execute the /kitreset command.
       * Resets kit status for a player, allowing them to claim it again.
       * Requires operator permissions (level 2).
       *
       * @param {CommandContext} ctx
       */
      execute: function(ctx) {
        let targetPlayer = ctx.args.player;

        if (!received[targetPlayer]) {
          ctx.reply(`§c${targetPlayer} hasn't received a kit yet`);
          return;
        }

        delete received[targetPlayer];
        api.saveData("kit_received", received);
        ctx.reply(`§aReset kit status for ${targetPlayer}`);
      }
    });

    api.log("§a✓ Spawn Kit mod loaded!");
  }
});
