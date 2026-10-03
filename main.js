// ===============================
// 		Init
// ===============================
export const DROP_ML = 0.05;

import { initUpgrades, initExplore, initResearch } from "./lib/js/init.js"
import { clamp, random, randArray, duration, msToHMS, waterUnit, numberFormat, titleCase, getInventoryCount } from "./lib/js/util.js"
import { $, requestRender, syncLiquidAnimation, renderUI} from "./lib/js/render.js"
import { gainSkillXP, waterDrop, checkUnlocks, insertWaterUpgrades, insertExploreAreas, tickStamina } from "./lib/js/logic.js"
import { upgradeDefs, exploreDefs, itemMasterData, craftRecipes, researchDefs } from "./lib/js/def.js"

export let gameData = {
	player: {
		name: 'Adri',
		start: Date.now(),
		latest: Date.now(),
		},
	unlocks: {
		explore: false,
		crafting: false,
		research: false,
		trackers: false,
		achievements: false,
	},
	water: {
		level: 1,
		xp: 0,
		amount: DROP_ML, //counts in mL; current amount of flooding water
		waterTotal: 0, //total water flooded over time
		waterPerTick: 0, //in mL; 0.05 mL = 1 drop
		tickMult: 1,
		tickSpeed: 9E9,
		totalWaterSpent: 0,
		upgrades: {},
		upgradesUnlocked: {},
	},
	explore: {
		level: 1, 
		xp: 0,
		stamina: 100,
		staminaMax: 100,
		staminaTick: 0,
		zones: {},
	},
	craft: {
		level: 1,
		xp: 0,
		proficiency: {},
	},
	crafting: {
		queue: [],
		active: null,
		finishAt: 0
	},
	research: {
		// Earn one skill point per level up.
		points: 0,
		complete: {},
		researchUnlocked: {},
	},
	achievements: {
		mastery: {},
	},
	inventory: {
		items: {
			wood: 15,
			stone: 5,
		},
		consumables: {},
		equipment: {
			'simple_hammer': 1,
		},
	},
	equipped: {
		BACK: null,
		HEAD: null,
		SHOULDERS: null,
		MAINHAND: null,
		OFFHAND: null,
		CHEST: null,
		GLOVES: null,
		LEGS: null,
		FEET: null,
		ACCESSORY: null,
		TRINKET: null,
	},
	
	attributes: {
		points: 0,
		physical: {
			strength: 0, //
			constitution: 0, //
			dexterity: 0, //
			agility: 0,	//
		}, 
		mental: {
			intelligence: 0,
			wisdom: 0,
			charisma: 0,
			perception: 0,
		}
	},
}

// ===============================
// 		UI HANDLERS
// ===============================

function openPanel(e) {
	const panel = e.currentTarget.dataset.tab;
	
	document.querySelectorAll('.active').forEach(el => {
		el.classList.remove('active')
	});
	
	e.currentTarget.classList.add('active');
	document.getElementById(panel).classList.add('active');
	
	switch (panel) {
		case 'explore':
			insertExploreAreas();
		case 'craft':
			insertCraftRecipes();
	}
}

function openMenu(e) {
	const tab = e.currentTarget.dataset.menu;
	
	document.querySelectorAll('.up').forEach(el =>
		el.classList.remove('up')
	)
	
	e.currentTarget.classList.add('up')
	document.getElementById(tab).classList.add('up');
	
	switch (tab) {
		case 'inv':
		requestRender()
	}
}

function attrUp(e) {
	if (gameData.attributes.points <= 0) return;
	
	const skill = e.currentTarget.dataset.skill;
	const category = attributeCategory[skill];
	
	gameData.attributes.points--;
	gameData.attributes[category][skill]++;
	
	requestRender();
}

// ================================
// 		Crafting
// ================================

