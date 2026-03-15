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
	layoutId: null,
	pairsRemaining: 0,
	initialPairs: 0,
	pairsDisplay: null,
	showBlockedHighlight: false,
	lastPairTime: null,
	extraScore: 0,
};

const layoutAnalysisCache = new WeakMap();
const seedAlphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const getPositionKey = ({ x, y, z }) => `${x},${y},${z}`;

const getLayoutPositions = (pyramidLayout) => {
	const positions = [];

	for (let z = 0; z < pyramidLayout.length; z++) {
		const layer = pyramidLayout[z];
		for (let y = 0; y < layer.length; y++) {
			const row = layer[y];
			for (let x = 0; x < row.length; x++) {
				if (row[x] === 'o') {
					positions.push({ x, y, z });
				}
			}
		}
	}

	return positions;
};

const countTilesInLayout = (pyramidLayout) => getLayoutPositions(pyramidLayout).length;

const createLayoutAnalysis = (pyramidLayout) => {
	if (layoutAnalysisCache.has(pyramidLayout)) {
		return layoutAnalysisCache.get(pyramidLayout);
	}

	const positions = getLayoutPositions(pyramidLayout);
	const indexByKey = new Map(
		positions.map((position, index) => [getPositionKey(position), index])
	);
	const leftNeighbors = Array(positions.length).fill(-1);
	const rightNeighbors = Array(positions.length).fill(-1);
	const tilesAboveMasks = Array(positions.length).fill(0n);

	for (let index = 0; index < positions.length; index++) {
		const position = positions[index];
		const leftNeighbor = indexByKey.get(`${position.x - 1},${position.y},${position.z}`);
		const rightNeighbor = indexByKey.get(`${position.x + 1},${position.y},${position.z}`);

		if (leftNeighbor !== undefined) {
			leftNeighbors[index] = leftNeighbor;
		}

		if (rightNeighbor !== undefined) {
			rightNeighbors[index] = rightNeighbor;
		}

		const nextLayerIndex = position.z + 1;
		if (nextLayerIndex >= pyramidLayout.length) {
			continue;
		}

		const currentLayer = pyramidLayout[position.z];
		const nextLayer = pyramidLayout[nextLayerIndex];
		const xOffset = (currentLayer[0].length - nextLayer[0].length) / 2;
		const yOffset = (currentLayer.length - nextLayer.length) / 2;

		for (let candidateIndex = 0; candidateIndex < positions.length; candidateIndex++) {
			const candidate = positions[candidateIndex];
			if (
				candidate.z === nextLayerIndex &&
				(candidate.x === Math.floor(position.x - xOffset) || candidate.x === Math.ceil(position.x - xOffset)) &&
				(candidate.y === Math.floor(position.y - yOffset) || candidate.y === Math.ceil(position.y - yOffset))
			) {
				tilesAboveMasks[index] |= (1n << BigInt(candidateIndex));
			}
		}
	}

	const analysis = {
		positions,
		indexByKey,
		leftNeighbors,
		rightNeighbors,
		tilesAboveMasks,
		fullMask: (1n << BigInt(positions.length)) - 1n,
	};

	layoutAnalysisCache.set(pyramidLayout, analysis);
	return analysis;
};

const buildOccupancyMask = (tiles, analysis) => {
	let occupancyMask = 0n;

	for (const tile of tiles) {
		const positionIndex = analysis.indexByKey.get(getPositionKey(tile));
		if (positionIndex !== undefined) {
			occupancyMask |= (1n << BigInt(positionIndex));
		}
	}

	return occupancyMask;
};

const isPositionFreeInMask = (positionIndex, occupancyMask, analysis) => {
	if ((occupancyMask & analysis.tilesAboveMasks[positionIndex]) !== 0n) {
		return false;
	}

	const leftNeighbor = analysis.leftNeighbors[positionIndex];
	const rightNeighbor = analysis.rightNeighbors[positionIndex];
	const hasTileToLeft = leftNeighbor !== -1 && (occupancyMask & (1n << BigInt(leftNeighbor))) !== 0n;
	const hasTileToRight = rightNeighbor !== -1 && (occupancyMask & (1n << BigInt(rightNeighbor))) !== 0n;

	return !hasTileToLeft || !hasTileToRight;
};

