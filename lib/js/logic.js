import { upgradeDefs } from "./def.js"
import { gameData } from "../../main.js"

export { xpRequired, canAffordUpgrade, checkMaxLevel, gainSkillXP, waterDrop, checkUnlocks, insertWaterUpgrades, getUpgradeCost, insertExploreAreas }

const UNLOCK_REQUIREMENTS = {
	explore: () => gameData.water.level >= 3,
	craft: () => gameData.explore.level >= 3,
	research: () => gameData.water.level >= 2,
	trackers: () => 
		gameData.water.level >= 20 &&
		gameData.explore.level >= 20 &&
		gameData.craft.level >= 20,
	achievements: () => gameData.explore.level >= 3,
}

// ================================
// 		1. XP & Leveling
// ================================

function xpRequired(level) {
	const base = 100;
	const growth = 1.25;
	
	let total = 0;
	for (let i = 0; i < level; i++) {
		total += Math.ceil(base * Math.pow(growth, level - 1)/5)*5;
	}
	return total;
}

function gainSkillXP(skill, amount) {
	const data = gameData[skill];
	if (!data) return;
	
	data.xp += amount;
	
	while (data.xp >= xpRequired(data.level)) {
		levelUpSkill(skill);
	}
}

function levelUpSkill(skill) {
	const data = gameData[skill];
	
	data.level++;
	
	gameData.research.points += 1;
	
	switch (skill) {
		case 'explore':
		data.stamina += data.staminaMax
	}
	unlockSkill();
	requestRender();
}

function unlockSkill() {
	for (const [skill, requirement] of Object.entries(UNLOCK_REQUIREMENTS)) {
		if (gameData.unlocks[skill]) continue

		if (requirement()) {
			gameData.unlocks[skill] = true
			console.log(`${skill} unlocked!`)
			showSidebarButton(skill)
		}
	}
}

function showSidebarButton(skill) {
	const button = $(`button[data-tab="${skill}"]`)

	if (button) {
		button.classList.toggle('invisible')
	}
}

// ================================
// 		2. WATER
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

// ================================
// 		3. EXPLORE
// ================================

function insertExploreAreas() {
	const list = document.getElementById('explore');
	if (!list) return;
	
	list.innerHTML = ''; // clear old entries
	
	Object.entries(exploreDefs).forEach(([id, def]) => {
		const exploreItem = document.createElement('button');
		exploreItem.classList.add('button');
		
		const img = new Image();
		const icon = def.icon;
		img.src = `/images/${icon}`;
		
		const title = document.createElement('h3');
		title.textContent = def.name;
		
		const complete = document.createElement('p');
		complete.textContent = `Completions: ${gameData.explore.zones[id].complete}`;
		
		exploreItem.dataset.area = id;
		exploreItem.addEventListener('click', exploreStart);
		
		exploreItem.appendChild(img);
		exploreItem.appendChild(title);
		exploreItem.appendChild(complete);
		
		list.appendChild(exploreItem);
	});
}


function exploreStart(e) {
	const id = e.currentTarget.dataset.area;
	
	const explorePanel = $("#explore");
	const el = buildExploreElement(id);
	
	if (el) explorePanel.appendChild(el);
	
	const removeEl = explorePanel.getElementsByClassName("button")
	while (removeEl.length > 0) {
		removeEl[0].parentNode.removeChild(removeEl[0])
	}
	
	$('#continue').focus()
}