function insertCraftRecipes() {
	const panel = $('#craft')
	if (!panel) return
	
	panel.innerHTML = ''
	
	const list = document.createElement('div')
	list.classList.add('craft-list')
	
	Object.keys(craftRecipes).forEach(id => {
		list.appendChild(buildCraftingElement(id))
	})
	
	const craftConsole = document.createElement('div')
	craftConsole.classList.add('craft-console')
	craftConsole.textContent = "Select an item to start crafting!"
	
	panel.appendChild(list)
	panel.appendChild(craftConsole)
	
	// Rehydrate active craft AFTER console exists
	if (gameData.crafting.active) {
		const craft = gameData.crafting.active
		const progressEl = addToCraftConsole(craft)
		craft.progressEl = progressEl
		
		const elapsed = Date.now() - (craft.finishAt - craft.duration)
		const percent = Math.max(0, Math.min(elapsed / craft.duration, 1))
		progressEl.style.width = `${percent * 100}%`
	}
	
}

function buildCraftingElement(id) {
	const def = itemMasterData[id]
	const craftDefs = craftRecipes[id]
	
	const recipe = document.createElement('div')
	recipe.classList.add('recipe', 'button')
	
	const item = document.createElement('div')
	item.classList.add('item')
	
	const itemName = document.createElement('div')
	itemName.classList.add('item-name')
	itemName.textContent = def.name
	
	const itemDuration = document.createElement('div')
	itemDuration.classList.add('item-time')
	itemDuration.textContent = "Duration: " + msToHMS(craftDefs.duration)
	
	const input = document.createElement('input')
	input.id = id
	input.type = 'number'
	input.value = 1
	input.min = 1
	
	let maxCraftable = Infinity
	
	for (const [reqId, qty] of Object.entries(craftDefs.requires)) {
		const reqDef = itemMasterData[reqId]
		const inventory = INVENTORY_BUCKETS[reqDef.type]()
		const available = inventory[reqId] ?? 0
		
		maxCraftable = Math.min(maxCraftable, Math.floor(available / qty))
	}
	
	/* maxCraftable = Math.max(1, maxCraftable) */
	input.max = maxCraftable
	
	const craftBtn = document.createElement('button')
	craftBtn.textContent = 'Craft'
	craftBtn.addEventListener('click', () =>{
		const amount = Number(input.value) || 1
		craftItem(id, amount)
	})
	
	const maxBtn = document.createElement('button')
	maxBtn.textContent = "Max"
	maxBtn.addEventListener('click', () =>{
		input.value = maxCraftable
	})
	
	item.appendChild(itemName)
	item.appendChild(itemDuration)
	maxCraftable > 0 ? item.appendChild(input) : ''
	maxCraftable > 0 ? item.appendChild(craftBtn) : ''
	maxCraftable > 0 ? item.appendChild(maxBtn) : ''
	
	const requires = document.createElement('div')
	requires.classList.add('requires')
	
	// Build a vertical list using <br>
	const reqText = Object.entries(craftDefs.requires)
	.map(([reqId, qty]) => {
		const reqDef = itemMasterData[reqId]
		const have = getInventoryCount(reqId)
		return `${have} / ${qty} ${reqDef.name}`
	})
	.join('<br>')
	
	requires.innerHTML = `Requires:<br>${reqText}`
	
	recipe.appendChild(item)
	recipe.appendChild(requires)
	
	const isBusy = gameData.crafting.active || gameData.crafting.queue.length > 0
	
	craftBtn.disabled = isBusy
	maxBtn.disabled = isBusy
	input.disabled = isBusy
	
	return recipe
}

