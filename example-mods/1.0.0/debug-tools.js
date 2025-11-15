// debug-tools.js
// Utilities that make the WebSocket debugger very useful.

api.registerMod("debug_tools", {
    onInitialize(api) {

        // /js start_debugger [port]
        api.registerCommand("start_debugger", (ctx, args) => {
            const port = args.length > 0 ? Number(args[0]) || 31337 : 31337;
            api.startDebugger(port);
            ctx.reply(`Debugger requested on ws://127.0.0.1:${port}/. Open debugger-client.htm.`);
        }, 0, false, ["int"]);

        // /js debug_local [player?]
        api.registerCommand("debug_local", (ctx, args) => {
            if(args.length === 1 && args[0] === "true"){
                api.setDebugLocal(true, true, ctx.player);
                ctx.reply(`Debug logs will be mirrored your chat (and WebSocket).`);
            }else if(args.length === 1 && args[0] === "false") {
                api.setDebugLocal(false, false, ctx.player);
                ctx.reply(`Debug logs disabled.`);
            }

            if(args.length === 2 && args[1] === "true") {
                let target = args[0] || (ctx.player ? ctx.player.name : null);
                if (!target) {
                    ctx.reply("Usage: /js debug_local [playerName]");
                    return;
                }
                api.setDebugLocal(true, true, target);
                ctx.reply(`Debug logs will be mirrored to ${target}'s chat (and WebSocket).`);
            }else{
                let target = args[0] || (ctx.player ? ctx.player.name : null);
                if (!target) {
                    ctx.reply("Usage: /js debug_local [playerName]");
                    return;
                }
                api.setDebugLocal(false, false, target);
                ctx.reply(`Debug logs disabled.`);
            }
        });

        // /js describe_me
        api.registerCommand("describe_me", (ctx, args) => {
            if (!ctx.player) {
                ctx.reply("Console has no player state.");
                return;
            }
            api.describe(ctx.player);
            ctx.reply("Described your player state in the debugger/log.");
        });

        // /js inspect_api
        api.registerCommand("inspect_api", (ctx, args) => {
            api.inspect(api);
            ctx.reply("Printed api schema to the log.");
        });

        // /js list_players (logs to debugger)
        api.registerCommand("list_players", (ctx, args) => {
            const players = api.listPlayers();
            api.describe(players);
            ctx.reply(`Described ${players.length} players in debugger/log.`);
        });

        api.log("[debug-tools] Commands registered: start_debugger, debug_local, describe_me, inspect_api, list_players");
    }
});
