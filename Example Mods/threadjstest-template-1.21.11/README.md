# ThreadJS Showcase Mod (1.21.11)

This mod is a **feature-rich showcase** for ThreadJS — a JavaScript adapter that lets you build Fabric mods entirely in JS. It demonstrates core Minecraft/Fabric APIs, ThreadJS interop, and a growing set of gameplay utilities.

## Requirements

- Java 21
- Fabric Loader 0.18.4+
- Minecraft 1.21.11
- Fabric API (already in `build.gradle`)

## Run (Dev)

```fish
cd /home/niels/Documents/code/threadjstest-template-1.21.11
./gradlew runClient
```

## In‑Depth Tutorial: Writing a Mod (Java vs JS)

This section walks through the **same mod idea** in two ways:

- **Left:** Traditional Java Fabric mod
- **Right:** ThreadJS JavaScript mod

We’ll build a tiny “Hello + Join Message + Command” mod so you can compare every layer.

---

### 1) Project Structure

**Java Fabric**

```
src/main/java/com/example/hellomod/HelloMod.java
src/main/resources/fabric.mod.json
build.gradle
```

**ThreadJS (JS)**

```
src/main/resources/entrypoints/main.js
src/main/resources/fabric.mod.json
build.gradle
```

---

### 2) Mod Metadata (`fabric.mod.json`)

Both mods declare an entrypoint. Java points to a class; JS points to `entrypoints/main.js` and uses the ThreadJS adapter.

| Java Fabric | ThreadJS (JS) |
|---|---|
|```json
{
	"schemaVersion": 1,
	"id": "hellomod",
	"version": "1.0.0",
	"name": "Hello Mod",
	"entrypoints": {
		"main": [
			"com.example.hellomod.HelloMod"
		]
	},
	"depends": {
		"fabricloader": ">=0.18.4",
		"minecraft": "~1.21.11",
		"fabric-api": "*"
	}
}
```
|```json
{
	"schemaVersion": 1,
	"id": "hellomod",
	"version": "1.0.0",
	"name": "Hello Mod (JS)",
	"languageAdapters": {
		"javascript": "lynk.threadjs.JavaScriptAdapter"
	},
	"entrypoints": {
		"main": [
			"entrypoints/main.js"
		]
	},
	"depends": {
		"fabricloader": ">=0.18.4",
		"minecraft": "~1.21.11",
		"fabric-api": "*"
	}
}
```
|

---

### 3) Entrypoint / Initialization

Both versions implement `ModInitializer` logic.

| Java Fabric | ThreadJS (JS) |
|---|---|
|```java
package com.example.hellomod;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HelloMod implements ModInitializer {
		public static final Logger LOGGER = LoggerFactory.getLogger("hellomod");

		@Override
		public void onInitialize() {
				LOGGER.info("Hello from Java Fabric!");
		}
}
```
|```javascript
var LoggerFactory = Java.type("org.slf4j.LoggerFactory");
var LOGGER = LoggerFactory.getLogger("hellomod");

module.exports = {
	onInitialize: function() {
		LOGGER.info("Hello from ThreadJS!");
	}
};
```
|

---

### 4) Player Join Message (Event Listener)

Both use Fabric’s `ServerPlayConnectionEvents.JOIN` event. The JS version uses `Java.extend` to implement the callback interface.

| Java Fabric | ThreadJS (JS) |
|---|---|
|```java
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.text.Text;

ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
		var player = handler.getPlayer();
		player.sendMessage(Text.literal("Welcome, " + player.getName().getString() + "!"));
});
```
|```javascript
var ServerPlayConnectionEvents = Java.type(
	"net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents"
);
var Text = Java.type("net.minecraft.text.Text");

var JoinCallback = Java.extend(
	Java.type("net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents.Join")
);

ServerPlayConnectionEvents.JOIN.register(new JoinCallback({
	onPlayReady: function(handler, sender, server) {
		var player = handler.getPlayer();
		player.sendMessage(Text.literal("Welcome, " + player.getName().getString() + "!"));
	}
}));
```
|

---

### 5) Command Registration

Both use Brigadier’s `CommandManager`. The JS version mirrors Java line‑for‑line, with the same arguments and dispatching.

| Java Fabric | ThreadJS (JS) |
|---|---|
|```java
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.server.command.CommandManager;
import net.minecraft.text.Text;

CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
		dispatcher.register(
				CommandManager.literal("hello")
						.executes(ctx -> {
								ctx.getSource().sendFeedback(() -> Text.literal("Hello from Java!"), false);
								return 1;
						})
		);
});
```
|```javascript
var CommandRegistrationCallback = Java.type(
	"net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback"
);
var CommandManager = Java.type("net.minecraft.server.command.CommandManager");
var Text = Java.type("net.minecraft.text.Text");

var CommandRegCallback = Java.extend(
	Java.type("net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback")
);

CommandRegistrationCallback.EVENT.register(new CommandRegCallback({
	register: function(dispatcher, registryAccess, environment) {
		dispatcher.register(
			CommandManager.literal("hello").executes(function(ctx) {
				ctx.getSource().sendFeedback(function() {
					return Text.literal("Hello from JS!");
				}, false);
				return 1;
			})
		);
	}
}));
```
|