function addToCraftConsole(job) {
	const item = itemMasterData[job.id]
	const craftConsole = document.querySelector('.craft-console')
	if (!craftConsole) return null
	
	craftConsole.innerHTML = ''
	
	const icon = new Image()
	icon.src = `/images/${item.icon}`
	icon.classList.add('fold')
	
	const name = document.createElement('div')
	name.classList.add('item-name')
	
	// Add batch info if present
	if (job.batchTotal > 0) {
		name.innerHTML = `Currently Crafting: ${titleCase(item.name)}<br>
		(${job.batchIndex} / ${job.batchTotal})`
	} else {
		name.textContent = titleCase(item.name)
	}
	
	const crafter = document.createElement('div')
	crafter.classList.add('craftBar')
	
	const crafterProgress = document.createElement('div')
	crafterProgress.classList.add('craftProgress')
	
	const cancelBtn = document.createElement('button')
	cancelBtn.textContent = 'Cancel'
	cancelBtn.classList.add('cancel-craft')
	cancelBtn.onclick = cancelCrafting
	craftConsole.appendChild(cancelBtn)
	
	crafter.appendChild(crafterProgress)
	craftConsole.appendChild(name)
	craftConsole.appendChild(icon)
	craftConsole.appendChild(crafter)
	
	
	requestRender()
	return crafterProgress
}

function craftItem(id, amount = 1) {
	if (gameData.crafting.active || gameData.crafting.queue.length > 0) return
	
	const recipe = craftRecipes[id]
	
	for (let i = 0; i < amount; i++) {
		gameData.crafting.queue.push({
			id,
			amount: 1,
			duration: (recipe.duration / (gameData.craftSpeedMult ?? 1)),
			progressEl: null,
			batchTotal: amount,
			batchIndex: i + 1,
			requires: recipe.requires
		})
	}
	
	startNextCraft()
}


function startNextCraft() {
	if (gameData.crafting.active) return
	
	while (gameData.crafting.queue.length > 0) {
		const job = gameData.crafting.queue.shift()
		if (!job || !job.id) continue
		
		const recipe = craftRecipes[job.id]
		let canCraft = true
		
		// Validate resources (per craft)
		for (const [reqId, qty] of Object.entries(recipe.requires)) {
			const reqDef = itemMasterData[reqId]
			const inventory = INVENTORY_BUCKETS[reqDef.type]()
			if ((inventory[reqId] ?? 0) < qty) {
				canCraft = false
				break
			}
		}
		
		// Not enough resources → skip this job and try next
		if (!canCraft) continue
		
		// Deduct resources ONCE
		for (const [reqId, qty] of Object.entries(recipe.requires)) {
			const reqDef = itemMasterData[reqId]
			const inventory = INVENTORY_BUCKETS[reqDef.type]()
			inventory[reqId] -= qty
		}
		
		// Create UI
		const progressEl = addToCraftConsole(job)
		job.progressEl = progressEl
		
		gameData.crafting.active = job
		gameData.crafting.active.finishAt = Date.now() + job.duration
		return
	}
}

function updateCrafting(now) {
	const craft = gameData.crafting.active
	if (!craft || !craft.id) return	// safety guard
	
	const itemDef = itemMasterData[craft.id]
	if (!itemDef) {
		console.error('Unknown craft ID:', craft.id)
		gameData.crafting.active = null
		startNextCraft()
		return
	}
	
	const elapsed = now - (craft.finishAt - craft.duration)
	const percent = Math.max(0, Math.min(elapsed / craft.duration, 1))
	
	if (craft.progressEl) {
		craft.progressEl.style.width = `${percent * 100}%`
	}
	
	if (now >= craft.finishAt) {
		addItemToInventory(craft.id, craft.amount)
		gameData.craft.proficiency[craft.id] = (gameData.craft.proficiency[craft.id] ?? 0) + craft.amount
		
		addItemToMastery(craft.id, craft.amount)
		gainSkillXP('craft', itemDef.xp)
		gameData.crafting.active = null
		insertCraftRecipes()
		startNextCraft()
		
		if (!gameData.crafting.active && gameData.crafting.queue.length === 0) {
			const craftConsole = document.querySelector('.craft-console')
			if (!craftConsole) return
			craftConsole.textContent = 'Select an item to start crafting!'
		}
		
		requestRender()
	}
}

