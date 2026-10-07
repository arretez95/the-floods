import { duration } from "../util.js"
import { gainSkillXP } from "./logic.js"
import { addItemToInventory, addItemToMastery } from "./inventory.js"
import { exploreDefs, itemMasterData } from "../def.js"
import { $, requestRender } from "../render.js"
import { gameData } from "../../../main.js"
import { checkItemMastery } from "./achievements.js"

export { insertExploreAreas, tickStamina }

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
		const itemDef = itemMasterData[itemId];
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
			
			if (itemMasterData[item]?.type === "consumable") {
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
			${Object.entries(loot).map(([item,count]) => `<b>${itemMasterData[item].name}</b> ${count}`).join('<br>')}`;
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
			
			if (item && itemMasterData[item]) {
				const itemDef = itemMasterData[item];
				messages.push(randArray(def.flavorText.found).replace('[ITEM]', `<b>${itemDef.name}</b>`));
				addItemToInventory(item);
				addItemToMastery(item);
				
				if (itemMasterData[item]?.type === "consumable") {
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
		const itemDef = itemMasterData[itemId];
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
	gainSkillXP('explore', itemMasterData[itemId].xp);
}

function buildConsumableButton(itemId) {
	const itemDef = itemMasterData[itemId];
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

function consumeItem(itemId, amount = 1) {
	if (!gameData.inventory.items[itemId] || gameData.inventory.items[itemId] === 0) {
		return
	}
	gameData.inventory.items[itemId] -= amount
	effect(itemId.effect * amount);
}

function useExploreConsumable(itemId) {
	const qty = gameData.inventory.consumables[itemId];
	if (!qty || qty <= 0) return;
	
	const itemDef = itemMasterData[itemId];
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

