import { $, requestRender, syncLiquidAnimation } from "../render.js"
import { upgradeDefs } from "../def.js"
import { duration } from "../util.js"
import { gameData } from "../../../images"

export { xpRequired, canAffordUpgrade, checkMaxLevel, gainSkillXP, waterDrop, checkUnlocks, insertWaterUpgrades, getUpgradeCost, insertExploreAreas, tickStamina }

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