function buildExploreElement(id) {
	const def = exploreDefs[id];
	const explorePanel = $('#explore')
	
	// Explore console (left)
	const console = document.createElement('div');
	console.classList.add("explore-console");
	
	const title = document.createElement('div');
	title.classList.add("explore-area");
	title.textContent = def.name
	
	const text = document.createElement('div');
	text.classList.add("explore-text");
	text.textContent = def.startText;
	
	console.appendChild(title);
	console.appendChild(text);
	
	// Explore options (right)
	const options = document.createElement('div')
	options.classList.add("explore-options");
	
	// Continue
	const continueBtn = document.createElement('li')
	continueBtn.classList.add('item-content')
	continueBtn.id = "continue"
	continueBtn.tabIndex = 0;
	
	continueBtn.innerHTML = `
		<img src="/images/foot.png">
		<div class="consumable-name"><u>C</u>ontinue</div>
		<div class="consumable-dur"></div>
		<div class="consumable-qty">${gameData.explore.stamina} / ${gameData.explore.staminaMax}</div>
	`
	
	continueBtn.addEventListener(
		'click', () => sendExplore(id)
	)
	
	let repeatTimer = null
	
	continueBtn.addEventListener('keydown', (e) => {
		if (e.key !== 'c' && e.key !== ' ') return
		if (repeatTimer) return	// already repeating
		
		e.preventDefault()
		
		sendExplore(id)	// immediate action
		
		repeatTimer = setInterval(() => {
			sendExplore(id)
		}, 500)
	})
	
	continueBtn.addEventListener('keyup', (e) => {
		if (e.key !== 'c' && e.key !== ' ') return
		
		clearInterval(repeatTimer)
		repeatTimer = null
	})
	
	continueBtn.addEventListener('blur', () => {
		clearInterval(repeatTimer)
		repeatTimer = null
	})
	
	
	// Consumables
	const itemsList = document.createElement('ul');
	itemsList.classList.add('item-select')
	
	Object.entries(gameData.inventory.consumables).forEach(([itemId, qty]) => {
		const itemDef = item_master_data[itemId];
		if (!itemDef?.exploreUsable || qty <= 0) return
		
		itemsList.appendChild(buildConsumableButton(itemId));
	});
	
	options.appendChild(continueBtn)
	options.appendChild(itemsList)
	explorePanel.appendChild(console)
	explorePanel.appendChild(options)
	// Loot table
	generateLootTable(id)
}

function sendExplore(id) {
	const zone = gameData.explore.zones[id];
	const def = exploreDefs[id];
	
	const chance = def.lootChance * (1 + (gameData.explore.level-1)/100)
	
	const staminaToSpend = Math.min(zone.stamPerClick + zone.complete, gameData.explore.stamina);
	if (staminaToSpend <= 0) return;
	
	gameData.explore.stamina -= staminaToSpend;
	zone.stamUsed += staminaToSpend;
	if (zone.stamUsed >= 1e5) zone.complete = Math.floor(zone.stamUsed / 1e5);
	
	const textEl = document.querySelector('.explore-text');
	
	if (staminaToSpend > 3) {
		// FAST MODE
		const loot = {};
		
		for (let i = 0; i < staminaToSpend; i++) {
			if (random(0, 100) > (chance ?? 100)) continue;
			
			const item = looter(id);
			if (!item) continue;
			
			const consumQty = document.querySelector(`.item-content[data-item="${item}"] .consumable-qty`);
			const consumEl = document.querySelector(`li[data-item="${item}"]`);
			
			loot[item] = (loot[item] || 0) + 1;
			addItemToInventory(item);
			addItemToMastery(item);
			
			if (item_master_data[item]?.type === "consumable") {
				const list = document.querySelector('.item-select');
				
				let consumEl = list.querySelector(`li[data-item="${item}"]`);
				
				// 1️⃣ Create button if missing
				if (!consumEl) {
					consumEl = buildConsumableButton(item);
					list.appendChild(consumEl);
				}
				
				// 2️⃣ Update quantity
				const consumQty = consumEl.querySelector('.consumable-qty');
				if (consumQty) {
					consumQty.textContent = gameData.inventory.consumables[item];
				}
				
				// 3️⃣ Show + flash
				consumEl.style.visibility = "visible";
				consumEl.style.pointerEvents = "auto"
				consumEl.classList.remove("flash");
				void consumEl.offsetWidth;
				consumEl.classList.add("flash");
			}
			
			
			calcExploreXp(item);
		}
		
		if (Object.keys(loot).length === 0) {
			textEl.innerHTML = `Used <b>${staminaToSpend} stamina</b>.
			<br>
			${randArray(def.flavorText.idle)}`;
		} else {
			textEl.innerHTML = `Used <b>${staminaToSpend} stamina</b>.
			<hr>
			${Object.entries(loot).map(([item,count]) => `<b>${item_master_data[item].name}</b> ${count}`).join('<br>')}`;
		}
	} else {
		// FLAVOR MODE
		const messages = [];
		
		for (let i = 0; i < staminaToSpend; i++) {
			if (random(0, 100) > (chance ?? 100)) {
				messages.push(randArray(def.flavorText.idle)); continue;
			}
			
			const item = looter(id);
			
			const consumQty = document.querySelector(`.item-content[data-item="${item}"] .consumable-qty`);
			const consumEl = document.querySelector(`li[data-item="${item}"]`);
			
			if (item && item_master_data[item]) {
				const itemDef = item_master_data[item];
				messages.push(randArray(def.flavorText.found).replace('[ITEM]', `<b>${itemDef.name}</b>`));
				addItemToInventory(item);
				addItemToMastery(item);
				
				if (item_master_data[item]?.type === "consumable") {
					const list = document.querySelector('.item-select');
					
					let consumEl = list.querySelector(`li[data-item="${item}"]`);
					
					// Create button if missing
					if (!consumEl) {
						consumEl = buildConsumableButton(item);
						list.appendChild(consumEl);
					}
					
					// Update quantity
					const consumQty = consumEl.querySelector('.consumable-qty');
					if (consumQty) {
						consumQty.textContent = gameData.inventory.consumables[item];
					}
					
					// Show + flash
					consumEl.style.visibility = "visible";
					consumEl.style.pointerEvents = "auto"
					consumEl.classList.remove("flash");
					void consumEl.offsetWidth;
					consumEl.classList.add("flash");
				}
				
				calcExploreXp(item);
			} else messages.push(randArray(def.flavorText.idle));
		}
		
		textEl.innerHTML = messages.join('<br>');
	}
	
	// update Continue stamina
	$("#continue").children[3].textContent =
	`${gameData.explore.stamina} / ${gameData.explore.staminaMax}`;
	generateLootTable(id);
	requestRender();
}

