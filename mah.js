// This script contains all the core game logic for Mahjong Solitaire.


// Standard Mahjong tiles.
const tileTypes = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
				'1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
				'1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
				'E', 'S', 'W', 'N', 'RD', 'GD', 'WD', 'F1', 'F2'];

// Global game state
const game = {
	canvas: null,
	ctx: null,
	tiles: [],
	selectedTile: null,
	scale: 1,
	tileSize: { width: 50, height: 50, depth: 4 },
	messageBox: null,
	dialogTitle: null,
	dialogContent: null,
	dialogButtons: null,
	timerInterval: null,
	timeElapsed: 0,
	timerDisplay: null,
	isTimerRunning: false,
	isGameActive: false,
	pairsRemaining: 0,
	initialPairs: 0,
	pairsDisplay: null,
	showBlockedHighlight: false,
};


// A simple seeded pseudo-random number generator (LCG).
const createSeededRandom = (seed) => {
	let state = seed % 2147483647;
	if (state <= 0) state += 2147483646;
	return () => {
		state = (state * 16807) % 2147483647;
		return state / 2147483647;
	};
};

// Helper function to shuffle an array using the seeded random number generator
const shuffleArray = (array, random) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};

// Custom function to generate a UUID using the seeded random number generator
const generateUUID = (random) => {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.floor(random() * 16);
		const v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
};

// Starts a new game and updates the game state object
const startGameLogic = (game, pyramidLayout, seed = Math.floor(Math.random() * 100000)) => {
	game.isGameActive = true;
	game.tiles = [];
	game.selectedTile = null;

	if (game.timerInterval) clearInterval(game.timerInterval);
	game.isTimerRunning = false;
	game.timeElapsed = 0;

	if (game.messageBox) game.messageBox.classList.add('hidden-dialog');

	// Update URI parameters to make it shareable
	window.history.pushState({}, '', `?s=${seed}`);

	game.seed = seed;
	
	const rng = createSeededRandom(game.seed);

	let totalTiles = 0;
	for (let z = 0; z < pyramidLayout.length; z++) {
		const layer = pyramidLayout[z];
		for (let y = 0; y < layer.length; y++) {
			const row = layer[y];
			for (let x = 0; x < row.length; x++) {
				if (row[x] === 'o') {
					totalTiles++;
				}
			}
		}
	}

	if (totalTiles % 4 !== 0) {
		console.error("The pyramid layout must contain a number of tiles that is a multiple of 4.");
		game.isGameActive = false;
		return;
	}

	let tileValues = [];
	let tileTypesShuffled = [...tileTypes];
	 shuffleArray(tileTypesShuffled, rng);
	
	// Correctly populate tileValues array with pairs of tiles
	// For a 32-tile board (4 pairs of 8 unique tiles)
	for (let i = 0; i < totalTiles; i++) {
		tileValues.push(tileTypesShuffled[Math.floor(i / 4)]);
	}
	shuffleArray(tileValues, rng);

	let tileIndex = 0;
	for (let z = 0; z < pyramidLayout.length; z++) {
		const layer = pyramidLayout[z];
		for (let y = 0; y < layer.length; y++) {
			const row = layer[y];
			for (let x = 0; x < row.length; x++) {
				if (row[x] === 'o') {
					game.tiles.push({
						x: x,
						y: y,
						z: z,
						value: tileValues[tileIndex++],
						id: generateUUID(rng),
						isBlocked: false
					});
				}
			}
		}
	}
	
	game.initialPairs = totalTiles / 2;
	game.pairsRemaining = game.initialPairs;
	game.showBlockedHighlight = false; // Reset the blocked tile highlight state
	
	// Update the pairs display immediately after starting a new game
	window.updatePairsDisplay();
	draw();
};

// Saves the current game state to localStorage
const saveGameStateLogic = (game) => {
	const gameState = {
		tiles: game.tiles,
		timeElapsed: game.timeElapsed,
		pairsRemaining: game.pairsRemaining,
		initialPairs: game.initialPairs,
		seed: game.seed,
	};
	localStorage.setItem('mahjongGameState', JSON.stringify(gameState));
};

