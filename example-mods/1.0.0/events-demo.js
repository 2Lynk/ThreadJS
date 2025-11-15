// events-demo.js
// Demonstrates all JS event hooks. Very spammy; use for debugging.

api.registerMod("events_demo", {
    onInitialize(api) {

        api.onServerTick(() => {
            // Very noisy if you log every tick; we'll keep this quiet.
        });

        api.onPlayerTick(player => {
            // Example: occasionally log player position
            // (throttled to once every 100 ticks per player via random)
            if (Math.random() < 0.0005) {
                api.log(`[tick] ${player.name} is alive.`);
            }
        });

        api.onPlayerJoin(player => {
            api.sendMessage(`§a[ThreadJS] Welcome, ${player.name}!`);
        });

        api.onPlayerLeave(player => {
            api.log(`[events-demo] ${player.name} left the server.`);
        });

        api.onChatMessage((message, player) => {
            if (message.startsWith("!shout ")) {
                const rest = message.substring("!shout ".length);
                api.sendMessage(`§e[SHOUT] ${player.name}: ${rest.toUpperCase()}`);
            }
        });

        api.onBlockBreak(event => {
            // event: BlockEvent (playerName, blockId, x, y, z, dimensionId)
            api.log(`[BlockBreak] ${event.playerName} broke ${event.blockId} at ${event.x},${event.y},${event.z}`);
        });

        api.onBlockPlace(event => {
            api.log(`[BlockPlace] ${event.playerName} placed ${event.blockId} at ${event.x},${event.y},${event.z}`);
        });

        api.onUseBlock(event => {
            api.log(`[UseBlock] ${event.playerName} used block ${event.blockId} at ${event.x},${event.y},${event.z} with ${event.hand}`);
        });

        api.onUseItem(event => {
            api.log(`[UseItem] ${event.playerName} used ${event.itemId} x${event.itemCount} in ${event.dimensionId}`);
        });

        api.onAttackEntity(event => {
            api.log(`[AttackEntity] ${event.playerName} attacked ${event.targetType} (${event.targetUuid}) in ${event.dimensionId}`);
        });

        api.onEntityDamage(event => {
            api.log(`[EntityDamage] ${event.victimType} took ${event.amount} by ${event.sourceType} in ${event.dimensionId}`);
        });

        api.onEntityDeath(event => {
            api.log(`[EntityDeath] ${event.victimName} was killed by ${event.killedBy}`);
        });

        api.log("[events-demo] All event hooks registered.");
    }
});