function looter(id) {
	const drops = exploreDefs[id].drops;
	if (!drops || drops.length === 0) return null;
	
	const totalWeight = drops.reduce((sum, [, w]) => sum + w, 0);
	const roll = random(0, totalWeight);
	
	let cumulative = 0;
	for (const [itemId, weight] of drops) {
		cumulative += weight;
		if (roll <= cumulative) return itemId;
	}
	return null;
}

function generateLootTable(id) {
	const def = exploreDefs[id];
	const explorePanel = $('#explore')
	if ($('.loot-container')) {$('.loot-container').remove()}

	const lootContainer =  document.createElement("div")
	lootContainer.classList.add("loot-container")
	lootContainer.innerHTML = ''

	const addText = document.createElement("h3")
	addText.textContent = "Items found here..."
	
	const lootTableList = document.createElement("div")
	lootTableList.classList.add("loot-table")

	def.drops.forEach( ([itemId]) => {
		const itemDef = item_master_data[itemId];
		// If item mastery > 1, then show in loot table
		checkItemMastery(itemId)
		const mastery = gameData.achievements.mastery[itemId].amount ?? 0

		const item = document.createElement('div');
		item.classList.add('inventory-item', 'fold');
		
		const iconDiv = document.createElement('div');
		iconDiv.classList.add('inventory-icon');

		const img = new Image();
		
		const nameDiv = document.createElement('div');
		nameDiv.classList.add('inventory-name');
		let name = ''

		if (mastery == 0 ) {
			img.src = `/images/question-mark.png`;
			name = '???'
		} else {
			img.src = `/images/${itemDef?.icon || ""}`;
			name = itemDef?.name || id;
		}
		
		iconDiv.appendChild(img);
		nameDiv.innerHTML = `${name}`;
		
		item.appendChild(iconDiv);
		item.appendChild(nameDiv);
		
		lootTableList.appendChild(item);
		
		explorePanel.appendChild(lootContainer);
	})

	lootContainer.appendChild(addText)
	lootContainer.appendChild(lootTableList)
}

