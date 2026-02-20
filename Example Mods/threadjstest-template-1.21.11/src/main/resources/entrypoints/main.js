// ============================================================================
// ThreadJS Sample Mod — Comprehensive JavaScript Minecraft Mod for 1.21.11
// ============================================================================
//
// This mod demonstrates everything you can do with ThreadJS:
//
//   1.  Importing Java & Minecraft classes (Java.type)
//   2.  Implementing Java interfaces (Java.extend)
//   3.  Event listeners (player join/leave, tick, server lifecycle)
//   4.  Custom commands with arguments (Brigadier)
//   5.  Rich text with colors
//   6.  Sounds & particles
//   7.  Player inventory manipulation
//   8.  World interaction (get/set blocks, explosions)
//   9.  Scheduled / delayed tasks via tick counting
//   10. Teleportation
//   11. Item inspection (data components)
//   12. Using Java collections & data structures
//   13. Debugger support (place `debugger;` anywhere to break)
//   14. Action bar messages
//   15. Homes & warps (stored server-side)
//   16. Status effects (with validation)
//   17. Weather control
//   18. Daily reward cooldowns
//   19. Tab-completion / suggestion providers (player names, gamemode presets)
//   20. Player health/hunger manipulation
//   21. World time control
//   22. Distance calculation between players
//
// IMPORTANT: Minecraft classes use Yarn mapping names in dev environment.
//   - Text, not Component
//   - sendMessage, not sendSystemMessage
//   - Formatting, not ChatFormatting
//   - ServerWorld, not ServerLevel
//
// ============================================================================



// ── Working with Java objects ───────────────────────────────────────────────
//
// Use wrap() on Java objects to make ALL methods work seamlessly, including
// inherited ones that GraalJS can't normally resolve:
//
//   var player = handler.getPlayer();
//   player.getX()          // just works — inherited from Entity
//   player.getName()       // just works — inherited from PlayerEntity
//   player.sendMessage()   // just works — direct method
//   player.giveItemStack() // just works — direct method
//
// wrap() returns a JS Proxy that tries direct access first, then falls back
// to reflection automatically. You only need wrap() on objects whose inherited
// methods you want to call — typically player entities from event callbacks.
//

// ── 1. IMPORTING JAVA CLASSES ──────────────────────────────────────────────
// Java.type() loads any class visible to Fabric's classloader.

// Logging (SLF4J — always available)
var LoggerFactory = Java.type("org.slf4j.LoggerFactory");
var LOGGER = LoggerFactory.getLogger("threadjstest");

// ── Minecraft Core ──
var Text = Java.type("net.minecraft.text.Text");
var Formatting = Java.type("net.minecraft.util.Formatting");
var Identifier = Java.type("net.minecraft.util.Identifier");
var SoundEvents = Java.type("net.minecraft.sound.SoundEvents");
var SoundCategory = Java.type("net.minecraft.sound.SoundCategory");
var ParticleTypes = Java.type("net.minecraft.particle.ParticleTypes");
var Items = Java.type("net.minecraft.item.Items");
var ItemStack = Java.type("net.minecraft.item.ItemStack");
var Blocks = Java.type("net.minecraft.block.Blocks");
var BlockPos = Java.type("net.minecraft.util.math.BlockPos");
var StatusEffectInstance = Java.type("net.minecraft.entity.effect.StatusEffectInstance");
var Registries = Java.type("net.minecraft.registry.Registries");

// ── Commands (Brigadier) ──
var CommandManager = Java.type("net.minecraft.server.command.CommandManager");
var StringArgumentType = Java.type("com.mojang.brigadier.arguments.StringArgumentType");
var IntegerArgumentType = Java.type("com.mojang.brigadier.arguments.IntegerArgumentType");
var FloatArgumentType = Java.type("com.mojang.brigadier.arguments.FloatArgumentType");
var CommandSource = Java.type("net.minecraft.command.CommandSource");
var GameMode = Java.type("net.minecraft.world.GameMode");

// ── Server types ──
var ServerWorld = Java.type("net.minecraft.server.world.ServerWorld");

// ── Fabric API Events ──
var ServerPlayConnectionEvents = Java.type("net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents");
var ServerTickEvents = Java.type("net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents");
var ServerLifecycleEvents = Java.type("net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents");
var CommandRegistrationCallback = Java.type("net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback");

// ── Java Utility ──
var HashMap = Java.type("java.util.HashMap");
var ArrayList = Java.type("java.util.ArrayList");
var Collections = Java.type("java.util.Collections");
var Random = Java.type("java.util.Random");
var System = Java.type("java.lang.System");
var Math = Java.type("java.lang.Math");


// ── 2. JAVA.EXTEND — Implementing Java Interfaces ─────────────────────────

var JoinCallback = Java.extend(
    Java.type("net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents.Join")
);
var DisconnectCallback = Java.extend(
    Java.type("net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents.Disconnect")
);
var EndTickCallback = Java.extend(
    Java.type("net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents.EndTick")
);
var CommandRegCallback = Java.extend(
    Java.type("net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback")
);
var ServerStartedCallback = Java.extend(
    Java.type("net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents.ServerStarted")
);


// ── 3. MOD STATE ───────────────────────────────────────────────────────────