function cancelCrafting() {
	const job = gameData.crafting.active
	
	// Only refund the active craft (resources already deducted)
	if (job) {
		const recipe = craftRecipes[job.id]
		
		for (const [reqId, qty] of Object.entries(recipe.requires)) {
			const reqDef = itemMasterData[reqId]
			const inventory = INVENTORY_BUCKETS[reqDef.type]()
			inventory[reqId] = (inventory[reqId] ?? 0) + qty
		}
	}
	
	// Clear state
	gameData.crafting.active = null
	gameData.crafting.queue.length = 0
	
	const craftConsole = document.querySelector('.craft-console')
	if (craftConsole) {
		craftConsole.textContent = 'Select an item to start crafting!'
	}
	
	insertCraftRecipes()
	requestRender()
}



// ================================
// 		Research
// ================================
function researchUnlocked(id) {
	const def = researchDefs[id];
	if (!def.unlock) return true;
	if (Array.isArray(def.unlock)) {
		return def.unlock.every(fn => fn());
	}
	return def.unlock();
}

function buildResearchElement(id) {
	const def = researchDefs[id];
	const level = gameData.research.complete[id]?.level ?? 0;
	
	const mkDiv = (cls, text) => {
		const d = document.createElement('div');
		d.className = cls;
		if (text !== undefined) d.innerHTML = text;
		return d;
	};
	
	// Root element
	const el = mkDiv('button');
	el.dataset.researchId = id;
	
	// Unlock check
	if (!researchUnlocked(id)) {
		el.classList.add('locked');
		const req = mkDiv('requirement', def.unlockText || "Locked");
		el.appendChild(req);
	} else {
		// Research info
		const research = mkDiv('research');
		research.append(
			mkDiv('research-name', `${def.name} - Lv. ${level}`),
			mkDiv('research-desc', `${def.desc}<br>${def.effectText ? def.effectText(level) + ' -> ': ''} ${def.effectText ? def.effectText(level + 1): ''}`),
		);
		
		
		// Cost
		const required = mkDiv('required');
		const cost = mkDiv('research-cost');
		cost.textContent = `${getResearchCost(id).amount} RP`;
		required.appendChild(cost);
		required.appendChild(mkDiv('research-time', msToHMS(def.duration(level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)))))
		
		/* // Progress
		const progressEl = mkDiv('progress-div');
		progressEl.appendChild(mkDiv('progress-bar')); */
		
		// Assemble
		el.append(research, required/* , progressEl */);
		
		el.addEventListener('click', () => {
			if (!gameData.research.active) startResearch(id);
		});
	}
	
	return el;
}

function insertResearchItems() {
	const researchPanel = $('#research')
	
	const sections = {}
	
	Object.entries(researchDefs).forEach(([id, def]) => {
		const type = def.type ?? 'other'
		
		if (!sections[type]) {
			const section = document.createElement('div')
			section.classList.add('research-section')
			section.id = `research-${type}`
			
			const header = document.createElement('h2')
			header.textContent = type.toUpperCase()
			
			section.appendChild(header)
			researchPanel.appendChild(section)
			
			sections[type] = section
		}
		
		const el = buildResearchElement(id)
		sections[type].appendChild(el)
	})
}

function getResearchCost(id) {
	const def = researchDefs[id];
	const level = gameData.research.complete[id]?.level ?? 0;
	
	let baseCost = 0;
	if (typeof def.cost === 'function') {
		baseCost = def.cost(level);
	} else {
		baseCost = def.cost ?? 0;
	}
	
	// Apply global discount multiplier (default 1 if not set)
	const multiplier = gameData.researchCostReduction ?? 1;
	if (multiplier >= 1) {
		const finalCost = baseCost
		return { amount: finalCost };
	} else {
		const finalCost = Math.ceil(baseCost * (1 - multiplier));
		return { amount: finalCost };
	}
	
}

