import { duration } from "./util.js"
import { gameData } from "../../main.js"
export { upgradeDefs, exploreDefs, item_master_data, craftRecipes, researchDefs }

const upgradeDefs = {
	'drippy-faucet': {
		name: "Sad Drippy Faucet",
		desc: "Another faucet, another leak. +1 drop.",
		cost: level => ({
			water: level === 0 ? DROP_ML : DROP_ML * level * 2
		}),
		effects: [
			(state, level, modifier) => {
				state.waterPerTick += level * modifier * DROP_ML;
				state.tickSpeed = 2000;
			}
		],
		unlock: (state) => state.amount >= 0,
		maxLevel: null,
	},
	'toilet-flapper': {
		name: "Insecure Toilet Flap",
		desc: "No, not the toilet too! +5 drops.",
		cost: level => ({
			water: level === 0 ? 1 : 1 * 1.5 * level
		}),
		effects: [
			(state, level, modifier) => {
				state.waterPerTick += level * modifier * 0.25
			}
		],
		unlock: (state) => state.amount >= 1,
		unlockText: 'Have 1 mL of water',
		maxLevel: 20,
	},
	'shower-head': {
		name: "Depressed Shower Head",
		desc: "Let it all out. +20 drops/s.",
		cost: level => ({
			water: level === 0 ? 50 : 50 * Math.pow(level, 1.25)
		}),
		effects: [
			(state, level, modifier) => {
				state.waterPerTick += level * modifier * 1
			}
		],
		unlock: (state) => state.amount >= 25,
		unlockText: 'Have 25 mL of water',
		maxLevel: 20,
	},
	'gasket': {
		name: "Broken Down Gasket",
		desc: "Sabotage gaskets. +100 leak rate",
		cost: level => ({
			water: level === 0 ? 100 : 100 + Math.pow(level, 1.3)
		}),
		effects: [
			(state, level, modifier) => {
				state.tickSpeed -= level * 100;
			}
		],
		unlock: (state) => state.amount >= 100,
		unlockText: 'Have 100 mL of water',
		maxLevel: 5,
	},
	'loose-valve': {
		name: "Downtrodden Valve",
		desc: "Loosen a valve. Improve performance of leaky faucets by 100%.",
		cost: level => ({
			items: {
				simple_hammer: level === 0 ? 1 : Math.floor(1 + Math.pow(level, 2),)
			}
		}),
		effects: [
			(state, level) => {
				for (const id of ['drippy-faucet', 'toilet-flapper', 'shower-head']) {
					if (state.upgrades[id]) {
						state.upgrades[id].modifier = 1 + level;
						console.log(state.upgrades[id].modifier)
					}
				}
			}
		],
		unlock: (state) => state.level >= 2,
		unlockText: 'Reach Level 5',
		maxLevel: 4,
	},
	'rust-buildup': {
		name: "Rusty Buildup",
		desc: "Corrosion worsens all leaks by 10% per level.",
		cost: level => ({
			water: level === 0 ? 300 : 300 * Math.pow(level, 1.5)
		}),
		effects: [
			(state, level) => {
				for (const id of ['drippy-faucet', 'toilet-flapper', 'shower-head']) {
					if (state.upgrades[id]) {
						state.upgrades[id].modifier = 1 + level * 0.10;
					}
				}
			}
		],
		unlock: (state) => state.level >= 6,
		unlockText: 'Reach Level 6',
		maxLevel: 10,
	}
}

