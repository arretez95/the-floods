// ===============================
// 		Init
// ===============================
const DROP_ML = 0.05;
let lastInventoryJSON = "";

function initUpgrades(defs) {
	const upgrades = {};
	
	for (const key in defs) {
		upgrades[key] = {
			level: 0,
			modifier: 1,
		};
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

var gameData = {
	player: {
		name: 'Adri',
	},
	water: {
		level: 1,
		xp: 0,
		amount: DROP_ML, //counts in mL; current amount of flooding water
		waterTotal: 0, //total water flooded over time
		waterPerTick: 0, //in mL; 0.05 mL = 1 drop
		tickSpeed: 9E9,
		totalWaterSpent: 0,
		upgrades: {},
		upgradesUnlocked: {},
	},
	explore: {
		level: 1, 
		xp: 0,
		stamina: 50,
		staminaMax: 50,
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
		points: 1,
		complete: {},
		researchUnlocked: {},
	},
	achievements: {
		// Future achievement implementations
	},
	inventory: {
		items: {
			wood: 25,
		},
		consumables: {},
		equipment: {
			simple_hammer: 1,
			simple_hatchet: 1,
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
		maxLevel: 20,
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
					}
				}
			}
		],
		unlock: (state) => state.level >= 5,
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
			['blueberry', 70.111],
			['mushroom', 28.127],
			['feather', 28.155],
			['toy_bucket', 0.00089],
			['toy_shovel', 0.00089],
			['teddy_bear', 0.000035]
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
		icon: 'axe.png',
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
		},
		quantity: 1,
		unlock: {
			level: 1
		},
		duration: duration({s: 6}),
		category: 'equipment'
	}
}