var random = new Random();
var tickCounter = 0;
var playerData = new HashMap();
var scheduledTasks = new ArrayList();
var homeData = new HashMap();
var warpData = new HashMap();
var dailyClaims = new HashMap();
var DAILY_COOLDOWN_MS = 5 * 60 * 1000;

function scheduleTask(delayTicks, action) {
    scheduledTasks.add({ tickTarget: tickCounter + delayTicks, action: action });
}

function broadcast(server, text) {
    var players = server.getPlayerManager().getPlayerList();
    for (var i = 0; i < players.size(); i++) {
        players.get(i).sendMessage(text);
    }
}

function colorText(msg, color) {
    return Text.literal(msg).formatted(color);
}

function formatDurationMs(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    if (minutes > 0) return minutes + "m " + seconds + "s";
    return seconds + "s";
}

function getStatusEffectByName(name) {
    var id = name.indexOf(":") >= 0 ? new Identifier(name) : new Identifier("minecraft", name);
    return Registries.STATUS_EFFECT.get(id);
}

var welcomeMessages = [
    "Welcome to the server, {name}!",
    "Look who's here \u2014 {name}!",
    "A wild {name} appeared!",
    "{name} has joined the adventure!",
    "Everyone welcome {name}!"
];


// ============================================================================
// \u2500\u2500 4. ENTRYPOINT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// ============================================================================

