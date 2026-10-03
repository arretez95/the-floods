import { gameData } from "../../../main.js"

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
	const researchPanel = $('#research')
	
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
	const descEl = el.querySelector('.research-desc')
	const durEl = el.querySelector('.research-time')
	const costEl = el.querySelector('.research-cost')
	const progressEl = el.querySelector('.progress-bar')
	
	levelEl.textContent = def.name + " - Lv. " + data.level
	descEl.innerHTML = `${def.desc}<br>${def.effectText ? def.effectText(data.level) + ' -> ': ''} ${def.effectText ? def.effectText(data.level + 1): ''}`
	durEl.textContent = msToHMS(def.duration(data.level) * Math.max(0.1, 1 - (gameData.durationMultiplier ?? 0)));
	costEl.innerHTML = `${getResearchCost(id).amount}&nbsp;RP`
	progressEl.style.width = "0%"
	
	gameData.research.active = null
	
	$(".progress-div").remove()
	updateResearchButtons()
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
