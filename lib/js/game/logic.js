import { $, requestRender } from "../render.js"
import { tickStamina } from "./explore.js"
import { gameData } from "../../../main.js"
import { waterDrop, spawnDropsForWaterGain, checkUnlocks } from "./water.js"
import { updateCrafting } from "./craft.js"
import { updateResearch } from "./research.js"

export { xpRequired, gainSkillXP, waterTick, gameTick, }

export const DROP_ML = 0.05;

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
// 		XP & Leveling
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
