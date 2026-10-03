export { initUpgrades, initExplore, initResearch }

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