function startResearch(id) {
	if (gameData.research.active) return
	
	const def = researchDefs[id]
	const level = gameData.research.complete[id]?.level ?? 0
	const cost = getResearchCost(id).amount
	
	if (gameData.research.points < cost) return
	
	gameData.research.points -= cost
	
	const mkDiv = (cls, text) => {
		const d = document.createElement('div');
		d.className = cls;
		if (text !== undefined) d.textContent = text;
		return d;
	};
	
	// Progress
	const progressEl = mkDiv('progress-div');
	progressEl.appendChild(mkDiv('progress-bar'));
	
	const el = document.querySelector(`[data-research-id="${id}"]`)
	el.appendChild(progressEl)
	const bar = el?.querySelector('.progress-bar')
	const getTime = el?.querySelector('.research-time')
	
	gameData.research.active = {
		id,
		duration: def.duration(level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)),
		startAt: Date.now(),
		progressEl: bar,
		time: getTime
	}
	
	updateResearchButtons()
	requestRender()
}

function updateResearch(now) {
	const r = gameData.research.active
	if (!r) return
	
	const elapsed = now - r.startAt
	const remaining = Math.max(r.duration - elapsed, 0)
	const percent = Math.min(elapsed / r.duration, 1)
	
	if (r.progressEl) {
		r.progressEl.style.width = `${percent * 100}%`
	}
	
	if (r.time) {
		r.time.textContent = msToHMS(remaining)
	}
	
	if (percent >= 1) {
		finishResearch(r.id)
	}
}

function finishResearch(id) {
	const def = researchDefs[id]
	const data = gameData.research.complete[id] ?? { level: 0 }
	
	data.level++
	gameData.research.complete[id] = data
	
	if (typeof def.effect === 'function') {
		def.effect(gameData, data.level)
	}
	
	const el = document.querySelector(`[data-research-id="${id}"]`)
	const levelEl = el.querySelector('.research-name')
	const descEl = el.querySelector('.research-desc')
	const durEl = el.querySelector('.research-time')
	const costEl = el.querySelector('.research-cost')
	const progressEl = el.querySelector('.progress-bar')
	
	levelEl.textContent = def.name + " - Lv. " + data.level
	descEl.innerHTML = `${def.desc}<br>${def.effectText ? def.effectText(data.level) + ' -> ': ''} ${def.effectText ? def.effectText(data.level + 1): ''}`
	durEl.textContent = msToHMS(def.duration(data.level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)));
	costEl.innerHTML = `${getResearchCost(id).amount}&nbsp;RP`
	progressEl.style.width = "0%"
	
	gameData.research.active = null
	
	$(".progress-div").remove()
	updateResearchButtons()
	requestRender()
}

function updateResearchButtons() {
	const activeId = gameData.research.active?.id
	
	document.querySelectorAll('#research .button').forEach(el => {
		const id = el.dataset.researchId
		
		if (!activeId) {
			el.classList.remove('disabled')
			return
		}
		
		if (id === activeId) {
			el.classList.remove('disabled')
		} else {
			el.classList.add('disabled')
		}
	})
}

// ================================
// 		Achievements
// ================================