const getFreePositionIndices = (occupancyMask, analysis) => {
	const freePositions = [];

	for (let positionIndex = 0; positionIndex < analysis.positions.length; positionIndex++) {
		const tileBit = 1n << BigInt(positionIndex);
		if ((occupancyMask & tileBit) !== 0n && isPositionFreeInMask(positionIndex, occupancyMask, analysis)) {
			freePositions.push(positionIndex);
		}
	}

	return freePositions;
};

const hashOccupancyMask = (occupancyMask) => {
	let hash = 0n;
	let remainingMask = occupancyMask;

	while (remainingMask > 0n) {
		hash = (hash * 1315423911n + (remainingMask & 0xffffn)) & 0x7fffffffn;
		remainingMask >>= 16n;
	}

	return Number(hash);
};

const createRandomSeed = (length = 6) => {
	let seed = '';

	for (let index = 0; index < length; index++) {
		const randomIndex = Math.floor(Math.random() * seedAlphabet.length);
		seed += seedAlphabet[randomIndex];
	}

	return seed;
};

const normalizeSeed = (seed) => {
	if (seed === undefined || seed === null || seed === '') {
		return createRandomSeed();
	}

	return String(seed);
};

const hashSeed = (seed) => {
	const normalizedSeed = normalizeSeed(seed);
	let hash = 2166136261;

	for (let index = 0; index < normalizedSeed.length; index++) {
		hash ^= normalizedSeed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0) % 2147483646 + 1;
};

const getLocalStorage = () => {
	try {
		if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
			return null;
		}

		return globalThis.localStorage;
	} catch (error) {
		console.warn('Persistent storage is unavailable.', error);
		return null;
	}
};

const readSavedGameState = () => {
	const storage = getLocalStorage();
	if (!storage) {
		return null;
	}

	try {
		return storage.getItem('mahjongGameState');
	} catch (error) {
		console.warn('Could not read saved game state.', error);
		return null;
	}
};

const writeSavedGameState = (gameState) => {
	const storage = getLocalStorage();
	if (!storage) {
		return false;
	}

	try {
		storage.setItem('mahjongGameState', JSON.stringify(gameState));
		return true;
	} catch (error) {
		console.warn('Could not save game state.', error);
		return false;
	}
};

const clearSavedGameState = () => {
	const storage = getLocalStorage();
	if (!storage) {
		return false;
	}

	try {
		storage.removeItem('mahjongGameState');
		return true;
	} catch (error) {
		console.warn('Could not clear saved game state.', error);
		return false;
	}
};

const resolveLayoutId = (layoutId, layouts, defaultLayoutId) => {
	if (layoutId && layouts[layoutId]) {
		return layoutId;
	}

	return defaultLayoutId;
};

