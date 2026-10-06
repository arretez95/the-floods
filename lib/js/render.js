import { gameData } from "../../main.js"
import { numberFormat, waterUnit } from "./util.js"
import { xpRequired } from "./game/logic.js"
import { getUpgradeCost, canAffordUpgrade, checkMaxLevel } from "./game/water.js"
import { insertItemMastery } from "./game/achievements.js"
import { upgradeDefs, itemMasterData } from "./def.js"

export const $ = (selector) => { return document.querySelector(selector) };

let needsRender = false;
/* let stamTimer = null;
let lastCraftUpdate = 0; */
let lastInventoryJSON = "";

const DOM = {
	waterAmount: () => $('#water-amount'),
	waterProdRate: () => $('#water-prod-rate'),
	waterTick: () => $('#water-tick'),
	xpAmount: () => $('#xp-amount'),
	waterLevel: () => $('#water-level'),
	water: () => $('#water'),
	totalWater: () => $('#total-water'),
	waterSpent: () => $('#water-spent'),

	exploreLevel: () => $('#explore-level'),
	exploreXpAmount: () => $('#explore-xp-amount'),

	craftLevel: () => $('#crafts-level'),
	craftXpAmount: () => $('#crafts-xp-amount'),

	researchPts: () => $('#research-points-short'),
	research: () => $('#research-points'),

	inventory: () => $('#inv'),
	inventoryItems: () => $('#inventory-list'),

	attributesHeader: () => $('#attributes .colheader'),
};

export function requestRender() {
	if (needsRender) return;
	needsRender = true;
	
	requestAnimationFrame(() => {
		renderUI();
		needsRender = false;
	});
}

export function renderUI() {
	renderWater();
	renderXP();
	renderUpgrades();
	renderAchievements();
	renderInventory();
	renderEquipment();
}

function renderWater() {
	if (!DOM.waterAmount()) return;
	
	DOM.waterAmount().textContent = waterUnit(gameData.water.amount) ?? '';
	const waterPerSecond = gameData.water.waterPerTick * (1000 / gameData.water.tickSpeed || 1);
	DOM.waterProdRate().textContent = `${waterUnit(waterPerSecond, 1)} / s`;
	DOM.waterTick().textContent = `${waterUnit(waterPerSecond, 1)} / s`
}

function renderXP() {
	// Helper to update XP bar and level
	function updateXPBar(data, xpEl, levelEl) {
		const currentXp = xpRequired(data.level);
		const prevXp = xpRequired(data.level - 1);
		const progress = (data.xp - prevXp) / currentXp;
		
		xpEl.style.width = `${Math.min(progress * 100, 100)}%`;
		xpEl.textContent = `${numberFormat(data.xp)} / ${numberFormat(currentXp)}`;
		levelEl.innerHTML = `Lv.&nbsp;${data.level}`;
	}
	
	updateXPBar(gameData.water, DOM.xpAmount(), DOM.waterLevel());
	updateXPBar(gameData.explore, DOM.exploreXpAmount(), DOM.exploreLevel());
	updateXPBar(gameData.craft, DOM.craftXpAmount(), DOM.craftLevel());
	
	if (gameData.research.points >= 1) {
		DOM.researchPts().innerHTML = `${Math.floor(gameData.research.points)}`
		DOM.researchPts().style.background = '';
	} else {
		DOM.researchPts().innerHTML = ''
		DOM.researchPts().style.background = 'transparent';
	}
	
	DOM.research().textContent = "Research Points: " + Math.floor(gameData.research.points) ?? '';
}