function insertItemMastery() {
	const achievementPanel = $('#achievements')
	if ($('.item-mastery-container')) {$('.item-mastery-container').remove()}

	const itemMasteryContainer = document.createElement('div')
	itemMasteryContainer.classList.add("item-mastery-container")

	const itemMasteryTitle = document.createElement('h3')
	itemMasteryTitle.textContent = "Item Mastery"
	itemMasteryContainer.appendChild(itemMasteryTitle)

	const itemMasteryList = document.createElement('div')
	itemMasteryList.classList.add("item-mastery-list")

	if (Object.keys(gameData.achievements.mastery).length === 0) {
		const emptyList = document.createElement('p')
			emptyList.textContent = "Explore or craft items to increase mastery."
			itemMasteryList.appendChild(emptyList)
	} else {
		Object.entries(gameData.achievements.mastery).forEach(([id]) => {
			if (gameData.achievements.mastery[id].amount > 0) {
				const itemDiv = document.createElement('div')
				itemDiv.classList.add("item-mastery-item")
				
				const item = document.createElement('div');
				item.classList.add('inventory-item', 'fold');
				
				const iconDiv = document.createElement('div');
				iconDiv.classList.add('inventory-icon');
				const img = new Image();
				img.src = `/images/${itemMasterData[id]?.icon || ""}`;
				iconDiv.appendChild(img);
				
				const nameDiv = document.createElement('div');
				nameDiv.classList.add('inventory-name');
				const name = itemMasterData[id]?.name || id;
				nameDiv.innerHTML = `${name}`;
				
				const qtyDiv = document.createElement('div');
				qtyDiv.classList.add('inventory-qty');
				qtyDiv.textContent = numberFormat(gameData.achievements.mastery[id].amount);
				
				item.appendChild(iconDiv);
	
				itemDiv.appendChild(nameDiv);
				itemDiv.appendChild(item);
				itemDiv.appendChild(qtyDiv);
				itemMasteryList.appendChild(itemDiv);
			}
		})
	}
	itemMasteryContainer.appendChild(itemMasteryList)
	achievementPanel.appendChild(itemMasteryContainer)
}

function itemMasteryThreshold(itemId) {
	const item = gameData.achievements.mastery[itemId];
	const mastery = [
		{ level: 1, threshold: 10, label: "beginner"},
		{ level: 2, threshold: 100, label: "intermediate"},
		{ level: 3, threshold: 1000, label: "advanced"},
		{ level: 4, threshold: 10000, label: "proficient"},
		{ level: 5, threshold: 100000, label: "expert"},
		{ level: 6, threshold: 1000000, label: "master"},
	];

	// count mastery to show loot table drops
}

// ================================
// 		Inventory
// ================================
const INVENTORY_BUCKETS = {
	item:	() => gameData.inventory.items,
	consumable:	() => gameData.inventory.consumables,
	equipment:	() => gameData.inventory.equipment,
	/* quest:		() => gameData.inventory.quest, */
};

function addItemToInventory(itemId, amount = 1) {
	const def = itemMasterData[itemId];
	if (!def) return;
	
	const bucketKey = def.type ?? "material";
	const bucketFn = INVENTORY_BUCKETS[bucketKey];
	
	if (!bucketFn) {
		console.warn(`Unknown inventory type: ${bucketKey}`, itemId);
		return;
	}
	
	const bucket = bucketFn();
	
	bucket[itemId] = (bucket[itemId] ?? 0) + amount;
}

function addItemToMastery(itemId, amount = 1) {
	const def = itemMasterData[itemId];
	if (!def) return;

	checkItemMastery(itemId)
	
	gameData.achievements.mastery[itemId].amount = (gameData.achievements.mastery[itemId].amount ?? 0) + amount;
}

function checkItemMastery(itemId) {
	if (!gameData.achievements.mastery[itemId]) {
		gameData.achievements.mastery[itemId] = {
			amount: 0,
			level: 0
		};
	}
}

function consumeItem(itemId, amount = 1) {
	if (!gameData.inventory.items[itemId] || gameData.inventory.items[itemId] === 0) {
		return
	}
	gameData.inventory.items[itemId] -= amount
	effect(itemId.effect * amount);
}