const updateGameUrl = (seed, layoutId) => {
	if (typeof window === 'undefined' || !window.history || !window.history.pushState) {
		return;
	}

	const searchParams = new URLSearchParams({
		s: seed,
		l: layoutId,
	});
	window.history.pushState({}, '', `?${searchParams.toString()}`);
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

const findSolvablePairSequence = (pyramidLayout, seed) => {
	const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
	const analysis = createLayoutAnalysis(pyramidLayout);
	const failedMasks = new Set();

	const search = (occupancyMask, depth) => {
		if (occupancyMask === 0n) {
			return [];
		}

		const maskKey = occupancyMask.toString();
		if (failedMasks.has(maskKey)) {
			return null;
		}

		const freePositions = getFreePositionIndices(occupancyMask, analysis);
		if (freePositions.length < 2) {
			failedMasks.add(maskKey);
			return null;
		}

		const removablePairs = [];
		for (let i = 0; i < freePositions.length; i++) {
			for (let j = i + 1; j < freePositions.length; j++) {
				removablePairs.push([freePositions[i], freePositions[j]]);
			}
		}

		const pairRandom = createSeededRandom(numericSeed + depth + hashOccupancyMask(occupancyMask));
		shuffleArray(removablePairs, pairRandom);

		for (const [firstIndex, secondIndex] of removablePairs) {
			const nextMask =
				occupancyMask &
				~(1n << BigInt(firstIndex)) &
				~(1n << BigInt(secondIndex));
			const remainingPairs = search(nextMask, depth + 1);

			if (remainingPairs) {
				return [[firstIndex, secondIndex], ...remainingPairs];
			}
		}

		failedMasks.add(maskKey);
		return null;
	};

	const removablePairIndices = search(analysis.fullMask, 0);
	if (!removablePairIndices) {
		throw new Error('Could not find a solvable removal path for this layout.');
	}

	return removablePairIndices.map(([firstIndex, secondIndex]) => [
		analysis.positions[firstIndex],
		analysis.positions[secondIndex],
	]);
};

const createSolvableTileSet = (pyramidLayout, seed) => {
	const numericSeed = hashSeed(seed);
	const totalTiles = countTilesInLayout(pyramidLayout);

	if (totalTiles % 4 !== 0) {
		throw new Error(
			`Invalid tile count of ${totalTiles}. The pyramid layout must contain a number of tiles that is a multiple of 4.`
		);
	}

	const uniqueValueCount = totalTiles / 4;
	if (uniqueValueCount > tileTypes.length) {
		throw new Error(
			`Layout requires ${uniqueValueCount} unique tile values, but only ${tileTypes.length} are available.`
		);
	}

	const pairSequence = findSolvablePairSequence(pyramidLayout, seed);
	const valueRandom = createSeededRandom(numericSeed);
	const availableTileTypes = [...tileTypes];
	shuffleArray(availableTileTypes, valueRandom);

	const pairValues = availableTileTypes
		.slice(0, uniqueValueCount)
		.flatMap(tileValue => [tileValue, tileValue]);
	shuffleArray(pairValues, valueRandom);

	const valueByPositionKey = new Map();
	pairSequence.forEach((pair, pairIndex) => {
		for (const position of pair) {
			valueByPositionKey.set(getPositionKey(position), pairValues[pairIndex]);
		}
	});

	return {
		tiles: getLayoutPositions(pyramidLayout).map(position => ({
			...position,
			value: valueByPositionKey.get(getPositionKey(position)),
		})),
		solutionPairs: pairSequence.map(pair => pair.map(getPositionKey)),
	};
};

// Starts a new game and updates the game state object
const startGameLogic = (game, pyramidLayout, seed = createRandomSeed(), layoutId = game.layoutId) => {
	game.isGameActive = true;
	game.tiles = [];
	game.selectedTile = null;

	if (game.timerInterval) clearInterval(game.timerInterval);
	game.isTimerRunning = false;
	game.timeElapsed = 0;

	if (game.messageBox) game.messageBox.classList.add('hidden-dialog');

	game.seed = normalizeSeed(seed);
	game.layoutId = layoutId || game.layoutId || 'default';
	game.lastPairTime = null;

	updateGameUrl(game.seed, game.layoutId);

	let generatedBoard;
	try {
		generatedBoard = createSolvableTileSet(pyramidLayout, game.seed);
	} catch (error) {
		console.error(error.message);
		game.isGameActive = false;
		return;
	}

	const idRandom = createSeededRandom(hashSeed(game.seed));
	game.tiles = generatedBoard.tiles.map(tile => ({
		...tile,
		id: generateUUID(idRandom),
		isBlocked: false,
	}));

	game.initialPairs = game.tiles.length / 2;
	game.pairsRemaining = game.initialPairs;
	game.extraScore = 0;
	game.showBlockedHighlight = false;

	if (typeof window !== 'undefined' && window.mahjongUi && typeof window.mahjongUi.updatePairsDisplay === 'function') {
		window.mahjongUi.updatePairsDisplay(game);
	}
};

// Saves the current game state to localStorage
const saveGameStateLogic = (game) => {
	const gameState = {
		tiles: game.tiles,
		timeElapsed: game.timeElapsed,
		pairsRemaining: game.pairsRemaining,
		initialPairs: game.initialPairs,
		seed: game.seed,
		layoutId: game.layoutId,
		extraScore: game.extraScore,
		lastPairTime: game.lastPairTime ? game.lastPairTime.toISOString() : null,
	};
	writeSavedGameState(gameState);
};

// Loads a saved game state from localStorage, or starts a new one if none exists.
const loadGameStateLogic = (
	game,
	layouts,
	defaultLayoutId,
	newGameCallback,
	showDialogCallback,
	drawCallback,
	startTimerCallback,
	refreshUiCallback = () => {}
) => {
	const urlParams = new URLSearchParams(window.location.search);
	const seedParam = urlParams.get('s');
	const requestedLayoutId = urlParams.has('l')
		? resolveLayoutId(urlParams.get('l'), layouts, defaultLayoutId)
		: null;
	const savedState = readSavedGameState();

	if (savedState) {
		try {
			const gameState = JSON.parse(savedState);
			const sameSeed = !seedParam || String(gameState.seed) === seedParam;
			const savedLayoutId = resolveLayoutId(gameState.layoutId, layouts, defaultLayoutId);
			const sameLayout = !requestedLayoutId || savedLayoutId === requestedLayoutId;

			if (gameState.pairsRemaining > 0 && sameSeed && sameLayout) {
				game.tiles = gameState.tiles;
				game.timeElapsed = gameState.timeElapsed;
				game.pairsRemaining = gameState.pairsRemaining;
				game.initialPairs = gameState.initialPairs;
				game.seed = gameState.seed;
				game.layoutId = savedLayoutId;
				game.extraScore = gameState.extraScore || 0;
				game.lastPairTime = gameState.lastPairTime ? new Date(gameState.lastPairTime) : null;
				updateGameUrl(game.seed, game.layoutId);

				refreshUiCallback();
				drawCallback();

				const buttons = [
					{ text: 'resume', action: () => {
						game.isGameActive = true;
						if (game.messageBox) game.messageBox.classList.add('hidden-dialog');
						startTimerCallback();
						drawCallback();
					}, color: 'green' },
					{ text: 'newGame', action: newGameCallback, color: 'blue' }
				];
				showDialogCallback('welcomeBackTitle', 'welcomeBackContent', buttons);
				return;
			}
		} catch (error) {
			console.error('Could not restore saved game state.', error);
		}
	}

	const layoutIdToStart = requestedLayoutId || defaultLayoutId;
	startGameLogic(game, layouts[layoutIdToStart], seedParam || undefined, layoutIdToStart);
	refreshUiCallback();
	drawCallback();
};

// Checks for win/lose conditions.
const checkWinLoseConditionLogic = (game, showWinLoseDialogCallback, isFreeCallback) => {
	if (game.tiles.length === 0) {
		// WIN condition
		showWinLoseDialogCallback(true);
		clearInterval(game.timerInterval);
		game.isTimerRunning = false;
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
		showWinLoseDialogCallback(false, 'noMoreMoves');
		clearInterval(game.timerInterval);
		game.isTimerRunning = false;
		game.isGameActive = false;
	}
};

const getScore = () => {
	const elapsedSeconds = Math.max(1, game.timeElapsed);
	return ((game.extraScore + 10 * (game.initialPairs - game.pairsRemaining)) / elapsedSeconds).toFixed(1);
};

// Checks if a tile is "free".
const isFreeLogic = (tile, allTiles, pyramidLayout) => {
	const analysis = createLayoutAnalysis(pyramidLayout);
	const tileIndex = analysis.indexByKey.get(getPositionKey(tile));

	if (tileIndex === undefined) {
		return false;
	}

	return isPositionFreeInMask(tileIndex, buildOccupancyMask(allTiles, analysis), analysis);
};

const registerServiceWorker = () => {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return;
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then((registration) => {
				console.log('Service Worker registered with scope:', registration.scope);
			})
			.catch((error) => {
				console.log('Service Worker registration failed:', error);
			});
	});
};

