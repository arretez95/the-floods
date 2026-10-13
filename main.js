// ===============================
// 		Init
// ===============================
import { initUpgrades, initExplore, initResearch, initAutosave } from "./lib/js/init.js"
import { $, requestRender, syncLiquidAnimation, renderUI } from "./lib/js/render.js"
import { msgPopup } from "./lib/js/util.js"
import { DROP_ML, waterTick, gameTick } from "./lib/js/game/logic.js"
import { checkUnlocks, insertWaterUpgrades } from "./lib/js/game/water.js"
import { insertExploreAreas } from "./lib/js/game/explore.js"
import { insertCraftRecipes } from "./lib/js/game/craft.js"
import { insertResearchItems } from "./lib/js/game/research.js"
import { upgradeDefs, exploreDefs, researchDefs } from "./lib/js/def.js"
import { insertItemMastery } from "./lib/js/game/achievements.js"
import { renderUnequipBtn } from "./lib/js/game/inventory.js"
import { loadGame, saveGame } from "./lib/js/storage.js"

export let gameData = loadGame()
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
	msgPopup("Game started")

	gameData.water.upgrades = initUpgrades(upgradeDefs);
	gameData.explore.zones = initExplore(exploreDefs);
	gameData.research.complete = initResearch(researchDefs);
	requestRender();
	requestAnimationFrame(gameTick);
	initAutosave();
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