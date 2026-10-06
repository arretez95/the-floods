// ===============================
// 		Init
// ===============================
import { initUpgrades, initExplore, initResearch } from "./lib/js/init.js"
import { clamp, random, randArray, duration, msToHMS, waterUnit, numberFormat, titleCase, getInventoryCount } from "./lib/js/util.js"
import { $, requestRender, syncLiquidAnimation, renderUI, renderEquipment } from "./lib/js/render.js"
import { DROP_ML, waterTick, gameTick } from "./lib/js/game/logic.js"
import { checkUnlocks, insertWaterUpgrades } from "./lib/js/game/water.js"
import { insertExploreAreas } from "./lib/js/game/explore.js"
import { insertCraftRecipes } from "./lib/js/game/craft.js"
import { insertResearchItems } from "./lib/js/game/research.js"
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

window.gameData = gameData

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