const initBrowserApp = async () => {
	const ui = window.mahjongUi;
	if (!ui) {
		console.error('ui.js must be loaded before mah.js.');
		return;
	}

	const draw = () => ui.draw(game, isFree);
	const resizeCanvas = () => ui.resizeCanvas(game, draw);
	const refreshBoard = () => {
		if (typeof ui.scheduleResize === 'function') {
			ui.scheduleResize(game, draw);
			return;
		}

		resizeCanvas();
	};
	const saveGameState = () => saveGameStateLogic(game);
	const updateHud = () => {
		ui.updatePairsDisplay(game);
		ui.updateTimerDisplay(game);
	};

	function startGame(seed, layoutId = game.layoutId || ui.defaultLayoutId) {
		const selectedLayout = ui.getLayoutDefinition(layoutId);
		startGameLogic(game, selectedLayout.pattern, seed, selectedLayout.id);
		refreshBoard();
	}

	function loadGameState() {
		loadGameStateLogic(
			game,
			ui.getLayoutPatterns(),
			ui.defaultLayoutId,
			startGame,
			(title, content, buttons) => ui.showDialog(game, title, content, buttons),
			refreshBoard,
			startTimer,
			updateHud
		);
	}

	function checkWinLoseCondition() {
		checkWinLoseConditionLogic(game, showWinLoseDialog, isFree);
	}

	function isFree(tile) {
		return isFreeLogic(tile, game.tiles, ui.getActiveLayout(game));
	}

	function startTimer() {
		if (!game.isTimerRunning) {
			game.isTimerRunning = true;
			game.timerInterval = setInterval(() => {
				game.timeElapsed++;
				ui.updateTimerDisplay(game);
			}, 1000);
		}
	}

	function handleClick(event) {
		if (!game.isGameActive) {
			return checkWinLoseCondition();
		}

		handleInput(event.clientX, event.clientY);
	}

	function handleTouch(event) {
		if (!game.isGameActive) {
			return;
		}

		event.preventDefault();
		const touch = event.touches[0];
		handleInput(touch.clientX, touch.clientY);
	}

	function handleInput(clientX, clientY) {
		const rect = game.canvas.getBoundingClientRect();
		const activeLayout = ui.getActiveLayout(game);
		const scaleX = game.canvas.width / rect.width;
		const scaleY = game.canvas.height / rect.height;
		const inputX = (clientX - rect.left) * scaleX;
		const inputY = (clientY - rect.top) * scaleY;
		const scaledTileSize = {
			width: game.tileSize.width * game.scale,
			height: game.tileSize.height * game.scale,
			depth: game.tileSize.depth * game.scale,
		};
		const { baseLayerWidth, baseLayerHeight } = ui.getBoardMetrics(game, activeLayout);
		const boardWidth = baseLayerWidth * game.tileSize.width * game.scale;
		const boardHeight = baseLayerHeight * game.tileSize.height * game.scale;
		const globalOffsetX = (game.canvas.width - boardWidth) / 2;
		const globalOffsetY = (game.canvas.height - boardHeight) / 2;

		let clickedTile = null;
		const sortedTiles = [...game.tiles].sort((firstTile, secondTile) => secondTile.z - firstTile.z);

		for (const tile of sortedTiles) {
			const layer = activeLayout[tile.z];
			const layerWidth = layer[0].length;
			const layerHeight = layer.length;
			const layerOffsetX = (baseLayerWidth - layerWidth) / 2 * scaledTileSize.width;
			const layerOffsetY = (baseLayerHeight - layerHeight) / 2 * scaledTileSize.height;
			const tileX = tile.x * scaledTileSize.width - tile.z * scaledTileSize.depth + layerOffsetX + globalOffsetX;
			const tileY = tile.y * scaledTileSize.height - tile.z * scaledTileSize.depth + layerOffsetY + globalOffsetY;

			if (
				inputX >= tileX &&
				inputX <= tileX + scaledTileSize.width + scaledTileSize.depth &&
				inputY >= tileY &&
				inputY <= tileY + scaledTileSize.height + scaledTileSize.depth
			) {
				clickedTile = tile;
				break;
			}
		}

		if (!clickedTile) {
			return;
		}

		if (!game.isTimerRunning) {
			startTimer();
		}

		if (isFree(clickedTile)) {
			game.showBlockedHighlight = false;

			if (!game.selectedTile) {
				game.selectedTile = clickedTile;
			} else if (game.selectedTile.id === clickedTile.id) {
				game.selectedTile = null;
			} else if (game.selectedTile.value === clickedTile.value) {
				const time = new Date();
				const elapsed = (time - game.lastPairTime) / 1000;
				const bonus = Math.min(30, 60 / Math.ceil(elapsed));

				if (bonus > 10) {
					showSparkleEffect(`${clientX}px`, `${clientY}px`);
					console.log(`${elapsed.toFixed(1)}s pair! Bonus score: ${bonus}`);
				}

				game.extraScore += bonus;
				game.tiles = game.tiles.filter(tile => tile.id !== game.selectedTile.id && tile.id !== clickedTile.id);
				game.pairsRemaining--;
				game.lastPairTime = new Date();
				ui.updatePairsDisplay(game);
				game.selectedTile = null;
				saveGameState();
				checkWinLoseCondition();
			} else {
				game.selectedTile = clickedTile;
			}
		} else {
			game.showBlockedHighlight = true;
			game.selectedTile = null;
		}

		draw();
	}

	function showGameMenu() {
		game.isGameActive = false;
		clearInterval(game.timerInterval);
		game.isTimerRunning = false;
		saveGameState();

		ui.showDialog(game, 'gamePausedTitle', '', [
			{ text: 'resume', action: resumeGame, color: 'green' },
			{ text: 'howToPlay', action: showInstructions, color: 'gray' },
			{ text: 'restart', action: restartGame, color: 'yellow' },
			{ text: 'newGame', action: newGame, color: 'blue' },
			{ text: 'changeLayout', action: showLayoutSelector, color: 'gray' },
		]);
	}

	function newGame() {
		startGame(undefined, game.layoutId);
		ui.updateTimerDisplay(game);
	}

	function restartGame() {
		startGame(game.seed, game.layoutId);
		ui.updateTimerDisplay(game);
	}

	function changeLayout(layoutId) {
		startGame(undefined, layoutId);
		ui.updateTimerDisplay(game);
	}

	function resumeGame() {
		game.isGameActive = true;
		game.messageBox.classList.add('hidden-dialog');
		startTimer();
		refreshBoard();
	}

	function showLayoutSelector() {
		const buttons = ui.getLayoutDefinitions().map(layoutDefinition => ({
			text: ui.getLayoutName(layoutDefinition),
			action: () => changeLayout(layoutDefinition.id),
			color: layoutDefinition.id === game.layoutId ? 'green' : 'blue',
		}));
		buttons.push({ text: 'back', action: showGameMenu, color: 'gray' });
		ui.showDialog(game, 'chooseLayoutTitle', 'chooseLayoutContent', buttons);
	}

	function showInstructions() {
		ui.showDialog(game, 'howToPlayTitle', 'howToPlayContent', [
			{ text: 'resume', action: resumeGame, color: 'green' }
		]);
	}

	function reviewBoard() {
		game.messageBox.classList.add('hidden-dialog');
		game.isGameActive = false;
		game.showBlockedHighlight = true;
		draw();
	}

	function shareURI() {
		const strings = ui.getStrings();
		const shareData = {
			title: 'Kyodai Mahjong',
			text: strings.shareMessage,
			url: window.location.href
		};

		navigator.share(shareData)
			.then(() => console.log('Successfully shared'))
			.catch((error) => console.log('Error sharing', error));
	}

	function showWinLoseDialog(isWin, reasonString = null) {
		game.isGameActive = false;
		const strings = ui.getStrings();
		let title = isWin ? 'winTitle' : 'gameOverTitle';
		let content = '';
		let buttons = [];
		let effectFunction = (callback) => callback();

		if (isWin) {
			const minutes = Math.floor(game.timeElapsed / 60).toString().padStart(2, '0');
			const seconds = (game.timeElapsed % 60).toString().padStart(2, '0');
			content = `<b>${strings.score}: ${getScore()}</b><p>${strings.winContent(game.initialPairs, `${minutes}:${seconds}`)}</p>`;
			if (window.showWinEffect) {
				effectFunction = window.showWinEffect;
			}
		} else {
			content = ui.translate(reasonString);
			buttons.push({ text: 'reviewBoard', action: reviewBoard, color: 'gray' });
			if (window.showGameOverEffect) {
				effectFunction = window.showGameOverEffect;
			}
		}

		if (navigator.share) {
			buttons.push({ text: 'share', action: shareURI, color: 'green' });
		}

		buttons.push({ text: 'restart', action: restartGame, color: 'yellow' });
		buttons.push({ text: 'newGame', action: newGame, color: 'blue' });

		effectFunction(() => ui.showDialog(game, title, content, buttons));
		clearSavedGameState();
	}

	game.layoutId = ui.defaultLayoutId;
	ui.initUi(game, {
		onCanvasClick: handleClick,
		onCanvasTouch: handleTouch,
		onResize: resizeCanvas,
		onBeforeUnload: saveGameState,
		onMenuClick: showGameMenu,
	});

	await ui.preloadImages(game, tileTypes);
	loadGameState();
	refreshBoard();
};

const mahjongLogic = {
	startGameLogic,
	checkWinLoseConditionLogic,
	isFreeLogic,
	saveGameStateLogic,
	loadGameStateLogic,
	clearSavedGameStateLogic: clearSavedGameState
};

// Export all the logic functions to be used by the main script
if (typeof window !== 'undefined') {
	window.mahjongLogic = mahjongLogic;
	registerServiceWorker();
	window.addEventListener('load', initBrowserApp);
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		tileTypes,
		game,
		getPositionKey,
		getLayoutPositions,
		countTilesInLayout,
		createLayoutAnalysis,
		buildOccupancyMask,
		isPositionFreeInMask,
		getFreePositionIndices,
		createRandomSeed,
		hashSeed,
		getLocalStorage,
		readSavedGameState,
		writeSavedGameState,
		clearSavedGameState,
		createSeededRandom,
		shuffleArray,
		generateUUID,
		findSolvablePairSequence,
		createSolvableTileSet,
		startGameLogic,
		saveGameStateLogic,
		loadGameStateLogic,
		checkWinLoseConditionLogic,
		getScore,
		isFreeLogic,
	};
}