function renderInventory() {
	let current = JSON.stringify({
		items: gameData.inventory.items,
		consumables: gameData.inventory.consumables,
		equipment: gameData.inventory.equipment
	});
	
	if (current === lastInventoryJSON) return;
	lastInventoryJSON = current;
	
	const onHand = {...gameData.inventory.items, ...gameData.inventory.consumables, ...gameData.inventory.equipment};
	const container = DOM.inventoryItems();
	container.innerHTML = ""; // clear old items
	
	if (!onHand || Object.keys(onHand).length === 0) {
		container.innerHTML = `<div style="padding:1em 0; font-style: italic;">No items in inventory.</div>`
	}
	
	// Get entries and sort by item name (case-insensitive)
	const sortedItems = Object.entries(onHand)
	.filter(([id, qty]) => qty > 0) // only items you have
	.sort(([idA], [idB]) => {
		const nameA = (itemMasterData[idA]?.name || idA).toLowerCase()
		const nameB = (itemMasterData[idB]?.name || idB).toLowerCase()
		return nameA.localeCompare(nameB)
	});
	
	// Render sorted items
	sortedItems.forEach(([id, qty]) => {
		const item = document.createElement('div');
		item.classList.add('inventory-item', 'fold');
		item.dataset.item = id;
		
		const iconDiv = document.createElement('div');
		iconDiv.classList.add('inventory-icon');
		const img = new Image();
		img.src = `/images/${itemMasterData[id]?.icon || ""}`;
		iconDiv.appendChild(img);
		
		const nameDiv = document.createElement('div');
		nameDiv.classList.add('inventory-name');
		const name = itemMasterData[id]?.name || id;
		nameDiv.innerHTML = `<span>${name}</span>`;
		
		const qtyDiv = document.createElement('div');
		qtyDiv.classList.add('inventory-qty');
		qtyDiv.textContent = qty;
		
		item.appendChild(iconDiv);
		item.appendChild(qtyDiv);
		item.appendChild(nameDiv);
		
		container.appendChild(item);
	});
}

export function renderEquipment() {
	document.querySelectorAll('#equipment-list [data-slot]').forEach(el => {
		const slot = el.dataset.slot
		const itemId = gameData.equipped[slot]

		if (itemId) {
			// Show icon
			el.innerHTML = `<img src="/images/${itemMasterData[itemId].icon}" alt="${itemMasterData[itemId].name}">`
		} else {
			// Show slot name
			el.textContent = slot
		}
	})
}


function renderUpgrades() {
	Object.keys(upgradeDefs).forEach(id => {
		if (!gameData.water.upgradesUnlocked[id]) return;
		
		const el = document.getElementById(id);
		if (!el) return;
		
		const level = gameData.water.upgrades[id].level;
		const cost = getUpgradeCost(id);
		
		el.querySelector('.upgrade-name').textContent =
		`${upgradeDefs[id].name} - Lv. ${level}`;
		
		el.querySelector('.upgrade-cost').textContent = [
			cost.water > 0 ? waterUnit(cost.water) : null,
			...Object.entries(cost.items).map(
				([id, q]) => `${q} ${(itemMasterData[id].name)}`
			)
		].filter(Boolean).join(' + ')
		
		el.disabled = !canAffordUpgrade(cost);
	});
	
	checkMaxLevel();
}

function renderAttributes() {
	DOM.attributesHeader().textContent = `Attribute Points: ${gameData.attributes.points}`;

	document.querySelectorAll('.attr-add').forEach(btn => {
		btn.classList.toggle(
	'visible',
	gameData.attributes.points > 0
	);
	});

	Object.entries(gameData.attributes.physical).forEach(([k, v]) => {
		const el = document.querySelector(`.attr-value[data-skill="${k}"]`);
	if (el) el.textContent = v;
	});

	Object.entries(gameData.attributes.mental).forEach(([k, v]) => {
		const el = document.querySelector(`.attr-value[data-skill="${k}"]`);
	if (el) el.textContent = v;
	});
}

function renderAchievements() {
	let current = JSON.stringify({
		mastery: gameData.achievements.mastery
	});

	if (current === lastInventoryJSON) return;
	lastInventoryJSON = current; //line 218

	insertItemMastery()

	DOM.totalWater().textContent = waterUnit(gameData.water.waterTotal);
	DOM.waterSpent().textContent = waterUnit(gameData.water.totalWaterSpent);
}

export function syncLiquidAnimation() {
	const seconds = gameData.water.tickSpeed / 1000;
	document.documentElement.style.setProperty(
		'--tick-duration',
		`${seconds}s`
	);
}