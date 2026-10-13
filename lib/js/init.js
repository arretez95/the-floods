import { gameData } from "../../main.js";
import { msgPopup } from "./util.js";
import { DROP_ML } from "./game/logic.js"
import { $ } from "./render.js";
import { duration } from "./util.js";
import { saveGame, loadGame } from "./storage.js";


export { initUpgrades, initExplore, initResearch, initialState, initAutosave }

function initUpgrades(defs) {
	const upgrades = {};
	
	for (const key in defs) {
		upgrades[key] = {
			level: 0,
			modifier: 1,
		}
	}
	
	return upgrades;
}

function initExplore(defs) {
	const zones = {};
	
	for (const key in defs) {
		zones[key] = {
			complete: 0,
			stamUsed: 0,
			stamPerClick: 1
		}
	}
	
	return zones
}

function initResearch(defs) {
	const research = {}
	
	for (const key in defs) {
		research[key] = {
			level: 0
		}
	}
	return research
}

function initialState() {
	return {
		version: 0,
		start: Date.now(),
		latest: Date.now(),
		lastSave: '',
		player: {
			name: 'Adri',
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
			maxWater: 500,
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
		}
}
}

function initAutosave() {
	setInterval(() => {
		if ($('#autosave').checked) {
			saveGame(gameData)
			msgPopup('Game saved')
		}
	}, duration({m: 5}))
}