function createInventoryItemElement(itemId, qty, onClick) {
	const item = document.createElement('div')
	item.classList.add('inventory-item', 'fold')
	item.dataset.item = itemId
	
	if (onClick) {
		item.classList.add('clickable')
		item.onclick = onClick
	}
	
	const iconDiv = document.createElement('div')
	iconDiv.classList.add('inventory-icon')
	
	const img = new Image()
	img.src = `/images/${itemMasterData[itemId]?.icon || ""}`
	iconDiv.appendChild(img)
	
	const qtyDiv = document.createElement('div')
	qtyDiv.classList.add('inventory-qty')
	qtyDiv.textContent = qty
	
	const nameDiv = document.createElement('div')
	nameDiv.classList.add('inventory-name')
	nameDiv.innerHTML = `<span>${itemMasterData[itemId]?.name || itemId}</span>`
	
	item.appendChild(iconDiv)
	item.appendChild(qtyDiv)
	item.appendChild(nameDiv)
	
	return item
}


// EQUIPMENT
const EQUIP_SLOTS = {
	BACK: 'BACK',
	HEAD: 'HEAD',
	SHOULDERS: 'SHOULDERS',
	MAINHAND: 'MAINHAND',
	OFFHAND: 'OFFHAND',
	CHEST: 'CHEST',
	GLOVES: 'GLOVES',
	LEGS: 'LEGS',
	FEET: 'FEET',
	ACCESSORY: 'ACCESSORY',
	TRINKET: 'TRINKET'
}

function equipItem(itemId, preferredSlot = null) {
	const def = itemMasterData[itemId]
	if (!def || def.type !== 'equipment') return
	
	const inv = gameData.inventory.equipment
	if (!inv[itemId] || inv[itemId] <= 0) return
	
	const slots = Array.isArray(def.equipSlot)
	? def.equipSlot
	: [def.equipSlot]
	
	let slot = preferredSlot && slots.includes(preferredSlot) ?  preferredSlot : slots.find(s => gameData.equipped[s] === null)
	
	if (!slot) return

	inv[itemId] -= 1
	gameData.equipped[slot] = itemId
	
	recalcEquipmentEffects()
	renderEquippableList(slot)
	renderEquipment()
}

function unequipItem(slot) {
	const itemId = gameData.equipped[slot]
	if (!itemId) return
	
	gameData.inventory.equipment[itemId] =
	(gameData.inventory.equipment[itemId] ?? 0) + 1
	
	gameData.equipped[slot] = null
	recalcEquipmentEffects()
	renderEquipment()
}

function recalcEquipmentEffects() {
	gameData.craftSpeedMult = 1
	
	Object.values(gameData.equipped).forEach(itemId => {
		if (!itemId) return
		const def = itemMasterData[itemId]
		if (typeof def.effect === 'function') {
			def.effect(gameData)
		}
	})
}

function getEquippableItemsForSlot(slot) {
	const inv = gameData.inventory.equipment
	const result = []
	
	for (const itemId in inv) {
		if (inv[itemId] <= 0) continue
		
		const def = itemMasterData[itemId]
		if (!def || def.type !== 'equipment') continue
		
		const slots = Array.isArray(def.equipSlot) ? def.equipSlot : [def.equipSlot]
		
		if (slots.includes(slot)) {
			result.push(itemId)
		}
	}
	
	return result
}

let selectedEquipSlot = null

function onEquipmentSlotClick(slot) {
	selectedEquipSlot = slot

	document.querySelectorAll('.equip-slot').forEach(el => {
		el.classList.toggle('selected', el.dataset.slot === slot)
	})

	renderEquippableList(slot, getEquippableItemsForSlot(slot))
}

function onEquipmentSlotHover(slot) {
	selectedEquipSlot = slot

	document.querySelectorAll('.equip-slot').forEach(el => {
		el.classList.toggle('selected', el.dataset.slot === slot)
	})

	renderUnequipBtn(slot)
}

