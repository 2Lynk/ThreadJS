/**
 * Player Tracker - Track player activity
 *
 * Showcases:
 * - Command event listening
 * - Data persistence
 * - Message broadcasting
 * - Time formatting
 *
 * This module tracks player command usage and provides statistics
 * via the `/activity` and `/leaderboard` commands.
 */

/**
 * @typedef {Object} CommandContext
 * @property {Object} args - Parsed command arguments.
 * @property {string} [args.player] - Target player name for activity command.
 * @property {Object} player - Player object (if the sender is a player).
 * @property {string} playerName - Name of the sender/player.
 * @property {(msg:string)=>void} reply - Sends a chat message back to the sender.
 */

/**
 * @typedef {Object} CommandEvent
 * @property {string} playerName - Name of the player who executed the command.
 * @property {string} command - The full command string that was executed.
 * @property {number} x - Player X coordinate when command was executed.
 * @property {number} y - Player Y coordinate when command was executed.
 * @property {number} z - Player Z coordinate when command was executed.
 * @property {string} dimensionId - Dimension where command was executed.
 * @property {number} timestamp - Unix timestamp in milliseconds.
 */

/**
 * @typedef {Object} PlayerActivity
 * @property {number} commandCount - Total number of commands executed.
 * @property {string|null} lastCommand - The most recent command string.
 * @property {number|null} lastActive - Unix timestamp of last activity.
 * @property {number} firstSeen - Unix timestamp when first tracked.
 */

/**
 * @typedef {Object} APIMethods
 * @property {(msg:string)=>void} log - Log text to the server console.
 * @property {(key:string, defaultValue:any)=>any} loadData - Load saved JSON data.
 * @property {(key:string, value:any)=>void} saveData - Save JSON data.
 * @property {(callback:(event:CommandEvent)=>void)=>void} onCommandExecute - Listen for command execution events.
 * @property {(cmd:Object)=>void} registerCommand - Register a new command.
 * @property {(id:string, implementation:Object)=>void} registerMod - Register a new JavaScript mod.
 */

/**
 * Registers the Player Tracker mod.
 * @param {APIMethods} api - The Thread.JS modding API.
 */
api.registerMod("player-tracker", {

  /**
   * Fired when the mod initializes.
   * Loads activity data and sets up command event listeners.
   *
   * @param {APIMethods} api - API instance provided on startup.
   */
  onInitialize(api) {
    api.log("§6[PlayerTracker] Loading Player Tracker mod...");

    /** @type {Record<string, PlayerActivity>} */
    let activity = {};

    // Load activity data
    let activityRaw = api.loadData("player_activity", {});
    try {
      activity = JSON.parse(JSON.stringify(activityRaw)) || {};
    } catch (e) {
      api.log("[PlayerTracker] Failed to parse activity: " + e);
      activity = {};
    }

    // Track command usage
    api.onCommandExecute(event => {
      let playerName = event.playerName;

      if (!activity[playerName]) {
        activity[playerName] = {
          commandCount: 0,
          lastCommand: null,
          lastActive: null,
          firstSeen: Date.now()
        };
      }

      activity[playerName].commandCount++;
      activity[playerName].lastCommand = event.command;
      activity[playerName].lastActive = Date.now();

      api.saveData("player_activity", activity);
    });

    // Register /activity command
    api.registerCommand({
      command: "activity",
      description: "View player activity statistics",
      args: [
        { name: "player", type: "player", hint: "<player>", optional: true }
      ],

      /**
       * Execute the /activity command.
       * Shows command usage stats for the target player.
       *
       * @param {CommandContext} ctx
       */
      execute: function(ctx) {
        let targetPlayer = ctx.args.player || ctx.playerName;

        if (!activity[targetPlayer]) {
          ctx.reply(`§cNo activity data for ${targetPlayer}`);
          return;
        }

        let data = activity[targetPlayer];

        ctx.reply(`§6=== Activity: ${targetPlayer} ===`);
        ctx.reply(`§eCommands run: §f${data.commandCount}`);

        if (data.lastCommand) {
          ctx.reply(`§eLast command: §f${data.lastCommand}`);
        }

        if (data.lastActive) {
          let timeAgo = Math.floor((Date.now() - data.lastActive) / 1000);
          let timeStr;
          if (timeAgo < 60) {
            timeStr = `${timeAgo}s ago`;
          } else if (timeAgo < 3600) {
            timeStr = `${Math.floor(timeAgo / 60)}m ago`;
          } else if (timeAgo < 86400) {
            timeStr = `${Math.floor(timeAgo / 3600)}h ago`;
          } else {
            timeStr = `${Math.floor(timeAgo / 86400)}d ago`;
          }
          ctx.reply(`§eLast active: §f${timeStr}`);
        }

        if (data.firstSeen) {
          let date = new Date(data.firstSeen);
          ctx.reply(`§eFirst seen: §f${date.toLocaleDateString()}`);
        }
      }
    });

    // Register /leaderboard command
    api.registerCommand({
      command: "leaderboard",
      description: "Show most active players",
      args: [
        // No arguments
      ],
      /**
       * Execute the /leaderboard command.
       * Shows top 5 players by command count.
       *
       * @param {CommandContext} ctx
       */
      execute: function(ctx) {
        let sorted = [];
        for (let player in activity) {
          sorted.push({
            name: player,
            count: activity[player].commandCount
          });
        }

        sorted.sort((a, b) => b.count - a.count);

        ctx.reply("§6=== Most Active Players ===");
        let limit = Math.min(5, sorted.length);
        for (let i = 0; i < limit; i++) {
          ctx.reply(`§e${i + 1}. §f${sorted[i].name} §7- §f${sorted[i].count} commands`);
        }
      }
    });

    api.log("§a✓ Player Tracker mod loaded!");
  }
});
