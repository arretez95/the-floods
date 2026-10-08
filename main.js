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
import { checkItemMastery, insertItemMastery } from "./lib/js/game/achievements.js"
import { renderUnequipBtn } from "./lib/js/game/inventory.js"

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
	insertItemMastery();
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