import { $ } from "../render.js"

export { insertItemMastery }

// ================================
// 		Achievements
// ================================

function insertItemMastery() {
	const achievementPanel = $('#achievements')
	if ($('.item-mastery-container')) {$('.item-mastery-container').remove()}

	const itemMasteryContainer = document.createElement('div')
	itemMasteryContainer.classList.add("item-mastery-container")

	const itemMasteryTitle = document.createElement('h3')
	itemMasteryTitle.textContent = "Item Mastery"
	itemMasteryContainer.appendChild(itemMasteryTitle)

	const itemMasteryList = document.createElement('div')
	itemMasteryList.classList.add("item-mastery-list")

	if (Object.keys(gameData.achievements.mastery).length === 0) {
		const emptyList = document.createElement('p')
			emptyList.textContent = "Explore or craft items to increase mastery."
			itemMasteryList.appendChild(emptyList)
	} else {
		Object.entries(gameData.achievements.mastery).forEach(([id]) => {
			if (gameData.achievements.mastery[id].amount > 0) {
				const itemDiv = document.createElement('div')
				itemDiv.classList.add("item-mastery-item")
				
				const item = document.createElement('div');
				item.classList.add('inventory-item', 'fold');
				
				const iconDiv = document.createElement('div');
				iconDiv.classList.add('inventory-icon');
				const img = new Image();
				img.src = `/images/${itemMasterData[id]?.icon || ""}`;
				iconDiv.appendChild(img);
				
				const nameDiv = document.createElement('div');
				nameDiv.classList.add('inventory-name');
				const name = itemMasterData[id]?.name || id;
				nameDiv.innerHTML = `${name}`;
				
				const qtyDiv = document.createElement('div');
				qtyDiv.classList.add('inventory-qty');
				qtyDiv.textContent = numberFormat(gameData.achievements.mastery[id].amount);
				
				item.appendChild(iconDiv);
	
				itemDiv.appendChild(nameDiv);
				itemDiv.appendChild(item);
				itemDiv.appendChild(qtyDiv);
				itemMasteryList.appendChild(itemDiv);
			}
		})
	}
	itemMasteryContainer.appendChild(itemMasteryList)
	achievementPanel.appendChild(itemMasteryContainer)
}

function itemMasteryThreshold(itemId) {
	const item = gameData.achievements.mastery[itemId];
	const mastery = [
		{ level: 1, threshold: 10, label: "beginner"},
		{ level: 2, threshold: 100, label: "intermediate"},
		{ level: 3, threshold: 1000, label: "advanced"},
		{ level: 4, threshold: 10000, label: "proficient"},
		{ level: 5, threshold: 100000, label: "expert"},
		{ level: 6, threshold: 1000000, label: "master"},
	];

	// count mastery to show loot table drops
}