function calcExploreXp(itemId) {
	gainSkillXP('explore', item_master_data[itemId].xp);
}

function buildConsumableButton(itemId) {
	const itemDef = item_master_data[itemId];
	const li = document.createElement('li');
	
	li.classList.add('item-content');
	li.dataset.item = itemId;
	li.tabIndex = 0;
	
	const img = new Image();
	const icon = itemDef.icon
	img.src = `/images/${icon}`
	
	const liName = document.createElement('div')
	liName.classList.add('consumable-name')
	liName.textContent = titleCase(itemDef.name)
	
	const liQty = document.createElement('div')
	liQty.classList.add('consumable-qty')
	liQty.textContent = gameData.inventory.consumables[itemId]
	
	li.appendChild(img)
	li.appendChild(liName)
	li.appendChild(liQty)
	
	/* li.innerHTML = `
	<div class="consumable-name">${titleCase(itemDef.name)}</div>
	<div class="consumable-qty">${gameData.inventory.consumables[itemId]}</div>
	`; */
	
	const use = () => useExploreConsumable(itemId);
	
	li.addEventListener('click', use);
	
	let repeatTimer = null
	
	li.addEventListener('keydown', (e) => {
		if (e.key !== 'b' && e.key !== ' ') return
		if (repeatTimer) return	// already repeating
		
		e.preventDefault()
		
		use();
		
		repeatTimer = setInterval(() => {
			use();
		}, 500)
	})
	
	li.addEventListener('keyup', (e) => {
		if (e.key !== 'b' && e.key !== ' ') return
		
		clearInterval(repeatTimer)
		repeatTimer = null
	})
	
	li.addEventListener('blur', () => {
		clearInterval(repeatTimer)
		repeatTimer = null
	})
	
	
	
	return li;
}


function useExploreConsumable(itemId) {
	const qty = gameData.inventory.consumables[itemId];
	if (!qty || qty <= 0) return;
	
	const itemDef = item_master_data[itemId];
	if (!itemDef?.effect) return;
	
	// Apply effects
	itemDef.effect.forEach(fn => fn(gameData));
	
	// Consume item
	gameData.inventory.consumables[itemId]--;
	
	// === UPDATE CONTINUE BUTTON STAMINA ===
	const continueBtn = $("#continue");
	if (continueBtn) {
		continueBtn.children[2].textContent =
		`${gameData.explore.stamina} / ${gameData.explore.staminaMax}`;
	}
	
	// === UPDATE CONSUMABLE QTY ===
	const consumQty = $(
		`.item-content[data-item="${itemId}"] .consumable-qty`
	);
	const consumEl = document.querySelector(`li[data-item="${itemId}"]`);
	
	if (consumQty) {
		const remaining = gameData.inventory.consumables[itemId];
		
		if (remaining > 0) {
			consumQty.textContent = `${remaining}`;
			consumEl.style.visibility = "visible";
			consumEl.style.cursor = "pointer";
			consumEl.style.pointerEvents = "auto";
		} else {
			document.getElementById('continue').focus()
			consumQty.textContent = `${remaining}`;
			consumEl.style.visibility = "hidden";
			consumEl.style.cursor = "pointer";
			consumEl.style.pointerEvents = "none";
		}
	}
	
	requestRender();
}

function tickStamina(now) {
	const explore = gameData.explore
	const staminaInterval = duration({ m: 1 })
	const el = $('#continue')

	if (explore.stamina >= explore.staminaMax) {
		if (el) {
			el.querySelector('.consumable-dur').textContent = ''
		}
		return
	}

	const elapsed = now - explore.staminaTick
	const remaining = staminaInterval - elapsed

	if (elapsed >= staminaInterval) {
		explore.staminaTick = now
		explore.stamina = clamp(explore.stamina + 4, 0, explore.staminaMax)
	}

	if (el) {
		el.querySelector('.consumable-dur').textContent = ` (${msToHMS(Math.max(0, remaining))})`
		el.querySelector('.consumable-qty').textContent = `${explore.stamina} / ${explore.staminaMax}`
	}
}

