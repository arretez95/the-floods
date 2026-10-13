import { initialState } from "./init"
export { getLocalStorageKey, saveGame, loadGame }

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
	try {
		const jsonString = localStorage.getItem(getLocalStorageKey(slot))
		if (!jsonString) return initialState()

		
	} catch (error) {
		console.error('Error', error)
		return initialState()
	}


	/* if (typeof slot !== "number") return
	
	const jsonString = localStorage.getItem(getLocalStorageKey(slot))
	if (!jsonString) return initialState()

	const saved = JSON.parse(jsonString)
	const defaults = initialState()

	return {
		...defaults,
		...saved, 
	} */
}

//braymen/increcycle @ github.com