module.exports = {
    onInitialize: function() {
        LOGGER.info("=== ThreadJS Sample Mod Initializing ===");

        // ── EVENT: Server Started ────────────────────────────────────
        ServerLifecycleEvents.SERVER_STARTED.register(new ServerStartedCallback({
            onServerStarted: function(server) {
                LOGGER.info("=== ThreadJS Sample Mod is ready! ===");
                LOGGER.info("  Try: /js help");
            }
        }));

        // ── EVENT: Player Join ───────────────────────────────────────
        ServerPlayConnectionEvents.JOIN.register(new JoinCallback({
            onPlayReady: function(handler, sender, server) {
                var player = handler.getPlayer();
                var name = player.getName().getString();
                var uuid = player.getUuid().toString();

                playerData.put(uuid, {
                    name: name,
                    joinedAt: System.currentTimeMillis()
                });

                var template = welcomeMessages[random.nextInt(welcomeMessages.length)];
                var msg = template.replace("{name}", name);

                broadcast(server,
                    Text.literal("\u2726 ").formatted(Formatting.GOLD)
                        .append(Text.literal(msg).formatted(Formatting.YELLOW))
                );

                var world = server.getOverworld();
                world.playSound(
                    player, player.getX(), player.getY(), player.getZ(),
                    SoundEvents.ENTITY_PLAYER_LEVELUP,
                    SoundCategory.PLAYERS
                );

                scheduleTask(20, function() {
                    try {
                        server.getOverworld().spawnParticles(
                            ParticleTypes.TOTEM_OF_UNDYING,
                            player.getX(), player.getY() + 1.0, player.getZ(),
                            30, 1.0, 1.0, 1.0, 0.1
                        );
                    } catch (e) {}
                });

                scheduleTask(100, function() {
                    try {
                        player.sendMessage(
                            Text.literal("\uD83D\uDCA1 Tip: ").formatted(Formatting.AQUA)
                                .append(Text.literal("Try /js help for sample commands!")
                                    .formatted(Formatting.GRAY))
                        );
                    } catch (e) {}
                });

                LOGGER.info("{} joined", name);
            }
        }));

        // ── EVENT: Player Disconnect ─────────────────────────────────
        ServerPlayConnectionEvents.DISCONNECT.register(new DisconnectCallback({
            onPlayDisconnect: function(handler, server) {
                var player = handler.getPlayer();
                var uuid = player.getUuid().toString();
                var data = playerData.get(uuid);

                if (data !== null) {
                    var elapsed = System.currentTimeMillis() - data.joinedAt;
                    var minutes = Math.floor(elapsed / 60000);
                    LOGGER.info("{} left after {} min", data.name, minutes);
                }
                playerData.remove(uuid);
            }
        }));

        // ── EVENT: Server Tick ───────────────────────────────────────
        ServerTickEvents.END_SERVER_TICK.register(new EndTickCallback({
            onEndTick: function(server) {
                tickCounter++;

                var i = 0;
                while (i < scheduledTasks.size()) {
                    var task = scheduledTasks.get(i);
                    if (tickCounter >= task.tickTarget) {
                        try { task.action(); } catch (e) {
                            LOGGER.warn("Scheduled task error: {}", String(e));
                        }
                        scheduledTasks.remove(i);
                    } else {
                        i++;
                    }
                }

                if (tickCounter % 1200 === 0) {
                    var players = server.getPlayerManager().getPlayerList();
                    var world = server.getOverworld();
                    for (var j = 0; j < players.size(); j++) {
                        var p = players.get(j);
                        world.spawnParticles(
                            ParticleTypes.END_ROD,
                            p.getX(), p.getY() + 2.0, p.getZ(),
                            5, 0.3, 0.3, 0.3, 0.01
                        );
                    }
                }
            }
        }));

        // ── COMMANDS ─────────────────────────────────────────────────
        CommandRegistrationCallback.EVENT.register(new CommandRegCallback({
            register: function(dispatcher, registryAccess, environment) {

                var root = CommandManager.literal("js");

                // /js help
                root.then(CommandManager.literal("help").executes(function(ctx) {
                    var lines = [
                        "\u00a76\u2550\u2550 ThreadJS Sample Commands \u2550\u2550",
                        "\u00a7e/js greet <player>\u00a77 \u2014 Greet a player (tab-complete!)",
                        "\u00a7e/js roll [sides]\u00a77 \u2014 Roll dice (default d20)",
                        "\u00a7e/js playtime\u00a77 \u2014 Session playtime",
                        "\u00a7e/js kit\u00a77 \u2014 Get a diamond starter kit",
                        "\u00a7e/js tp <x> <y> <z>\u00a77 \u2014 Teleport",
                        "\u00a7e/js boom\u00a77 \u2014 Cosmetic explosion",
                        "\u00a7e/js particles\u00a77 \u2014 Particle ring",
                        "\u00a7e/js hand\u00a77 \u2014 Inspect held item",
                        "\u00a7e/js top\u00a77 \u2014 Teleport to surface",
                        "\u00a7e/js heal [player]\u00a77 \u2014 Restore health & hunger",
                        "\u00a7e/js gamemode <mode>\u00a77 \u2014 Switch gamemode (tab-complete!)",
                        "\u00a7e/js stack <n>\u00a77 \u2014 Set held item count",
                        "\u00a7e/js near\u00a77 \u2014 List nearby players + distance",
                        "\u00a7e/js time set <preset>\u00a77 \u2014 Set world time",
                        "\u00a7e/js time add <ticks>\u00a77 \u2014 Advance world time",
                            "\u00a7e/js actionbar <text>\u00a77 \u2014 Action bar message",
                            "\u00a7e/js home set|go|info|clear\u00a77 \u2014 Personal home",
                            "\u00a7e/js warp set|go|list|remove\u00a77 \u2014 Global warps",
                            "\u00a7e/js effect add|clear\u00a77 \u2014 Potion effects",
                            "\u00a7e/js weather set <mode>\u00a77 \u2014 Set weather",
                            "\u00a7e/js daily\u00a77 \u2014 Timed reward",
                        "\u00a76\u2500\u2500 Standalone Commands \u2500\u2500",
                        "\u00a7e/kit\u00a77 \u2014 Get an iron starter kit (no prefix needed!)"
                    ];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        ctx.getSource().sendFeedback(function() {
                            return Text.literal(line);
                        }, false);
                    }
                    return 1;
                }));

                // /js greet <player> — with tab-completion
                root.then(CommandManager.literal("greet")
                    .then(CommandManager.argument("target", StringArgumentType.word())
                        .suggests(function(ctx, builder) {
                            var playerNames = ctx.getSource().getServer().getPlayerNames();
                            return CommandSource.suggestMatching(playerNames, builder);
                        })
                        .executes(function(ctx) {
                            var source = ctx.getSource();
                            var targetName = StringArgumentType.getString(ctx, "target");
                            var target = source.getServer().getPlayerManager().getPlayer(targetName);

                            if (target !== null) {
                                target.sendMessage(
                                    Text.literal("\uD83D\uDC4B ")
                                        .append(Text.literal(source.getName()).formatted(Formatting.AQUA))
                                        .append(Text.literal(" waves at you!").formatted(Formatting.WHITE))
                                );
                                source.sendFeedback(function() {
                                    return colorText("Greeted " + targetName + "!", Formatting.GREEN);
                                }, false);
                            } else {
                                source.sendError(colorText("Player not found: " + targetName, Formatting.RED));
                            }
                            return 1;
                        })
                    )
                );

                // /js roll [sides]
                root.then(CommandManager.literal("roll")
                    .then(CommandManager.argument("sides", IntegerArgumentType.integer(2, 100))
                        .executes(function(ctx) {
                            var sides = IntegerArgumentType.getInteger(ctx, "sides");
                            var result = random.nextInt(sides) + 1;
                            broadcast(ctx.getSource().getServer(),
                                Text.literal("\uD83C\uDFB2 " + ctx.getSource().getName() + " rolled ")
                                    .append(Text.literal(String(result)).formatted(Formatting.YELLOW, Formatting.BOLD))
                                    .append(Text.literal(" (d" + sides + ")").formatted(Formatting.GRAY))
                            );
                            return result;
                        })
                    )
                    .executes(function(ctx) {
                        var result = random.nextInt(20) + 1;
                        broadcast(ctx.getSource().getServer(),
                            Text.literal("\uD83C\uDFB2 " + ctx.getSource().getName() + " rolled ")
                                .append(Text.literal(String(result)).formatted(Formatting.YELLOW, Formatting.BOLD))
                                .append(Text.literal(" (d20)").formatted(Formatting.GRAY))
                        );
                        return result;
                    })
                );

                // /js playtime
                root.then(CommandManager.literal("playtime").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) {
                        ctx.getSource().sendError(Text.literal("Players only!"));
                        return 0;
                    }
                    var data = playerData.get(player.getUuid().toString());
                    if (data !== null) {
                        var elapsed = System.currentTimeMillis() - data.joinedAt;
                        var mins = Math.floor(elapsed / 60000);
                        var secs = Math.floor((elapsed % 60000) / 1000);
                        ctx.getSource().sendFeedback(function() {
                            return Text.literal("\u23F1 Online for ")
                                .append(Text.literal(mins + "m " + secs + "s").formatted(Formatting.GREEN));
                        }, false);
                    }
                    return 1;
                }));

                // /js kit — diamond tier
                root.then(CommandManager.literal("kit").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    player.giveItemStack(new ItemStack(Items.DIAMOND_SWORD, 1));
                    player.giveItemStack(new ItemStack(Items.DIAMOND_PICKAXE, 1));
                    player.giveItemStack(new ItemStack(Items.COOKED_BEEF, 32));
                    player.giveItemStack(new ItemStack(Items.TORCH, 64));
                    player.giveItemStack(new ItemStack(Items.OAK_PLANKS, 64));

                    var world = ctx.getSource().getServer().getOverworld();
                    world.playSound(
                        player, player.getX(), player.getY(), player.getZ(),
                        SoundEvents.ENTITY_ITEM_PICKUP,
                        SoundCategory.PLAYERS
                    );

                    ctx.getSource().sendFeedback(function() {
                        return colorText("\uD83C\uDF92 Starter kit received!", Formatting.GREEN);
                    }, false);
                    return 1;
                }));

                // /js tp <x> <y> <z>
                root.then(CommandManager.literal("tp")
                    .then(CommandManager.argument("x", FloatArgumentType.floatArg())
                        .then(CommandManager.argument("y", FloatArgumentType.floatArg())
                            .then(CommandManager.argument("z", FloatArgumentType.floatArg())
                                .executes(function(ctx) {
                                    var player = ctx.getSource().getPlayer();
                                    if (player === null) return 0;

                                    var x = FloatArgumentType.getFloat(ctx, "x");
                                    var y = FloatArgumentType.getFloat(ctx, "y");
                                    var z = FloatArgumentType.getFloat(ctx, "z");
                                    var world = ctx.getSource().getServer().getOverworld();

                                    player.teleport(world, x, y, z, Collections.EMPTY_SET, 0.0, 0.0, false);

                                    world.spawnParticles(ParticleTypes.PORTAL, x, y + 1.0, z, 50, 0.5, 1.0, 0.5, 0.1);

                                    ctx.getSource().sendFeedback(function() {
                                        return Text.literal("\u2708 Teleported to ")
                                            .append(colorText(x + ", " + y + ", " + z, Formatting.AQUA));
                                    }, false);
                                    return 1;
                                })
                            )
                        )
                    )
                );

                // /js boom
                root.then(CommandManager.literal("boom").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var world = ctx.getSource().getServer().getOverworld();
                    world.createExplosion(null, player.getX(), player.getY(), player.getZ(), 0.0, false, ServerWorld.ExplosionSourceType.NONE);
                    world.spawnParticles(ParticleTypes.EXPLOSION_EMITTER, player.getX(), player.getY() + 1.0, player.getZ(), 3, 1.0, 1.0, 1.0, 0.0);

                    ctx.getSource().sendFeedback(function() {
                        return Text.literal("\uD83D\uDCA5 Boom!").formatted(Formatting.RED, Formatting.BOLD);
                    }, false);
                    return 1;
                }));

                // /js particles
                root.then(CommandManager.literal("particles").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var world = ctx.getSource().getServer().getOverworld();
                    var types = [ParticleTypes.HEART, ParticleTypes.NOTE, ParticleTypes.FLAME, ParticleTypes.END_ROD, ParticleTypes.TOTEM_OF_UNDYING];

                    for (var i = 0; i < types.length; i++) {
                        var angle = (i / types.length) * 2.0 * Math.PI;
                        var px = player.getX() + Math.cos(angle) * 2.0;
                        var pz = player.getZ() + Math.sin(angle) * 2.0;
                        world.spawnParticles(types[i], px, player.getY() + 1.5, pz, 10, 0.2, 0.2, 0.2, 0.05);
                    }

                    ctx.getSource().sendFeedback(function() {
                        return colorText("\u2728 Particles spawned!", Formatting.LIGHT_PURPLE);
                    }, false);
                    return 1;
                }));

                // /js hand
                root.then(CommandManager.literal("hand").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var stack = player.getMainHandStack();
                    if (stack.isEmpty()) {
                        ctx.getSource().sendFeedback(function() {
                            return colorText("Your hand is empty!", Formatting.GRAY);
                        }, false);
                    } else {
                        var itemName = stack.getName().getString();
                        var count = stack.getCount();
                        var maxCount = stack.getMaxCount();
                        var damaged = stack.isDamaged();

                        ctx.getSource().sendFeedback(function() {
                            var text = Text.literal("\uD83D\uDD0D Holding: ").formatted(Formatting.WHITE)
                                .append(Text.literal(itemName).formatted(Formatting.AQUA))
                                .append(Text.literal(" x" + count + "/" + maxCount).formatted(Formatting.GRAY));
                            if (damaged) {
                                var dur = stack.getMaxDamage() - stack.getDamage();
                                text = text.append(Text.literal(" [" + dur + "/" + stack.getMaxDamage() + " dur]").formatted(Formatting.RED));
                            }
                            return text;
                        }, false);
                    }
                    return 1;
                }));

                // /js top
                root.then(CommandManager.literal("top").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var world = ctx.getSource().getServer().getOverworld();
                    var x = java.lang.Math.round(player.getX()) | 0;
                    var z = java.lang.Math.round(player.getZ()) | 0;

                    var topY = world.getTopY() - 1;
                    for (var y = topY; y > world.getBottomY(); y--) {
                        var state = world.getBlockState(new BlockPos(x, y, z));
                        if (!state.isAir()) {
                            topY = y + 1;
                            break;
                        }
                    }

                    player.teleport(world, x + 0.5, topY, z + 0.5, Collections.EMPTY_SET, 0.0, 0.0, false);

                    ctx.getSource().sendFeedback(function() {
                        return colorText("\u2B06 Teleported to surface (y=" + topY + ")", Formatting.GREEN);
                    }, false);
                    return 1;
                }));

                // /js heal [player]
                root.then(CommandManager.literal("heal")
                    .then(CommandManager.argument("target", StringArgumentType.word())
                        .suggests(function(ctx, builder) {
                            return CommandSource.suggestMatching(ctx.getSource().getServer().getPlayerNames(), builder);
                        })
                        .executes(function(ctx) {
                            var targetName = StringArgumentType.getString(ctx, "target");
                            var target = ctx.getSource().getServer().getPlayerManager().getPlayer(targetName);
                            if (target === null) {
                                ctx.getSource().sendError(colorText("Player not found: " + targetName, Formatting.RED));
                                return 0;
                            }
                            target.setHealth(target.getMaxHealth());
                            target.getHungerManager().setFoodLevel(20);
                            target.setFireTicks(0);

                            var world = ctx.getSource().getServer().getOverworld();
                            world.spawnParticles(ParticleTypes.HEART, target.getX(), target.getY() + 2.0, target.getZ(), 10, 0.5, 0.5, 0.5, 0.0);

                            ctx.getSource().sendFeedback(function() {
                                return colorText("\u2764 Healed " + targetName + "!", Formatting.GREEN);
                            }, false);
                            return 1;
                        })
                    )
                    .executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        player.setHealth(player.getMaxHealth());
                        player.getHungerManager().setFoodLevel(20);
                        player.setFireTicks(0);

                        var world = ctx.getSource().getServer().getOverworld();
                        world.spawnParticles(ParticleTypes.HEART, player.getX(), player.getY() + 2.0, player.getZ(), 10, 0.5, 0.5, 0.5, 0.0);

                        ctx.getSource().sendFeedback(function() {
                            return colorText("\u2764 Healed!", Formatting.GREEN);
                        }, false);
                        return 1;
                    })
                );

                // /js gamemode <mode> — with tab-completion
                root.then(CommandManager.literal("gamemode")
                    .then(CommandManager.argument("mode", StringArgumentType.word())
                        .suggests(function(ctx, builder) {
                            var modes = new ArrayList();
                            modes.add("survival"); modes.add("creative");
                            modes.add("adventure"); modes.add("spectator");
                            return CommandSource.suggestMatching(modes, builder);
                        })
                        .executes(function(ctx) {
                            var player = ctx.getSource().getPlayer();
                            if (player === null) return 0;

                            var modeName = StringArgumentType.getString(ctx, "mode");
                            var mode = GameMode.byName(modeName, null);
                            if (mode === null) {
                                ctx.getSource().sendError(colorText("Unknown mode: " + modeName, Formatting.RED));
                                return 0;
                            }

                            player.changeGameMode(mode);
                            ctx.getSource().sendFeedback(function() {
                                return Text.literal("\uD83C\uDFAE Game mode set to ")
                                    .append(colorText(modeName, Formatting.AQUA));
                            }, false);
                            return 1;
                        })
                    )
                );

                // /js stack <amount>
                root.then(CommandManager.literal("stack")
                    .then(CommandManager.argument("amount", IntegerArgumentType.integer(1, 64))
                        .executes(function(ctx) {
                            var player = ctx.getSource().getPlayer();
                            if (player === null) return 0;

                            var stack = player.getMainHandStack();
                            if (stack.isEmpty()) {
                                ctx.getSource().sendError(colorText("Hold an item first!", Formatting.RED));
                                return 0;
                            }

                            var amount = IntegerArgumentType.getInteger(ctx, "amount");
                            stack.setCount(amount);

                            ctx.getSource().sendFeedback(function() {
                                return Text.literal("\uD83D\uDCE6 Set stack to ")
                                    .append(colorText(String(amount), Formatting.YELLOW))
                                    .append(Text.literal(" \u00d7 ").formatted(Formatting.GRAY))
                                    .append(Text.literal(stack.getName().getString()).formatted(Formatting.AQUA));
                            }, false);
                            return 1;
                        })
                    )
                );

                // /js near
                root.then(CommandManager.literal("near").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var px = player.getX();
                    var py = player.getY();
                    var pz = player.getZ();
                    var myUuid = player.getUuid().toString();

                    var players = ctx.getSource().getServer().getPlayerManager().getPlayerList();
                    var nearby = [];

                    for (var i = 0; i < players.size(); i++) {
                        var other = players.get(i);
                        if (other.getUuid().toString() === myUuid) continue;

                        var dx = other.getX() - px;
                        var dy = other.getY() - py;
                        var dz = other.getZ() - pz;
                        nearby.push({ name: other.getName().getString(), dist: Math.sqrt(dx*dx + dy*dy + dz*dz) });
                    }

                    if (nearby.length === 0) {
                        ctx.getSource().sendFeedback(function() {
                            return colorText("No other players online!", Formatting.GRAY);
                        }, false);
                    } else {
                        nearby.sort(function(a, b) { return a.dist - b.dist; });

                        ctx.getSource().sendFeedback(function() {
                            return Text.literal("\uD83D\uDCE1 Nearby players:").formatted(Formatting.GOLD);
                        }, false);

                        for (var j = 0; j < nearby.length && j < 10; j++) {
                            (function(name, distance) {
                                ctx.getSource().sendFeedback(function() {
                                    return Text.literal("  ")
                                        .append(Text.literal(name).formatted(Formatting.AQUA))
                                        .append(Text.literal(" \u2014 " + distance + "m away").formatted(Formatting.GRAY));
                                }, false);
                            })(nearby[j].name, Math.round(nearby[j].dist));
                        }
                    }
                    return 1;
                }));

                // /js time set|add
                root.then(CommandManager.literal("time")
                    .then(CommandManager.literal("set")
                        .then(CommandManager.argument("value", StringArgumentType.word())
                            .suggests(function(ctx, builder) {
                                var presets = new ArrayList();
                                presets.add("day"); presets.add("noon");
                                presets.add("night"); presets.add("midnight");
                                return CommandSource.suggestMatching(presets, builder);
                            })
                            .executes(function(ctx) {
                                var value = StringArgumentType.getString(ctx, "value");
                                var world = ctx.getSource().getServer().getOverworld();
                                var timeMap = { day: 1000, noon: 6000, night: 13000, midnight: 18000 };

                                var ticks = timeMap[value];
                                if (ticks === undefined) {
                                    ticks = parseInt(value);
                                    if (isNaN(ticks)) {
                                        ctx.getSource().sendError(colorText("Unknown time: " + value, Formatting.RED));
                                        return 0;
                                    }
                                }

                                world.setTimeOfDay(ticks);
                                ctx.getSource().sendFeedback(function() {
                                    return Text.literal("\uD83D\uDD50 Time set to ")
                                        .append(colorText(value + " (" + ticks + " ticks)", Formatting.AQUA));
                                }, false);
                                return 1;
                            })
                        )
                    )
                    .then(CommandManager.literal("add")
                        .then(CommandManager.argument("ticks", IntegerArgumentType.integer(1))
                            .executes(function(ctx) {
                                var ticks = IntegerArgumentType.getInteger(ctx, "ticks");
                                var world = ctx.getSource().getServer().getOverworld();
                                var newTime = world.getTimeOfDay() + ticks;
                                world.setTimeOfDay(newTime);
                                ctx.getSource().sendFeedback(function() {
                                    return Text.literal("\uD83D\uDD50 Added ")
                                        .append(colorText(String(ticks), Formatting.YELLOW))
                                        .append(Text.literal(" ticks (now " + newTime + ")").formatted(Formatting.GRAY));
                                }, false);
                                return 1;
                            })
                        )
                    )
                );

                // /js actionbar <text>
                root.then(CommandManager.literal("actionbar")
                    .then(CommandManager.argument("text", StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var player = ctx.getSource().getPlayer();
                            if (player === null) return 0;

                            var text = StringArgumentType.getString(ctx, "text");
                            player.sendMessage(Text.literal(text).formatted(Formatting.GOLD), true);
                            return 1;
                        })
                    )
                );

                // /js home set|go|info|clear
                root.then(CommandManager.literal("home")
                    .then(CommandManager.literal("set").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        var uuid = player.getUuid().toString();
                        var pos = new BlockPos(
                            java.lang.Math.floor(player.getX()),
                            java.lang.Math.floor(player.getY()),
                            java.lang.Math.floor(player.getZ())
                        );
                        homeData.put(uuid, pos);

                        ctx.getSource().sendFeedback(function() {
                            return colorText("🏠 Home set at " + pos.getX() + ", " + pos.getY() + ", " + pos.getZ(), Formatting.GREEN);
                        }, false);
                        return 1;
                    }))
                    .then(CommandManager.literal("go").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        var uuid = player.getUuid().toString();
                        var pos = homeData.get(uuid);
                        if (pos === null) {
                            ctx.getSource().sendError(colorText("No home set. Use /js home set first.", Formatting.RED));
                            return 0;
                        }

                        var world = ctx.getSource().getServer().getOverworld();
                        player.teleport(world, pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, Collections.EMPTY_SET, 0.0, 0.0, false);
                        ctx.getSource().sendFeedback(function() {
                            return colorText("🏠 Teleported home!", Formatting.GREEN);
                        }, false);
                        return 1;
                    }))
                    .then(CommandManager.literal("info").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        var uuid = player.getUuid().toString();
                        var pos = homeData.get(uuid);
                        if (pos === null) {
                            ctx.getSource().sendError(colorText("No home set.", Formatting.RED));
                            return 0;
                        }

                        ctx.getSource().sendFeedback(function() {
                            return Text.literal("🏠 Home: ")
                                .append(colorText(pos.getX() + ", " + pos.getY() + ", " + pos.getZ(), Formatting.AQUA));
                        }, false);
                        return 1;
                    }))
                    .then(CommandManager.literal("clear").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        var uuid = player.getUuid().toString();
                        homeData.remove(uuid);
                        ctx.getSource().sendFeedback(function() {
                            return colorText("🏠 Home cleared.", Formatting.YELLOW);
                        }, false);
                        return 1;
                    }))
                );

                // /js warp set|go|list|remove
                root.then(CommandManager.literal("warp")
                    .then(CommandManager.literal("set")
                        .then(CommandManager.argument("name", StringArgumentType.word())
                            .executes(function(ctx) {
                                var player = ctx.getSource().getPlayer();
                                if (player === null) return 0;

                                var name = StringArgumentType.getString(ctx, "name").toLowerCase();
                                var pos = new BlockPos(
                                    java.lang.Math.floor(player.getX()),
                                    java.lang.Math.floor(player.getY()),
                                    java.lang.Math.floor(player.getZ())
                                );
                                warpData.put(name, pos);
                                ctx.getSource().sendFeedback(function() {
                                    return colorText("🧭 Warp '" + name + "' set at " + pos.getX() + ", " + pos.getY() + ", " + pos.getZ(), Formatting.GREEN);
                                }, false);
                                return 1;
                            })
                        )
                    )
                    .then(CommandManager.literal("go")
                        .then(CommandManager.argument("name", StringArgumentType.word())
                            .suggests(function(ctx, builder) {
                                var names = warpData.keySet().toArray();
                                return CommandSource.suggestMatching(names, builder);
                            })
                            .executes(function(ctx) {
                                var player = ctx.getSource().getPlayer();
                                if (player === null) return 0;

                                var name = StringArgumentType.getString(ctx, "name").toLowerCase();
                                var pos = warpData.get(name);
                                if (pos === null) {
                                    ctx.getSource().sendError(colorText("Unknown warp: " + name, Formatting.RED));
                                    return 0;
                                }

                                var world = ctx.getSource().getServer().getOverworld();
                                player.teleport(world, pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, Collections.EMPTY_SET, 0.0, 0.0, false);
                                ctx.getSource().sendFeedback(function() {
                                    return colorText("🧭 Warped to " + name + "!", Formatting.GREEN);
                                }, false);
                                return 1;
                            })
                        )
                    )
                    .then(CommandManager.literal("list").executes(function(ctx) {
                        if (warpData.isEmpty()) {
                            ctx.getSource().sendFeedback(function() {
                                return colorText("No warps set.", Formatting.GRAY);
                            }, false);
                            return 1;
                        }

                        var names = warpData.keySet().toArray();
                        ctx.getSource().sendFeedback(function() {
                            return Text.literal("🧭 Warps: ").formatted(Formatting.GOLD);
                        }, false);

                        for (var i = 0; i < names.length; i++) {
                            (function(n) {
                                ctx.getSource().sendFeedback(function() {
                                    return Text.literal("  • ").formatted(Formatting.GRAY)
                                        .append(Text.literal(String(n)).formatted(Formatting.AQUA));
                                }, false);
                            })(names[i]);
                        }
                        return 1;
                    }))
                    .then(CommandManager.literal("remove")
                        .then(CommandManager.argument("name", StringArgumentType.word())
                            .suggests(function(ctx, builder) {
                                var names = warpData.keySet().toArray();
                                return CommandSource.suggestMatching(names, builder);
                            })
                            .executes(function(ctx) {
                                var name = StringArgumentType.getString(ctx, "name").toLowerCase();
                                if (warpData.remove(name) === null) {
                                    ctx.getSource().sendError(colorText("Unknown warp: " + name, Formatting.RED));
                                    return 0;
                                }
                                ctx.getSource().sendFeedback(function() {
                                    return colorText("🧭 Removed warp " + name + ".", Formatting.YELLOW);
                                }, false);
                                return 1;
                            })
                        )
                    )
                );

                // /js effect add|clear
                root.then(CommandManager.literal("effect")
                    .then(CommandManager.literal("add")
                        .then(CommandManager.argument("effect", StringArgumentType.word())
                            .suggests(function(ctx, builder) {
                                var effects = ["speed", "strength", "haste", "jump_boost", "night_vision", "regeneration", "resistance", "glowing", "water_breathing"];
                                return CommandSource.suggestMatching(effects, builder);
                            })
                            .then(CommandManager.argument("seconds", IntegerArgumentType.integer(1, 3600))
                                .then(CommandManager.argument("level", IntegerArgumentType.integer(1, 5))
                                    .executes(function(ctx) {
                                        var player = ctx.getSource().getPlayer();
                                        if (player === null) return 0;

                                        var effectName = StringArgumentType.getString(ctx, "effect");
                                        var effect = getStatusEffectByName(effectName);
                                        if (effect === null) {
                                            ctx.getSource().sendError(colorText("Unknown effect: " + effectName, Formatting.RED));
                                            return 0;
                                        }

                                        var seconds = IntegerArgumentType.getInteger(ctx, "seconds");
                                        var level = IntegerArgumentType.getInteger(ctx, "level");
                                        player.addStatusEffect(new StatusEffectInstance(effect, seconds * 20, level - 1));

                                        ctx.getSource().sendFeedback(function() {
                                            return colorText("✨ Effect applied: " + effectName + " " + level + " for " + seconds + "s", Formatting.GREEN);
                                        }, false);
                                        return 1;
                                    })
                                )
                                .executes(function(ctx) {
                                    var player = ctx.getSource().getPlayer();
                                    if (player === null) return 0;

                                    var effectName = StringArgumentType.getString(ctx, "effect");
                                    var effect = getStatusEffectByName(effectName);
                                    if (effect === null) {
                                        ctx.getSource().sendError(colorText("Unknown effect: " + effectName, Formatting.RED));
                                        return 0;
                                    }

                                    var seconds = IntegerArgumentType.getInteger(ctx, "seconds");
                                    player.addStatusEffect(new StatusEffectInstance(effect, seconds * 20, 0));

                                    ctx.getSource().sendFeedback(function() {
                                        return colorText("✨ Effect applied: " + effectName + " 1 for " + seconds + "s", Formatting.GREEN);
                                    }, false);
                                    return 1;
                                })
                            )
                        )
                    )
                    .then(CommandManager.literal("clear").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        player.clearStatusEffects();
                        ctx.getSource().sendFeedback(function() {
                            return colorText("✨ Cleared all effects.", Formatting.YELLOW);
                        }, false);
                        return 1;
                    }))
                );

                // /js weather set <clear|rain|thunder>
                root.then(CommandManager.literal("weather")
                    .then(CommandManager.literal("set")
                        .then(CommandManager.argument("mode", StringArgumentType.word())
                            .suggests(function(ctx, builder) {
                                var modes = ["clear", "rain", "thunder"];
                                return CommandSource.suggestMatching(modes, builder);
                            })
                            .executes(function(ctx) {
                                var mode = StringArgumentType.getString(ctx, "mode");
                                var world = ctx.getSource().getServer().getOverworld();

                                if (mode === "clear") {
                                    world.setWeather(6000, 0, false, false);
                                } else if (mode === "rain") {
                                    world.setWeather(0, 6000, true, false);
                                } else if (mode === "thunder") {
                                    world.setWeather(0, 6000, true, true);
                                } else {
                                    ctx.getSource().sendError(colorText("Unknown weather: " + mode, Formatting.RED));
                                    return 0;
                                }

                                ctx.getSource().sendFeedback(function() {
                                    return colorText("⛅ Weather set to " + mode + ".", Formatting.AQUA);
                                }, false);
                                return 1;
                            })
                        )
                    )
                );

                // /js daily
                root.then(CommandManager.literal("daily").executes(function(ctx) {
                    var player = ctx.getSource().getPlayer();
                    if (player === null) return 0;

                    var uuid = player.getUuid().toString();
                    var last = dailyClaims.get(uuid);
                    var now = System.currentTimeMillis();

                    if (last !== null) {
                        var elapsed = now - last;
                        if (elapsed < DAILY_COOLDOWN_MS) {
                            var remaining = DAILY_COOLDOWN_MS - elapsed;
                            ctx.getSource().sendFeedback(function() {
                                return colorText("🎁 Daily reward available in " + formatDurationMs(remaining) + ".", Formatting.GRAY);
                            }, false);
                            return 0;
                        }
                    }

                    dailyClaims.put(uuid, now);
                    player.giveItemStack(new ItemStack(Items.EMERALD, 3));
                    player.giveItemStack(new ItemStack(Items.GOLDEN_APPLE, 1));

                    ctx.getSource().sendFeedback(function() {
                        return colorText("🎁 Daily reward claimed!", Formatting.GREEN);
                    }, false);
                    return 1;
                }));

                // Register the /js command tree
                dispatcher.register(root);
                LOGGER.info("Registered /js command tree");

                // ── STANDALONE COMMANDS ───────────────────────────────
                // No /js prefix needed — just dispatcher.register(CommandManager.literal("name"))

                // /kit
                dispatcher.register(
                    CommandManager.literal("kit").executes(function(ctx) {
                        var player = ctx.getSource().getPlayer();
                        if (player === null) return 0;

                        player.giveItemStack(new ItemStack(Items.IRON_SWORD, 1));
                        player.giveItemStack(new ItemStack(Items.IRON_PICKAXE, 1));
                        player.giveItemStack(new ItemStack(Items.IRON_AXE, 1));
                        player.giveItemStack(new ItemStack(Items.BREAD, 16));
                        player.giveItemStack(new ItemStack(Items.TORCH, 32));
                        player.giveItemStack(new ItemStack(Items.OAK_PLANKS, 64));
                        player.giveItemStack(new ItemStack(Items.CRAFTING_TABLE, 1));
                        player.giveItemStack(new ItemStack(Items.FURNACE, 1));

                        var world = ctx.getSource().getServer().getOverworld();
                        world.playSound(player, player.getX(), player.getY(), player.getZ(), SoundEvents.ENTITY_ITEM_PICKUP, SoundCategory.PLAYERS);
                        world.spawnParticles(ParticleTypes.HAPPY_VILLAGER, player.getX(), player.getY() + 1.0, player.getZ(), 15, 0.5, 0.5, 0.5, 0.0);

                        ctx.getSource().sendFeedback(function() {
                            return Text.literal("\uD83C\uDF92 ").append(Text.literal("Starter kit received!").formatted(Formatting.GREEN));
                        }, false);
                        return 1;
                    })
                );
                LOGGER.info("Registered /kit command");
            }
        }));

        LOGGER.info("=== ThreadJS Sample Mod \u2014 all events registered ===");
    }
};