export { clamp, random, randArray, duration, msToHMS, waterUnit, numberFormat, titleCase, getInventoryCount}
import { DROP_ML } from "../../main.js"

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