const researchDefs = {
	// CORE
	'research_discount': {
		name: "Research Points Discount",
		type: 'core',
		desc: "Reduces research cost for all research.",
		max: 99,
		cost: level => level === 0 ? 5 : Math.pow(level, 3.15) + 1,
		duration: level => level === 0 ? duration({m: 10}) : duration({ m: 10 * Math.pow(level, 3) }),
		effect: (state, level) => state.researchCostReduction = Math.max(0.004, level * 0.004),
		effectText: level => level === 0 ? '0.00x' : `${(Math.max(0.004, level * 0.004)).toFixed(3)}x`,
		unlock: () => gameData.water.level >= 30,
		unlockText: "Reach Level 30"
	},
	'research_speed': {
		name: 'Research Speed',
		type: 'core',
		desc: 'Reduce time needed to complete research.',
		max: 99,
		cost: level => level === 0 ? 5 : Math.pow(level, 2.1) * 5,
		duration: level => duration({m: Math.pow(level + 1, 2.54) + 4}),
		effect: (state, level) => state.durationMultiplier = Math.max(0.002, level * 0.002),
		effectText: level => level === 0 ? '0.00x' : Math.max(0.002, level * 0.002).toFixed(3),
		unlock: () => gameData.water.level >= 30,
		unlockText: "Reach Level 30"
	},
	'research_gain': {
		name: 'RP Gain',
		type: 'core',
		desc: 'Increase research points gain.',
		max: 7, 
		cost: level => level === 0 ? 5 : Math.pow(level + 5, 3),
		duration: level => duration({m: Math.pow(level + 1, 2.54) + 4}),
		effect: (state, level) => state.rpMult = level,
		effectText: level => level === 0 ? '0.00x' : `${level.toFixed(2)}x`,
		unlock: [
			() => gameData.water.level >= 30,
			() => gameData.explore.level >= 30,
			() => gameData.craft.level >= 30,
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
		duration: level => duration({m: Math.pow(level + 1, 2.54) }),
		effect: (state, level) => tickMult = 1 + (level * 0.02),
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
		unlock: () => gameData.explore.level >= 5,
		unlockText: "Reach Explore Level 5"
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

// ===============================
// 		HELPERS
// ===============================

function clamp(n, min = -Infinity, max = Infinity) {
	return Math.max(min, Math.min(max, n));
}

function random(min = 0, max = 99) {
	return Math.random() * (max - min) + min;
}

function randArray(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function duration({ d = 0, h = 0, m = 0, s = 0, ms = 0 } = {}) {
	//usage: duration({ d: 1, h: 2, s: 3, ms: 10 }); // 93720010
	const SECOND = 1000;
	const MINUTE = 60 * SECOND;
	const HOUR	 = 60 * MINUTE;
	const DAY		= 24 * HOUR;
	
	return (
		ms +
		s * SECOND +
		m * MINUTE +
		h * HOUR +
		d * DAY
	);
}

function msToHMS(ms) {
	let seconds = Math.floor(ms / 1000)
	
	const hours = Math.floor(seconds / 3600)
	seconds %= 3600
	
	const minutes = Math.floor(seconds / 60)
	seconds %= 60
	
	return (
		(hours > 0 ? hours + 'h ' : '') +
		(minutes > 0 ? minutes + 'm ' : '') +
		(seconds > 0 ? seconds + 's' : '')
	)
}

function waterUnit(w, d = 0) {
	if (w === 0) return "0 drops";
	if (w === DROP_ML) return "1 drop";
	
	const units = [
		{ threshold: 1e15, divisor: 1e15, label: " km³" },
		{ threshold: 1e12, divisor: 1e12, label: " hm³" },
		{ threshold: 1e9, divisor: 1e9, label: " dam³" },
		{ threshold: 1e6, divisor: 1e6, label: " m³" },
		{ threshold: 1000, divisor: 1000, label: "L" },
	];
	
	for (const { threshold, divisor, label } of units) {
		if (w >= threshold) return (w / divisor).toFixed(2) + label;
	}
	
	if (w < 1) {
		const drops = w / DROP_ML;
		return (d === 1 ? drops.toFixed(2) : Math.floor(drops)) + " drops";
	}
	
	return w.toFixed(2) + " mL";
}

function numberFormat(num, d = 0) {
	if (num >= 1e9) return (num / 1e9).toFixed(d) + "B";
	if (num >= 1e6) return (num / 1e6).toFixed(d) + "M";
	return num.toLocaleString()
}

function titleCase(s) {
	return s.toLowerCase()
	.split(' ')
	.map(word => word.charAt(0).toUpperCase() + word.slice(1))
	.join(' ');
}

function getInventoryCount(id) {
	return (
		gameData.inventory.items[id] ??
		gameData.inventory.equipment[id] ??
		gameData.inventory.consumables[id] ??
		0
	)
}

// ===============================
// 		UI HANDLERS
// ===============================

function openPanel(e) {
	const panel = e.currentTarget.dataset.tab;
	
	document.querySelectorAll('.active').forEach(el =>
		el.classList.remove('active')
	);
	
	e.currentTarget.classList.add('active');
	document.getElementById(panel).classList.add('active');
	
	switch (panel) {
		case 'explore':
		insertExploreAreas();
		case 'crafts':
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
// 		RENDERING
// ================================

let needsRender = false;
let tickTimer = null;
let stamTimer = null;
let lastCraftUpdate = 0

const DOM = {
	waterAmount: () => document.getElementById('water-amount'),
	waterProdRate: () => document.getElementById('water-prod-rate'),
	waterTick: () => document.getElementById('water-tick'),
	xpAmount: () => document.getElementById('xp-amount'),
	waterLevel: () => document.getElementById('water-level'),
	water: () => document.getElementById('water'),
	totalWater: () => document.getElementById('total-water'),
	waterSpent: () => document.getElementById('water-spent'),
	
	exploreLevel: () => document.getElementById('explore-level'),
	exploreXpAmount: () => document.getElementById('explore-xp-amount'),
	
	craftLevel: () => document.getElementById('crafts-level'),
	craftXpAmount: () => document.getElementById('crafts-xp-amount'),
	
	researchPts: () => document.getElementById('research-points-short'),
	research: () => document.getElementById('research-points'),
	
	inventory: () => document.querySelector('#inv'),
	inventoryItems: () => document.querySelector('#inventory-list'),
	
	attributesHeader: () => document.querySelector('#attributes .colheader'),
};

function requestRender() {
	if (needsRender) return;
	needsRender = true;
	
	requestAnimationFrame(() => {
		renderUI();
		needsRender = false;
	});
}

function renderUI() {
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
	} else {
		DOM.researchPts().innerHTML = ''
	}
	
	DOM.research().textContent = "Research Points: " + Math.floor(gameData.research.points) ?? '';
}


function renderInventory() {
	const current = JSON.stringify({
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
		const nameA = (item_master_data[idA]?.name || idA).toLowerCase()
		const nameB = (item_master_data[idB]?.name || idB).toLowerCase()
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
		img.src = `/images/${item_master_data[id]?.icon || ""}`;
		iconDiv.appendChild(img);
		
		const nameDiv = document.createElement('div');
		nameDiv.classList.add('inventory-name');
		const name = item_master_data[id]?.name || id;
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

function renderEquipment() {
	document.querySelectorAll('#equipment-list [data-slot]').forEach(el => {
		const slot = el.dataset.slot
		const itemId = gameData.equipped[slot]

		if (itemId) {
			// Show icon
			el.innerHTML = `<img src="/images/${item_master_data[itemId].icon}" alt="${item_master_data[itemId].name}">`
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
				([id, q]) => `${q} ${(item_master_data[id].name)}`
			)
		].filter(Boolean).join(' + ')
		
		el.disabled = !canAffordUpgrade(cost);
	});
	
	checkMaxLevel();
}

/* function renderAttributes() {
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
} */

function renderAchievements() {
	DOM.totalWater().textContent = waterUnit(gameData.water.waterTotal);
	DOM.waterSpent().textContent = waterUnit(gameData.water.totalWaterSpent);
}

function syncLiquidAnimation() {
	const seconds = gameData.water.tickSpeed / 1000;
	document.documentElement.style.setProperty(
		'--tick-duration',
		`${seconds}s`
	);
}

// ================================
// 		GAME LOGIC
// ================================

/* Water */
function recalcStats() {
	// reset derived stats
	gameData.water.waterPerTick = 0;
	
	Object.entries(gameData.water.upgrades).forEach(([id, data]) => {
		const def = upgradeDefs[id];
		if (!def?.effects) return;
		
		def.effects.forEach(effect => {
			effect(gameData.water, data.level, data.modifier);
		});
	});
}

function waterDrop() {
	gameData.water.waterTotal += gameData.water.waterPerTick;
	gameData.water.amount += gameData.water.waterPerTick;
}

function getDropsPerTick() {
	return gameData.water.waterPerTick / DROP_ML;
}

/* XP and Leveling */

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
	
	requestRender();
}


/* Water Upgrades */

function buildUpgradeElement(id) {
	const def = upgradeDefs[id];
	const unlocked = !!gameData.water.upgradesUnlocked[id];
	
	const button = document.createElement('button');
	button.id = id;
	button.classList.add('water', 'button');
	button.disabled = !unlocked;
	
	if (!unlocked) {
		button.classList.add('locked');
		button.innerHTML = `
			<p class="upgrade-unlock">${def.unlockText}</p>
		`;
	} else {
		button.innerHTML = `
			<h3 class="upgrade-name"></h3>
			<p class="upgrade-desc">${def.desc}</p>
			<b class="upgrade-cost"></b>
		`;
	}
	
	button.addEventListener('click', () => purchaseUpgrade(id));
	return button;
}

function checkUnlocks() {
	Object.entries(upgradeDefs).forEach(([id, def]) => {
		if (gameData.water.upgradesUnlocked[id]) return;
		if (!def.unlock(gameData.water)) return;
		
		gameData.water.upgradesUnlocked[id] = true;
		
		const el = document.getElementById(id);
		if (!el) return;
		
		el.classList.remove('locked');
		el.disabled = false;
		
		el.innerHTML = `
			<h3 class="upgrade-name"></h3>
			<p class="upgrade-desc">${def.desc}</p>
			<b class="upgrade-cost"></b>
		`;
	});
}

function checkMaxLevel() {
	Object.entries(upgradeDefs).forEach(([id, def]) => {
		const level = gameData.water.upgrades[id].level;
		if (level == null) return;
		
		if (level >= (def.maxLevel ?? Infinity)) {
			const button = document.getElementById(id);
			if (!button) return;
			
			button.disabled = true;
			button.querySelector('h3').textContent = `${def.name} - Lv. MAX`;
		}
	});
}


function insertWaterUpgrades() {
	const waterPanel = document.getElementById("water");
	
	Object.keys(upgradeDefs).forEach(id => {
		if (document.getElementById(id)) return;
		
		const el = buildUpgradeElement(id);
		waterPanel.appendChild(el);
	});
}


function getUpgradeCost(id) {
	const def = upgradeDefs[id]
	const level = gameData.water.upgrades[id].level ?? 0
	
	if (typeof def.cost === 'function') {
		return normalizeUpgradeCost(def.cost(level))
	}
	
	// legacy support (optional)
	if (typeof def.baseCost === 'number') {
		return normalizeUpgradeCost({ water: def.baseCost })
	}
	
	return normalizeUpgradeCost({})
}

function normalizeUpgradeCost(cost = {}) {
	return {
		water: cost.water ?? 0,
		items: cost.items ?? {}
	}
}

function canAffordUpgrade(cost) {
	if (cost.water > gameData.water.amount) return false
	
	for (const [id, qty] of Object.entries(cost.items)) {
		const have = getInventoryCount(id)
		if (have < qty) return false
	}
	
	return true
}

function payUpgradeCost(cost) {
	// water
	if (cost.water > 0) {
		gameData.water.amount -= cost.water
		gameData.water.totalWaterSpent += cost.water
	}
	
	// items
	for (const [id, qty] of Object.entries(cost.items)) {
		const bucket =
		gameData.inventory.items[id] !== undefined
		? gameData.inventory.items
		: gameData.inventory.equipment
		
		bucket[id] -= qty
	}
}


function purchaseUpgrade(id) {
	if (!gameData.water.upgradesUnlocked[id]) return
	
	const def = upgradeDefs[id]
	const level = gameData.water.upgrades[id].level
	
	if (level >= def.maxLevel) return
	
	const cost = getUpgradeCost(id)
	if (!canAffordUpgrade(cost)) return
	
	const wasProducing = gameData.water.waterPerTick > 0
	
	payUpgradeCost(cost)
	gameData.water.upgrades[id].level++
	
	recalcStats()
	
	if (!wasProducing && gameData.water.waterPerTick > 0) {
		waterTick()
		syncLiquidAnimation()
	}
	
	requestRender()
}


/* Drops Animation */

function getDropSize() {
	const minWidth = 10;
	const minHeight = 14;
	const maxWidth = 24;
	const maxHeight = 32;
	
	const scale = Math.sqrt(getDropsPerTick());
	return {
		width: Math.min(minWidth + scale * 2, maxWidth),
		height: Math.min(minHeight + scale * 2.5, maxHeight)
	};
}

function spawnDrop(width = 10, height = 14) {
	const drop = document.createElement('div');
	drop.className = 'drop';
	
	drop.style.width = `${width}px`;
	drop.style.height = `${height}px`;
	
	const container = document.getElementById('water-container');
	container.appendChild(drop);
	
	let y = 0;
	const speed = 350; // px per second
	let last = performance.now();
	
	function animate(now) {
		const delta = (now - last) / 1000;
		last = now;
		
		y += speed * delta;
		drop.style.transform = `translate(-50%, ${y}px)`;
		
		if (y < container.clientHeight) {
			requestAnimationFrame(animate);
		} else {
			drop.remove();
		}
	}
	requestAnimationFrame(animate);
}

function spawnDropsForWaterGain(waterAmount) {
	const DROP_TIERS = [
		{ value: 20.0,	width: 26, height: 34 }, // large
		{ value: 5.0,	width: 18, height: 24 }, // medium
		{ value: DROP_ML, width: 10, height: 14 }, // small
	];
	
	let remaining = waterAmount;
	
	if (gameData.water.waterPerTick < 3000) {
		for (const tier of DROP_TIERS) {
			const count = Math.floor(remaining / tier.value);
			if (count <= 0) continue;
			
			for (let i = 0; i < count; i++) {
				spawnDrop(tier.width, tier.height);
			}
			
			remaining -= count * tier.value;
		}
	} else {
		setTimeout(() => { 
			if (!document.querySelector('.stream')) spawnStream();
		}, gameData.water.tickSpeed * 0.9);
	}
}

function spawnStream() {
	const stream = document.createElement('div');
	stream.className = 'stream';
	const container = document.getElementById('water-container');
	
	container.appendChild(stream);
}

// ================================
// 		EXPLORE
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
	
	const explorePanel = document.getElementById("explore");
	const el = buildExploreElement(id);
	
	if (el) explorePanel.appendChild(el);
	
	const removeEl = explorePanel.getElementsByClassName("button")
	while (removeEl.length > 0) {
		removeEl[0].parentNode.removeChild(removeEl[0])
	}
	
	document.getElementById('continue').focus()
}

function buildExploreElement(id) {
	const def = exploreDefs[id];
	const explorePanel = document.getElementById('explore')
	
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
		<div class="consumable-name">Continue</div>
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
		const itemDef = item_master_data[itemId];
		if (!itemDef?.exploreUsable || qty <= 0) return
		
		itemsList.appendChild(buildConsumableButton(itemId));
	});
	
	options.appendChild(continueBtn)
	options.appendChild(itemsList)
	explorePanel.appendChild(console)
	explorePanel.appendChild(options)
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
			
			if (item_master_data[item]?.type === "consumable") {
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
			${Object.entries(loot).map(([item,count]) => `<b>${item_master_data[item].name}</b> ${count}`).join('<br>')}`;
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
			
			if (item && item_master_data[item]) {
				const itemDef = item_master_data[item];
				messages.push(randArray(def.flavorText.found).replace('[ITEM]', `<b>${itemDef.name}</b>`));
				addItemToInventory(item);
				
				if (item_master_data[item]?.type === "consumable") {
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
	document.getElementById("continue").children[2].textContent =
	`${gameData.explore.stamina} / ${gameData.explore.staminaMax}`;
	
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

function calcExploreXp(itemId) {
	gainSkillXP('explore', item_master_data[itemId].xp);
}

function buildConsumableButton(itemId) {
	const itemDef = item_master_data[itemId];
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
	
	/* li.innerHTML = `
	<div class="consumable-name">${titleCase(itemDef.name)}</div>
	<div class="consumable-qty">${gameData.inventory.consumables[itemId]}</div>
	`; */
	
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


function useExploreConsumable(itemId) {
	const qty = gameData.inventory.consumables[itemId];
	if (!qty || qty <= 0) return;
	
	const itemDef = item_master_data[itemId];
	if (!itemDef?.effect) return;
	
	// Apply effects
	itemDef.effect.forEach(fn => fn(gameData));
	
	// Consume item
	gameData.inventory.consumables[itemId]--;
	
	// === UPDATE CONTINUE BUTTON STAMINA ===
	const continueBtn = document.getElementById("continue");
	if (continueBtn) {
		continueBtn.children[2].textContent =
		`${gameData.explore.stamina} / ${gameData.explore.staminaMax}`;
	}
	
	// === UPDATE CONSUMABLE QTY ===
	const consumQty = document.querySelector(
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
	
	if (explore.stamina >= explore.staminaMax) return
	
	if (now - explore.staminaTick < duration({ m: 10 })) return
	
	explore.staminaTick = now
	
	explore.stamina = clamp(explore.stamina + 20, 0, explore.staminaMax)
	
	// update stamina UI
	const el = document.getElementById('continue')
	if (el) {
		el.children[2].textContent = `${explore.stamina} / ${explore.staminaMax}`
	}
}


// ================================
// 		Crafting
// ================================

function insertCraftRecipes() {
	const panel = document.getElementById('crafts')
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
	const def = item_master_data[id]
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
		const reqDef = item_master_data[reqId]
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
		const reqDef = item_master_data[reqId]
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
	const item = item_master_data[job.id]
	const craftConsole = document.querySelector('.craft-console')
	if (!craftConsole) return null
	
	craftConsole.innerHTML = ''
	
	const icon = new Image()
	icon.src = `/images/${item.icon}`
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
			const reqDef = item_master_data[reqId]
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
			const reqDef = item_master_data[reqId]
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
	
	const itemDef = item_master_data[craft.id]
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
		const inventory = INVENTORY_BUCKETS[itemDef.type]()
		inventory[craft.id] = (inventory[craft.id] ?? 0) + craft.amount
		gameData.craft.proficiency[craft.id] = (gameData.craft.proficiency[craft.id] ?? 0) + craft.amount
		
		gainSkillXP('craft', itemDef.xp)
		insertCraftRecipes()
		gameData.crafting.active = null
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
			const reqDef = item_master_data[reqId]
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



// ================================
// 		Research
// ================================
function researchUnlocked(id) {
	const def = researchDefs[id];
	if (!def.unlock) return true;
	if (Array.isArray(def.unlock)) {
		return def.unlock.every(fn => fn());
	}
	return def.unlock();
}

function buildResearchElement(id) {
	const def = researchDefs[id];
	const level = gameData.research.complete[id]?.level ?? 0;
	
	const mkDiv = (cls, text) => {
		const d = document.createElement('div');
		d.className = cls;
		if (text !== undefined) d.innerHTML = text;
		return d;
	};
	
	// Root element
	const el = mkDiv('button');
	el.dataset.researchId = id;
	
	// Unlock check
	if (!researchUnlocked(id)) {
		el.classList.add('locked');
		const req = mkDiv('requirement', def.unlockText || "Locked");
		el.appendChild(req);
	} else {
		// Research info
		const research = mkDiv('research');
		research.append(
			mkDiv('research-name', `${def.name} - Lv. ${level}`),
			mkDiv('research-desc', `${def.desc}<br>${def.effectText ? def.effectText(level) + ' -> ': ''} ${def.effectText ? def.effectText(level + 1): ''}`),
		);
		
		
		// Cost
		const required = mkDiv('required');
		const cost = mkDiv('research-cost');
		cost.textContent = `${getResearchCost(id).amount} RP`;
		required.appendChild(cost);
		required.appendChild(mkDiv('research-time', msToHMS(def.duration(level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)))))
		
		/* // Progress
		const progressEl = mkDiv('progress-div');
		progressEl.appendChild(mkDiv('progress-bar')); */
		
		// Assemble
		el.append(research, required/* , progressEl */);
		
		el.addEventListener('click', () => {
			if (!gameData.research.active) startResearch(id);
		});
	}
	
	return el;
}

function insertResearchItems() {
	const researchPanel = document.getElementById('research')
	
	const sections = {}
	
	Object.entries(researchDefs).forEach(([id, def]) => {
		const type = def.type ?? 'other'
		
		if (!sections[type]) {
			const section = document.createElement('div')
			section.classList.add('research-section')
			section.id = `research-${type}`
			
			const header = document.createElement('h2')
			header.textContent = type.toUpperCase()
			
			section.appendChild(header)
			researchPanel.appendChild(section)
			
			sections[type] = section
		}
		
		const el = buildResearchElement(id)
		sections[type].appendChild(el)
	})
}

function getResearchCost(id) {
	const def = researchDefs[id];
	const level = gameData.research.complete[id]?.level ?? 0;
	
	let baseCost = 0;
	if (typeof def.cost === 'function') {
		baseCost = def.cost(level);
	} else {
		baseCost = def.cost ?? 0;
	}
	
	// Apply global discount multiplier (default 1 if not set)
	const multiplier = gameData.researchCostReduction ?? 1;
	if (multiplier >= 1) {
		const finalCost = baseCost
		return { amount: finalCost };
	} else {
		const finalCost = Math.ceil(baseCost * (1 - multiplier));
		return { amount: finalCost };
	}
	
}

function startResearch(id) {
	if (gameData.research.active) return
	
	const def = researchDefs[id]
	const level = gameData.research.complete[id]?.level ?? 0
	const cost = getResearchCost(id).amount
	
	if (gameData.research.points < cost) return
	
	gameData.research.points -= cost
	
	const mkDiv = (cls, text) => {
		const d = document.createElement('div');
		d.className = cls;
		if (text !== undefined) d.textContent = text;
		return d;
	};
	
	// Progress
	const progressEl = mkDiv('progress-div');
	progressEl.appendChild(mkDiv('progress-bar'));
	
	const el = document.querySelector(`[data-research-id="${id}"]`)
	el.appendChild(progressEl)
	const bar = el?.querySelector('.progress-bar')
	const getTime = el?.querySelector('.research-time')
	
	gameData.research.active = {
		id,
		duration: def.duration(level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)),
		startAt: Date.now(),
		progressEl: bar,
		time: getTime
	}
	
	updateResearchButtons()
	requestRender()
}

function updateResearch(now) {
	const r = gameData.research.active
	if (!r) return
	
	const elapsed = now - r.startAt
	const remaining = Math.max(r.duration - elapsed, 0)
	const percent = Math.min(elapsed / r.duration, 1)
	
	if (r.progressEl) {
		r.progressEl.style.width = `${percent * 100}%`
	}
	
	if (r.time) {
		r.time.textContent = msToHMS(remaining)
	}
	
	if (percent >= 1) {
		finishResearch(r.id)
	}
}

function finishResearch(id) {
	const def = researchDefs[id]
	const data = gameData.research.complete[id] ?? { level: 0 }
	
	data.level++
	gameData.research.complete[id] = data
	
	if (typeof def.effect === 'function') {
		def.effect(gameData, data.level)
	}
	
	const el = document.querySelector(`[data-research-id="${id}"]`)
	const levelEl = el.querySelector('.research-name')
	const durEl = el.querySelector('.research-time')
	const costEl = el.querySelector('.research-cost')
	const progressEl = el.querySelector('.progress-bar')
	
	levelEl.textContent = def.name + " - Lv. " + data.level
	durEl.textContent = msToHMS(def.duration(data.level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)));
	costEl.innerHTML = `${getResearchCost(id).amount}&nbsp;RP`
	progressEl.style.width = "0%"
	
	gameData.research.active = null
	
	updateResearchButtons()
	insertResearchItems()
	requestRender()
}

function updateResearchButtons() {
	const activeId = gameData.research.active?.id
	
	document.querySelectorAll('#research .button').forEach(el => {
		const id = el.dataset.researchId
		
		if (!activeId) {
			el.classList.remove('disabled')
			return
		}
		
		if (id === activeId) {
			el.classList.remove('disabled')
		} else {
			el.classList.add('disabled')
		}
	})
}



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
	const def = item_master_data[itemId];
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

function consumeItem(itemId, amount = 1) {
	if (!gameData.inventory.items[itemId] || gameData.inventory.items[itemId] === 0) {
		return
	}
	gameData.inventory.items[itemId] -= amount
	effect(itemId.effect * amount);
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
	img.src = `/images/${item_master_data[itemId]?.icon || ""}`
	iconDiv.appendChild(img)
	
	const qtyDiv = document.createElement('div')
	qtyDiv.classList.add('inventory-qty')
	qtyDiv.textContent = qty
	
	const nameDiv = document.createElement('div')
	nameDiv.classList.add('inventory-name')
	nameDiv.innerHTML = `<span>${item_master_data[itemId]?.name || itemId}</span>`
	
	item.appendChild(iconDiv)
	item.appendChild(qtyDiv)
	item.appendChild(nameDiv)
	
	return item
}


// EQUIPMENT
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
	const def = item_master_data[itemId]
	if (!def || def.type !== 'equipment') return
	
	const inv = gameData.inventory.equipment
	if (!inv[itemId] || inv[itemId] <= 0) return
	
	const slots = Array.isArray(def.equipSlot)
	? def.equipSlot
	: [def.equipSlot]
	
	let slot = preferredSlot && slots.includes(preferredSlot)
	? preferredSlot
	: slots.find(s => gameData.equipped[s] === null)
	
	if (!slot) return
	
	// Unequip existing item
	const oldItem = gameData.equipped[slot]
	if (oldItem) {
		inv[oldItem] = (inv[oldItem] ?? 0) + 1
	}
	
	inv[itemId] -= 1
	gameData.equipped[slot] = itemId
	
	recalcEquipmentEffects()
	renderEquipment()
}

function unequipItem(slot) {
	const itemId = gameData.equipped[slot]
	if (!itemId) return
	
	gameData.inventory.equipment[itemId] =
	(gameData.inventory.equipment[itemId] ?? 0) + 1
	
	gameData.equipped[slot] = null
	recalcEquipmentEffects()
}

function recalcEquipmentEffects() {
	gameData.craftSpeedMult = 1
	
	Object.values(gameData.equipped).forEach(itemId => {
		if (!itemId) return
		const def = item_master_data[itemId]
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
		
		const def = item_master_data[itemId]
		if (!def || def.type !== 'equipment') continue
		
		const slots = Array.isArray(def.equipSlot)
		? def.equipSlot
		: [def.equipSlot]
		
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

function renderEquippableList(slot) {
	const container = document.getElementById('equip-select')
	container.innerHTML = ''
	
	const inv = gameData.inventory.equipment
	
	const items = Object.entries(inv)
	.filter(([itemId, qty]) => {
		if (qty <= 0) return false
		
		const def = item_master_data[itemId]
		if (!def || def.type !== 'equipment') return false
		
		const slots = Array.isArray(def.equipSlot)
		? def.equipSlot
		: [def.equipSlot]
		
		return slots.includes(slot)
	})
	.sort(([a], [b]) => {
		const nameA = (item_master_data[a]?.name || a).toLowerCase()
		const nameB = (item_master_data[b]?.name || b).toLowerCase()
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






// ================================
// 		GAME LOOP
// ================================

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
			onEquipmentSlotClick(el.dataset.slot)
		})
	})
	
	document.querySelectorAll('.attr-add').forEach(btn => {
		btn.addEventListener('click', attrUp);
	});
	
});