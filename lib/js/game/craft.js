import { gameData } from "../../../main.js"
import { gainSkillXP } from "./logic.js"
import { addItemToInventory, addItemToMastery } from "./inventory.js"
import { itemMasterData, craftRecipes } from "../def.js"

export { insertCraftRecipes, updateCrafting }

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
	icon.src = `./images/${item.icon}`
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
