export { waterDrop, insertWaterUpgrades, }

// ================================
// 		WATER
// ================================
function recalcStats() {
	// reset derived stats
	gameData.water.waterPerTick = 0;
	
	Object.entries(gameData.water.upgrades).forEach(([id, data]) => {
		const def = upgradeDefs[id];
		if (!def?.effects) return;
		
		def.effects.forEach(effect => {
			effect(gameData.water, data.level, data.modifier);
		});
	});
}

function waterDrop() {
	const water = gameData.water
	water.waterTotal += water.waterPerTick;
	water.amount += water.waterPerTick * water.tickMult;
}

function getDropsPerTick() {
	return gameData.water.waterPerTick / DROP_ML;
}

/* Water Upgrades */

function buildUpgradeElement(id) {
	const def = upgradeDefs[id];
	const unlocked = !!gameData.water.upgradesUnlocked[id];
	
	const button = document.createElement('button');
	button.id = id;
	button.classList.add('water', 'button');
	button.disabled = !unlocked;
	
	if (!unlocked) {
		button.classList.add('locked');
		button.innerHTML = `
			<p class="upgrade-unlock">${def.unlockText}</p>
		`;
	} else {
		button.innerHTML = `
			<h3 class="upgrade-name"></h3>
			<p class="upgrade-desc">${def.desc}</p>
			<b class="upgrade-cost"></b>
		`;
	}
	
	button.addEventListener('click', () => purchaseUpgrade(id));
	return button;
}

function checkUnlocks() {
	Object.entries(upgradeDefs).forEach(([id, def]) => {
		if (gameData.water.upgradesUnlocked[id]) return;
		if (!def.unlock(gameData.water)) return;
		
		gameData.water.upgradesUnlocked[id] = true;
		
		const el = document.getElementById(id);
		if (!el) return;
		
		el.classList.remove('locked');
		el.disabled = false;
		
		el.innerHTML = `
			<h3 class="upgrade-name"></h3>
			<p class="upgrade-desc">${def.desc}</p>
			<b class="upgrade-cost"></b>
		`;
	});
}

function checkMaxLevel() {
	Object.entries(upgradeDefs).forEach(([id, def]) => {
		const level = gameData.water.upgrades[id].level;
		if (level == null) return;
		
		if (level >= (def.maxLevel ?? Infinity)) {
			const button = document.getElementById(id);
			if (!button) return;
			
			button.disabled = true;
			button.querySelector('h3').textContent = `${def.name} - Lv. MAX`;
		}
	});
}


function insertWaterUpgrades() {
	const waterPanel = document.getElementById("water");
	
	Object.keys(upgradeDefs).forEach(id => {
		if (document.getElementById(id)) return;
		
		const el = buildUpgradeElement(id);
		waterPanel.appendChild(el);
	});
}


function getUpgradeCost(id) {
	const def = upgradeDefs[id]
	const level = gameData.water.upgrades[id].level ?? 0
	
	if (typeof def.cost === 'function') {
		return normalizeUpgradeCost(def.cost(level))
	}
	
	// legacy support (optional)
	if (typeof def.baseCost === 'number') {
		return normalizeUpgradeCost({ water: def.baseCost })
	}
	
	return normalizeUpgradeCost({})
}

function normalizeUpgradeCost(cost = {}) {
	return {
		water: cost.water ?? 0,
		items: cost.items ?? {}
	}
}

function canAffordUpgrade(cost) {
	if (cost.water > gameData.water.amount) return false
	
	for (const [id, qty] of Object.entries(cost.items)) {
		const have = getInventoryCount(id)
		if (have < qty) return false
	}
	
	return true
}

function payUpgradeCost(cost) {
	// water
	if (cost.water > 0) {
		gameData.water.amount -= cost.water
		gameData.water.totalWaterSpent += cost.water
	}
	
	// items
	for (const [id, qty] of Object.entries(cost.items)) {
		const bucket =
		gameData.inventory.items[id] !== undefined
		? gameData.inventory.items
		: gameData.inventory.equipment
		
		bucket[id] -= qty
	}
}

function purchaseUpgrade(id) {
	if (!gameData.water.upgradesUnlocked[id]) return
	
	const def = upgradeDefs[id]
	const level = gameData.water.upgrades[id].level
	
	if (level >= def.maxLevel && def.maxLevel != null ) return
	
	const cost = getUpgradeCost(id)
	if (!canAffordUpgrade(cost)) return
	
	const wasProducing = gameData.water.waterPerTick > 0
	
	payUpgradeCost(cost)
	gameData.water.upgrades[id].level++
	
	recalcStats()
	
	if (!wasProducing && gameData.water.waterPerTick > 0) {
		waterTick()
		syncLiquidAnimation()
	}
	
	requestRender()
}


/* Drops Animation */

function getDropSize() {
	const minWidth = 10;
	const minHeight = 14;
	const maxWidth = 24;
	const maxHeight = 32;
	
	const scale = Math.sqrt(getDropsPerTick());
	return {
		width: Math.min(minWidth + scale * 2, maxWidth),
		height: Math.min(minHeight + scale * 2.5, maxHeight)
	};
}

function spawnDrop(width = 10, height = 14) {
	const drop = document.createElement('div');
	drop.className = 'drop';
	
	drop.style.width = `${width}px`;
	drop.style.height = `${height}px`;
	
	const container = document.getElementById('water-container');
	container.appendChild(drop);
	
	let y = 0;
	const speed = 350; // px per second
	let last = performance.now();
	
	function animate(now) {
		const delta = (now - last) / 1000;
		last = now;
		
		y += speed * delta;
		drop.style.transform = `translate(-50%, ${y}px)`;
		
		if (y < container.clientHeight) {
			requestAnimationFrame(animate);
		} else {
			drop.remove();
		}
	}
	requestAnimationFrame(animate);
}

function spawnDropsForWaterGain(waterAmount) {
	const DROP_TIERS = [
		{ value: 20.0,	width: 26, height: 34 }, // large
		{ value: 5.0,	width: 18, height: 24 }, // medium
		{ value: DROP_ML, width: 10, height: 14 }, // small
	];
	
	let remaining = waterAmount;
	
	if (gameData.water.waterPerTick < 3000) {
		for (const tier of DROP_TIERS) {
			const count = Math.floor(remaining / tier.value);
			if (count <= 0) continue;
			
			for (let i = 0; i < count; i++) {
				spawnDrop(tier.width, tier.height);
			}
			
			remaining -= count * tier.value;
		}
	} else {
		setTimeout(() => { 
			if (!document.querySelector('.stream')) spawnStream();
		}, gameData.water.tickSpeed * 0.9);
	}
}

function spawnStream() {
	const stream = document.createElement('div');
	stream.className = 'stream';
	const container = document.getElementById('water-container');
	
	container.appendChild(stream);
}