// Loads a saved game state from localStorage, or starts a new one if none exists, taking into account the seed from the parameters, if provided
const loadGameStateLogic = (game, layout, newGameCallback, showDialogCallback, drawCallback, startTimerCallback) => {
	
	// Check for a seed in the URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('s');
	
	const savedState = localStorage.getItem('mahjongGameState');
	// Check if a saved state exists, the game is not already won or lost and a new seed was not provided as parameter
	if (savedState && game.pairsRemaining > 0 && (!seedParam || seedParam == game.seed)) {
		const gameState = JSON.parse(savedState);
		game.tiles = gameState.tiles;
		game.timeElapsed = gameState.timeElapsed;
		game.pairsRemaining = gameState.pairsRemaining;
		game.initialPairs = gameState.initialPairs;
		game.seed = gameState.seed;
		
		const buttons = [
			{ text: "resume", action: () => {
				game.isGameActive = true;
				if (game.messageBox) game.messageBox.classList.add('hidden-dialog');
				startTimerCallback();
				drawCallback();
			}, color: "green" },
			{ text: "newGame", action: newGameCallback, color: "blue" }
		];
		showDialogCallback("welcomeBackTitle", "welcomeBackContent", buttons);
	} else {
		// If no valid saved state, start a new game immediately, with the given seed if provided
		startGameLogic(game, layout, seedParam || undefined);
	}
};

// Checks for win/lose conditions.
const checkWinLoseConditionLogic = (game, showWinLoseDialogCallback, isFreeCallback) => {
	if (game.tiles.length === 0) {
		// WIN condition
		showWinLoseDialogCallback(true);
		clearInterval(game.timerInterval);
		return;
	}

	let hasFreePairs = false;
	for (let i = 0; i < game.tiles.length; i++) {
		for (let j = i + 1; j < game.tiles.length; j++) {
			const tile1 = game.tiles[i];
			const tile2 = game.tiles[j];
			if (tile1.value === tile2.value && isFreeCallback(tile1) && isFreeCallback(tile2)) {
				hasFreePairs = true;
				break;
			}
		}
		if (hasFreePairs) break;
	}

	if (!hasFreePairs) {
		// LOSE condition
		showWinLoseDialogCallback(false, "noMoreMoves");
		clearInterval(game.timerInterval);
		game.isGameActive = false;
	}
};

// Checks if a tile is "free".
const isFreeLogic = (tile, allTiles, pyramidLayout) => {
	const nextLayerIndex = tile.z + 1;
	if (nextLayerIndex < pyramidLayout.length) {
		const currentLayer = pyramidLayout[tile.z];
		const nextLayer = pyramidLayout[nextLayerIndex];

		const xOffset = (currentLayer[0].length - nextLayer[0].length) / 2;
		const yOffset = (currentLayer.length - nextLayer.length) / 2;

		const tileOnTop = allTiles.find(t =>
			t.z === nextLayerIndex
			&& (t.x === Math.floor(tile.x - xOffset) || t.x === Math.ceil(tile.x - xOffset))
			&& (t.y === Math.floor(tile.y - yOffset) || t.y == Math.ceil(tile.y - yOffset))
		);

		if (tileOnTop) return false;
	}

	const hasTileToLeft = allTiles.some(t => t.x === tile.x - 1 && t.y === tile.y && t.z === tile.z);
	const hasTileToRight = allTiles.some(t => t.x === tile.x + 1 && t.y === tile.y && t.z === tile.z);

	return !hasTileToLeft || !hasTileToRight;
};

// Export all the logic functions to be used by the main script
window.mahjongLogic = {
	startGameLogic,
	checkWinLoseConditionLogic,
	isFreeLogic,
	saveGameStateLogic,
	loadGameStateLogic
};