function renderEquippableList(slot) {
	const container = document.getElementById('equip-select')
	container.innerHTML = ''
	
	const inv = gameData.inventory.equipment
	
	const items = Object.entries(inv).filter(([itemId, qty]) => {
		if (qty <= 0) return false
		
		const def = itemMasterData[itemId]
		if (!def || def.type !== 'equipment') return false
		
		const slots = Array.isArray(def.equipSlot) ? def.equipSlot : [def.equipSlot]
		
		return slots.includes(slot)
	})
	.sort(([a], [b]) => {
		const nameA = (itemMasterData[a]?.name || a).toLowerCase()
		const nameB = (itemMasterData[b]?.name || b).toLowerCase()
		return nameA.localeCompare(nameB)
	})
	
	if (items.length === 0) {
		container.innerHTML =
		`<div style="padding:1em 0; font-style: italic;">No equippable items.</div>`
		return
	}

	items.forEach(([itemId, qty]) => {
		const el = createInventoryItemElement(itemId, qty, () => {
			equipItem(itemId, slot)
			renderEquipment()
		})
		
		container.appendChild(el)
	})
}

function renderUnequipBtn(slot) {
	const itemId = gameData.equipped[slot]
	if (!itemId) return

	const container = $('.equip-slot.selected');
	if (container.querySelector('.unequip-btn')) return

	const unequipBtn = document.createElement("button");
	unequipBtn.classList.add("unequip-btn");
	unequipBtn.textContent = `Unequip ${titleCase(itemMasterData[itemId].name)}`;	
	unequipBtn.addEventListener("click", () => {
		unequipItem(slot)
		renderEquippableList(slot)
	})

	container.appendChild(unequipBtn);
}

// ================================
// 		OFFLINE BONUS
// ================================

// Every five minutes, update last play time (gameData.player.latest)
// setTimeout( () => gameData.player.latest = Date.now(), duration({m:5}))
// If first upgrade is purchased ()
// 
	// Calculate amount of time since last play (gameData.player.latest)
	
// 

// ================================
// 		GAME LOOP
// ================================
let tickTimer = null;
function waterTick() {
	if (tickTimer) clearTimeout(tickTimer);
	
	tickTimer = setTimeout(() => {
		waterDrop();
		spawnDropsForWaterGain(gameData.water.waterPerTick);
		
		setTimeout(() => {
			gainSkillXP('water', gameData.water.waterPerTick / DROP_ML);
			checkUnlocks();
			requestRender();
		}, 510); // delay matches drop fall time
		
		
		waterTick();
	},gameData.water.tickSpeed || 2000);
}

function gameTick() {
	const now = Date.now()
	
	tickStamina(now)
	updateCrafting(now)
	updateResearch(now)
	// other systems
	
	requestAnimationFrame(gameTick)
}


// ================================
// 		EVENT LISTENERS
// ================================

document.addEventListener('DOMContentLoaded', () => {
	gameData.water.upgrades = initUpgrades(upgradeDefs);
	gameData.explore.zones = initExplore(exploreDefs);
	gameData.research.complete = initResearch(researchDefs);
	requestRender();
	requestAnimationFrame(gameTick)
	
	checkUnlocks();
	syncLiquidAnimation();
	insertWaterUpgrades();
	insertResearchItems();
	waterTick();
	gameTick();
	renderUI();
	
	document.querySelectorAll('.nav.button').forEach(btn => {
		btn.addEventListener('click', openPanel);
	});	
	
	document.querySelectorAll('.menu-tab').forEach(btn => {
		btn.addEventListener('click', openMenu)
	})
	
	document.querySelectorAll('.equip-slot').forEach(el => {
		el.addEventListener('click', () => {
			if (!el.classList.contains("selected")) {
				onEquipmentSlotClick(el.dataset.slot)
			}
		})
		el.addEventListener('mouseenter', () => {
			renderUnequipBtn(el.dataset.slot)
		})
		el.addEventListener('mouseleave', () => {
			el.querySelector('.unequip-btn')?.remove()
		})

	})
	
	document.querySelectorAll('.attr-add').forEach(btn => {
		btn.addEventListener('click', attrUp);
	});

});