---

### 6) Core Takeaways

- **Same APIs:** Fabric events and commands are identical in both languages.
- **ThreadJS advantage:** Less boilerplate, faster iteration, and dynamic scripting.
- **Interop:** You can call Java methods directly from JS, with ThreadJS handling inherited methods safely.

---

### 7) Where This Showcase Goes Further

In the rest of this README, the sample mod demonstrates:

- Structured data storage (homes/warps)
- Status effects and registry lookups
- Weather/time control
- Action bar UI
- Timed rewards and cooldowns

All of those features use the same patterns shown above.

## Feature Guide (In-Depth)

### 1) Event System
**Where:** `main.js` → `ServerPlayConnectionEvents.JOIN`, `DISCONNECT`, `ServerTickEvents.END_SERVER_TICK`

- **Join:** Sends a broadcast welcome message, plays a sound, and schedules particle effects.
- **Disconnect:** Uses per-player data (stored in a `HashMap`) to report session duration.
- **Tick:** Runs delayed tasks and periodic ambient particle effects.

**Why it matters:** It shows how JS callbacks interact with Fabric events via `Java.extend` and how ThreadJS wraps arguments for safe use.

---

### 2) Scheduling (Delayed Tasks)
**Where:** `scheduleTask()` helper + tick loop

- Stores tasks in a queue with `tickTarget`.
- On each server tick, executes tasks whose time has arrived.

**Why it matters:** Demonstrates JS-side scheduling without extra threads.

---

### 3) Data Storage (In-Memory)
**Where:** `playerData`, `homeData`, `warpData`, `dailyClaims`

- **playerData:** Tracks join time and name per UUID.
- **homeData:** Per-player `BlockPos` stored by UUID.
- **warpData:** Named global warps for the server.
- **dailyClaims:** Simple cooldown system using timestamps.

**Why it matters:** Shows how to use Java collections inside JS reliably.

---

### 4) Command Tree (/js)
**Where:** `CommandRegistrationCallback.EVENT`

This mod builds a full Brigadier tree under `/js` with:

- **Player interactions:** `/js greet`, `/js near`
- **Items:** `/js kit`, `/js stack`
- **Movement:** `/js tp`, `/js top`, `/js home`, `/js warp`
- **World control:** `/js time`, `/js weather`
- **Effects:** `/js effect add|clear`, `/js heal`
- **UI:** `/js actionbar`
- **Rewards:** `/js daily`

**Why it matters:** It’s the most comprehensive example of JS Brigadier usage in a Fabric mod.

---

### 5) Tab Completion
**Where:** `suggests()` blocks on `/js greet`, `/js gamemode`, `/js effect`, `/js warp`

- Uses `CommandSource.suggestMatching(...)` to build suggestions
- Pulls from live player lists or static arrays

**Why it matters:** Demonstrates how to add **ergonomic command UX** in JS.

---

### 6) Homes & Warps
**Commands:**
- `/js home set|go|info|clear`
- `/js warp set|go|list|remove`

**Implementation:**
- Homes use a UUID → `BlockPos` map
- Warps use a name → `BlockPos` map
- Teleport uses `player.teleport(world, x, y, z, ...)`

**Why it matters:** Shows structured data storage + command-driven teleport.

---

### 7) Effects & Health
**Commands:**
- `/js effect add <effect> <seconds> [level]`
- `/js effect clear`
- `/js heal [player]`

**Implementation:**
- Effects are resolved via `Registries.STATUS_EFFECT`
- Applied via `new StatusEffectInstance(effect, ticks, amplifier)`

**Why it matters:** Demonstrates registry lookups and safe validation.

---

### 8) Weather Control
**Command:** `/js weather set <clear|rain|thunder>`

**Implementation:**
- Uses `ServerWorld.setWeather(clearTicks, rainTicks, raining, thundering)`

**Why it matters:** Shows direct world state manipulation from JS.

---

### 9) Action Bar UI
**Command:** `/js actionbar <text>`

**Implementation:**
- `player.sendMessage(Text.literal(text), true)`

**Why it matters:** Simple UI feedback without chat spam.

---

### 10) Daily Reward Cooldown
**Command:** `/js daily`

**Implementation:**
- Stores last claim time in `dailyClaims`
- Compares against `DAILY_COOLDOWN_MS`
- Grants items if cooldown elapsed

**Why it matters:** Shows stateful cooldown logic in pure JS.

---

## Extending the Mod

Common ways to grow it:

- Add new subcommands under `/js`
- Add new data maps in JS for persistent logic
- Use additional registries (biomes, items, entities)
- Create server-wide systems (economy, quests, protections)

## Notes

- The narrator warning (`libflite.so`) is a **Linux dependency issue**, not a mod bug.
- This mod is intentionally verbose and educational — it’s a living reference.

---

If you want even more features (boss bars, scoreboards, entity spawning, mini‑games), just ask and I’ll add them.
