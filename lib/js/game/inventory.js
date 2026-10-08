export { addItemToInventory, addItemToMastery, renderUnequipBtn }

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
	img.src = `./images/${itemMasterData[itemId]?.icon || ""}`
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


// ================================
// 		Equipment
// ================================
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
