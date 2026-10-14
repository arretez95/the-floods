import { initialState } from "./init.js"
import { msgPopup } from "./util.js"
export { getLocalStorageKey, saveGame, loadGame, resetGame }

const storageKey = 'save'

function getLocalStorageKey(slot) {
	if (typeof slot !== "number") return
	return `${storageKey} - ${slot}`
}

function saveGame(slot, state) {
	try {
		localStorage.setItem(getLocalStorageKey(slot), JSON.stringify(state))
	} catch (error) {
		console.error('Failed to save game:', error)
	}
}

function loadGame(slot) {
	const key = getLocalStorageKey(slot)
	if (!key) return initialState()

	try {
		const jsonString = localStorage.getItem(key)
		if (!jsonString) return initialState()

		const saved = JSON.parse(jsonString)
		return mergeDefaults(initialState(), saved)
	} catch (error) {
		console.error('Failed to load game:', error)
		return initialState()
	}
}

function mergeDefaults(defaults, saved) {
	if (Array.isArray(defaults)) {
		return Array.isArray(saved) ? saved : defaults
	}

	if (defaults !== null && typeof defaults === 'object') {
		if (saved === null || typeof saved !== 'object' || Array.isArray(saved)) {
			saved = {}
		}

		const merged = { ...saved }

		for (const key of Object.keys(defaults)) {
			merged[key] = mergeDefaults(defaults[key], saved[key])
		}

		return merged
	}

	return saved === undefined ? defaults : saved
}


//braymen/increcycle @ github.com

function resetGame(slot) {
	localStorage.removeItem(getLocalStorageKey(slot))
	msgPopup("Game reset", {color: "red"})
	console.log("Game reset")
}