const exploreDefs = {
	'park': {
		name: 'Park',
		icon: 'tree.png',
		desc: 'A park crowded with people and kids... and irate sprinklers.',
		lootChance: 50,
		drops: [
			['stone', 55.618],
			['wood', 55.962],
			['clover', 55.236],
			['blueberry', 50.111],
			['mushroom', 28.127],
			['feather', 28.155],
			['toy_bucket', 0.0089],
			['toy_shovel', 0.0089],
			['teddy_bear', 0.00035]
		],
		enemies: [],
		startText: "You take a stroll into the local park...",
		flavorText: {
			idle: [
				"You hear a mouse rustling in the grass.",
				"An owl hoots in the distance.",
				"Animal tracks lead up to the swings. Did	they have fun on the playground?",
				"You see some deer sniffing the swings and booping it with their nose. What delightful creatures!",
				"Some squirrels run up and down the playground, chittering as they slip down the slide.",
				"There's trash dumped in the corner of the park. If someone's living here, maybe you should leave.",
				"There's a pail and shovel in the sand. Some poor kid must've lost their toys.",
				"You come to a fork in a road. You decide to go right.	Hopefully that's right.",
				"There's some chalk drawings on the ground. You can't tell of what.",
				"Water drips onto you from a tree branch. If only you had something to collect the water…",
				"The sprinkler next to you turns on randomly! You wind up soaking wet. If only you had something to collect the water…",
			],
			found: [
				"On the ground, you find [ITEM]. You place it in your bag.",
				"You find [ITEM] in the grass. You place it in your bag.",
				"You find a box with [ITEM] inside. You place it in your bag.",
			]
		}
		
	},
	'neighborhood': {
		name: 'Neighborhood',
		icon: 'houses.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'school': {
		name: 'School Grounds',
		icon: 'school.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'downtown': {
		name: 'Downtown',
		icon: 'bridge.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'slums': {
		name: 'Slums',
		icon: 'city.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'abandoned': {
		name: 'Abandoned Buildings',
		icon: 'abandoned.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'tunnel': {
		name: 'Transit Tunnel',
		icon: 'hole.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
	'beach': {
		name: 'The Beach',
		icon: 'beach.png',
		desc: '',
		lootChance: 0,
		drops: [],
		enemies: [],
		startText: '',
		flavorText: {
			idle: [],
			found: [],
		}
	},
}

const item_master_data = {
	// Fluent Emoji High Contrastby Microsoft Corporation https://icon-sets.iconify.design/fluent-emoji-high-contrast/
	// Phosphor by Phosphor Icons https://icon-sets.iconify.design/ph/
	stone: {
		name: 'stone',
		type: 'item',
		icon: 'stone.png',
		desc: 'The stone feels conflicted.',
		sell: 1,
		xp: 3,
	},
	wood: {
		name: 'wood',
		type: 'item',
		icon: 'wood.png',
		desc: `Somethin' 'bout some kinda chuck`,
		sell: 1,
		xp: 3,
	},
	clover: {
		name: 'clover',
		type: 'item',
		icon: 'clover.png',
		desc: 'The holy tree-nity',
		sell: 1,
		xp: 3,
	},
	mushroom: {
		name: 'mushroom',
		type: 'item',
		icon: 'mushroom.png',
		desc: 'Badger badger',
		sell: 7,
		xp: 5,
	},
	feather: {
		name: 'feather',
		type: 'item',
		icon: 'feather.png',
		desc: '',
		sell: 8,
		xp: 5,
	},
	'toy_bucket': {
		name: 'toy bucket',
		type: 'item',
		icon: 'bucket.png',
		desc: 'Do you wanna build a sand castle?',
		sell: 10,
		xp: 100,
	},
	'toy_shovel': {
		name: 'toy shovel',
		type: 'item',
		icon: 'shovel.png',
		desc: 'I never see you anymore.',
		sell: 10,
		xp: 100,
	},
	'teddy_bear': {
		name: 'teddy bear',
		type: 'item',
		icon: 'teddy-bear.png',
		desc: 'turn around',
		sell: 1050,
		xp: 1150,
	},
	blueberry: {
		name: "blueberry",
		type: 'consumable',
		icon: 'blueberries.png',
		desc: "don't put these in pic-a-nic baskets",
		sell: 8,
		xp: 5,
		exploreUsable: true,
		effect: [
			(state) => {
				state.explore.stamina += 1;
			}
		],
	},
	'blueberry_pie': { //rare item that gives lots of stamina or item drops?
		name: 'blueberry pie',
		type: 'consumable',
		icon: 'pie.png',
		desc: 'taste not like ew',
		sell: 100000,
		xp: 5000,
	},
	ashcake: {
		name: 'ashcake',
		type: 'consumable',
		icon: 'noimg.png',
		desc: 'like hardtack but hard ew. Adds 5 stamina.',
		sell: 100,
		xp: 100,
		exploreUsable: true,
		effect: state => state.explore.stamina += 5,
	},
	'bottled_water': {
		name: 'bottled water',
		type: 'consumable',
		icon: 'noimg.png',
		desc: 'Adds 75 stamina.',
		sell: 1000, 
		xp: 200,
		exploreUsable: true,
		effect: state => state.explore.stamina += 75,
	},
	'simple_hatchet': {
		name: 'simple hatchet',
		type: 'equipment',
		icon: 'axe.png',
		desc: 'A little goes a long way.',
		sell: 50,
		xp: 20,
		equipSlot: ['MAINHAND'],
		effect: '', // chance to explore without consuming stamina
	},
	'simple_hammer': {
		name: 'simple hammer',
		type: 'equipment',
		icon: 'hammer.png',
		desc: 'A little goes a long way. Crafting Speed +15%',
		sell: 50,
		xp: 20,
		equipSlot: ['MAINHAND'],
		effect: state => state.craftSpeedMult += 0.15
	},
}

const craftRecipes = {
	'simple_hatchet': {
		requires: {
			wood: 5,
			stone: 1,
		},
		quantity: 1,
		unlock: {
			level: 1
		},
		duration: duration({s: 6}),
		category: 'equipment'
	},
	'simple_hammer': {
		requires: {
			wood: 5,
			stone: 1,
		},
		quantity: 1,
		unlock: {
			level: 1
		},
		duration: duration({s: 6}),
		category: 'equipment'
	},
	board: {
		requires: {
			wood: 2
		},
		quantity: 1,
		unlock: {
			level: 1
		},
		duration: duration({s: 6}),
		category: 'items'
	},
	'small_bucket': {
		requires: {
			board: 5,
		},
		quantity: 1,
		unlock: {
			level: 2
		},
		duration: duration({s: 10}),
		category: 'items'
	},
}

const researchDefs = {
	// CORE
	'research_discount': {
		name: "Research Points Discount",
		type: 'core',
		desc: "Reduces research cost for all research.",
		max: 99,
		cost: level => level === 0 ? 5 : Math.pow(level, 3.15) + 1,
		duration: level => level === 0 ? duration({m: 5}) : duration({ m: 5 * Math.pow(level, 2) }),
		effect: (state, level) => state.researchCostReduction = Math.max(0.004, level * 0.004),
		effectText: level => level === 0 ? '0.00x' : `${(Math.max(0.004, level * 0.004)).toFixed(3)}x`,
		unlock: () => gameData.water.level >= 10,
		unlockText: "Reach Level 10"
	},
	'research_speed': {
		name: 'Research Speed',
		type: 'core',
		desc: 'Reduce time needed to complete research.',
		max: 99,
		cost: level => level === 0 ? 5 : Math.pow(level, 2.1) * 5,
		duration: level => level === 0 ? duration({m: 5.5}) : duration({ m: 5.5 * Math.pow(level, 2) }),
		effect: (state, level) => state.durationMultiplier = Math.max(0.002, level * 0.002),
		effectText: level => level === 0 ? '0.00x' : Math.max(0.002, level * 0.002).toFixed(3),
		unlock: () => gameData.water.level >= 10,
		unlockText: "Reach Level 10"
	},
	'research_gain': {
		name: 'RP Gain',
		type: 'core',
		desc: 'Increase research points gain.',
		max: 7, 
		cost: level => level === 0 ? 5 : Math.pow(level + 5, 3),
		duration: level => level === 0 ? duration({m: 10}) : duration({ m: 10 * Math.pow(level, 2) }),
		effect: (state, level) => state.rpMult = level,
		effectText: level => level === 0 ? '0.00x' : `${level.toFixed(2)}x`,
		unlock: [
			() => gameData.water.level >= 15,
			() => gameData.explore.level >= 15,
			() => gameData.craft.level >= 15,
		],
		unlockText: "Reach Water, Explore, & Craft Level 30"
	},
	
	// WATER
	'drop_amount': {
		name: 'Drop Amount',
		type: 'water',
		desc: 'Increase water drop amount.',
		max: 99,
		cost: level => level === 0 ? 1 : Math.ceil(1 + Math.pow(level, 1.1)),
		duration: level => duration({s: Math.pow(level + 1, 2.54) }),
		effect: (state, level) => state.tickMult = 1 + (level * 0.02),
		effectText: level => (1 + (level * 0.02)).toFixed(2) + 'x',
		unlock: () => gameData.water.level >= 1,
	},
	'drop_rate': {
		name: 'Leak Rate',
		type: 'water',
		desc: 'Increase water leak rate.',
		max: 99,
		cost: level => level === 0 ? 1 : Math.ceil(1 + Math.pow(level, 1.1)),
		duration: level => duration({m: Math.pow(level + 1, 2.54) + 5}),
		effect: (state, level) => state.tickSpeedMult = 1 + (level * 0.02),
		effectText: level => (1 + (level * 0.02)).toFixed(2) + 'x',
	},
	'reduce_water_cost': {
		name: 'Water Upgrade Cost',
		type: 'water',
		desc: 'Reduce the upgrade costs.',
		max: 99,
		cost: level => Math.pow(level, 1.1)*1.5,
		duration: level => duration({m: Math.pow(level + 1, 2.54) + 5}),
		effect: (state, level) => state.upgradeCostMult = 1 + (level * 0.02),
		effectText: level => (1 + (level * 0.02)).toFixed(2) + 'x',
	},
	'research_point_chance_water': {
		name: 'Research Point Chance',
		type: 'water',
		desc: 'Chance to find research point in leaks.',
		max: 99,
		cost: level => Math.pow(level, 1.5) * 2.5,
		duration: level => duration({m: Math.pow(level + 1, 2.6) + 10}),
		effect: level => state.waterChance = level * 0.0000001, //0.000001% chance per tick,
		effectText: level => (level * 0.0000001 * 100).toFixed(5) + "%",
		unlock: () => gameData.water.level >= 30,
		unlockText: "Reach Level 30"
	},
	
	// EXPLORE
	'improve_stamUse_park': {
		name: 'Efficient Explorer I',
		type: 'explore',
		desc: 'Increase Explore Efficiency in Parks.',
		max: 99,
		cost: level => Math.pow(level, 2.2) + 5,
		duration: level => duration({m: Math.pow(level + 1, 2.2) + 2}),
		effect: (level) => gameData.explore.zones.park.stamUsed = level,
		effectText: level => '+' + level,
		unlock: () => gameData.explore.level >= 2,
		unlockText: "Reach Explore Level 2"
	},
	'improve_staminaMax': {
		name: 'Increase Max Stamina',
		type: 'explore',
		desc: 'Increase maximum amount of stamina.',
		max: 99,
		cost: level => Math.pow(level, 1.5) * 2.5,
		duration: level => duration({m: Math.pow(level + 1, 2.7) + 3}),
		effect: (level) => gameData.explore.staminaMax += level * 25,
		effectText: level => '+' + level * 25,
		unlock: () => gameData.explore.level >= 5,
		unlockText: "Reach Explore Level 5"
	},
	'research_point_chance_explore': {
		name: 'Research Point Chance',
		type: 'explore',
		desc: 'Chance to find research point in leaks.',
		max: 99,
		cost: level => Math.pow(level, 1.5) * 2.5,
		duration: level => duration({m: Math.pow(level + 1, 2.6) + 10}),
		effect: (level) => chance = level * 0.0000001, //0.000001% chance per tick
		effectText: level => (level * 0.0000001 * 100).toFixed(5) + "%",
		unlock: () => gameData.explore.level >= 30,
		unlockText: "Reach Explore Level 30"
	},
	
	// CRAFT
	'improve_CraftSpeed': {
		name: "Increase Craft Speed",
		type: 'craft',
		desc: 'Reduce time to craft items.',
		max: 99,
		cost: level => Math.pow(level, 1.5) * 2.5,
		duration: level => duration({m: Math.pow(level + 1, 2.6) + 10}),
		effect: (state, level) => state.craftSpeedMult += level * 0.02,
		effectText: level => `+${(level * 0.02).toFixed(2)}x`,
		unlock: () => gameData.craft.level >= 10,
		unlockText: "Reach Craft Level 10"
	}
};