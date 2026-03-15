const test = require('node:test');
const assert = require('node:assert/strict');
const {
	defaultLayoutId,
	layoutDefinitions,
	layoutPatterns,
} = require('../layouts.js');

const {
	createSolvableTileSet,
	getLayoutSummary,
	isFreeLogic,
	loadGameStateLogic,
	saveGameStateLogic,
	checkWinLoseConditionLogic,
} = require('../mah.js');

const defaultLayout = layoutPatterns[defaultLayoutId];
const towerLayout = layoutPatterns.tower;
const layoutCatalog = layoutPatterns;

const getTileKey = (tile) => `${tile.x},${tile.y},${tile.z}`;
const countTilesInPattern = (layout) =>
	layout.reduce(
		(tileCount, layer) => tileCount + layer.reduce(
			(layerTileCount, row) => layerTileCount + [...row].filter(cell => cell === 'o').length,
			0
		),
		0
	);

const countOpeningMatchingPairs = (layout, seed) => {
	const board = createSolvableTileSet(layout, seed);
	const freeTiles = board.tiles.filter(tile => isFreeLogic(tile, board.tiles, layout));
	let freePairs = 0;

	for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex++) {
		for (let secondIndex = firstIndex + 1; secondIndex < freeTiles.length; secondIndex++) {
			if (freeTiles[firstIndex].value === freeTiles[secondIndex].value) {
				freePairs++;
			}
		}
	}

	return freePairs;
};

test('getLayoutSummary reports tiles, starting open tiles, and layers', () => {
	const sampleLayout = [
		[
			'ooo'
		],
		[
			' o '
		]
	];

	assert.deepEqual(getLayoutSummary(sampleLayout), {
		tileCount: 4,
		openTileCount: 3,
		layerCount: 2,
	});
});

const replaySolution = (board, layout) => {
	let remainingTiles = board.tiles.map(tile => ({ ...tile }));

	for (const [firstKey, secondKey] of board.solutionPairs) {
		const firstTile = remainingTiles.find(tile => getTileKey(tile) === firstKey);
		const secondTile = remainingTiles.find(tile => getTileKey(tile) === secondKey);

		assert.ok(firstTile, `Missing tile for ${firstKey}`);
		assert.ok(secondTile, `Missing tile for ${secondKey}`);
		assert.equal(firstTile.value, secondTile.value, 'Solution pair must match');
		assert.equal(isFreeLogic(firstTile, remainingTiles, layout), true, `${firstKey} should be free`);
		assert.equal(isFreeLogic(secondTile, remainingTiles, layout), true, `${secondKey} should be free`);

		remainingTiles = remainingTiles.filter(tile => tile !== firstTile && tile !== secondTile);
	}

	assert.equal(remainingTiles.length, 0, 'Solution should clear the board');
};

const createLocalStorageMock = (initial = {}) => {
	const store = new Map(Object.entries(initial));

	return {
		getItem(key) {
			return store.has(key) ? store.get(key) : null;
		},
		setItem(key, value) {
			store.set(key, String(value));
		},
		removeItem(key) {
			store.delete(key);
		},
		clear() {
			store.clear();
		},
	};
};

test('createSolvableTileSet is deterministic and replayable for seeded boards', () => {
	const firstBoard = createSolvableTileSet(defaultLayout, 'A1b2C3');
	const secondBoard = createSolvableTileSet(defaultLayout, 'A1b2C3');
	const differentBoard = createSolvableTileSet(defaultLayout, 'Z9y8X7');

	const firstSnapshot = firstBoard.tiles.map(tile => `${getTileKey(tile)}:${tile.value}`).join('|');
	const secondSnapshot = secondBoard.tiles.map(tile => `${getTileKey(tile)}:${tile.value}`).join('|');
	const differentSnapshot = differentBoard.tiles.map(tile => `${getTileKey(tile)}:${tile.value}`).join('|');

	assert.equal(firstSnapshot, secondSnapshot);
	assert.notEqual(firstSnapshot, differentSnapshot);
	assert.equal(firstBoard.tiles.length, 44);
	assert.equal(firstBoard.solutionPairs.length, 22);

	const valueCounts = new Map();
	for (const tile of firstBoard.tiles) {
		valueCounts.set(tile.value, (valueCounts.get(tile.value) || 0) + 1);
	}

	assert.equal([...valueCounts.values()].every(count => count === 4), true);
	replaySolution(firstBoard, defaultLayout);
	replaySolution(differentBoard, defaultLayout);
});

test('createSolvableTileSet supports every registered layout', async (t) => {
	for (const layoutDefinition of layoutDefinitions) {
		await t.test(layoutDefinition.id, () => {
			const expectedTiles = countTilesInPattern(layoutDefinition.pattern);
			const board = createSolvableTileSet(layoutDefinition.pattern, `${layoutDefinition.id}-seed`);

			assert.equal(board.tiles.length, expectedTiles);
			assert.equal(board.solutionPairs.length, expectedTiles / 2);
			replaySolution(board, layoutDefinition.pattern);
		});
	}
});

test('smarter value pairing avoids too many obvious opening matches', () => {
	const sampledSeeds = Array.from({ length: 12 }, (_, index) => index);
	const pyramidAverage = sampledSeeds.reduce(
		(total, index) => total + countOpeningMatchingPairs(defaultLayout, `pyramid-${index}`),
		0
	) / sampledSeeds.length;
	const heartAverage = sampledSeeds.reduce(
		(total, index) => total + countOpeningMatchingPairs(layoutPatterns.heart, `heart-${index}`),
		0
	) / sampledSeeds.length;

	assert.ok(pyramidAverage <= 6, `Expected pyramid to average at most 6 opening matches, got ${pyramidAverage}`);
	assert.ok(heartAverage <= 10, `Expected heart to average at most 10 opening matches, got ${heartAverage}`);
});

test('isFreeLogic handles side and top blocking correctly', () => {
	const rowLayout = [['ooo']];
	const leftTile = { x: 0, y: 0, z: 0, value: '1m' };
	const middleTile = { x: 1, y: 0, z: 0, value: '1m' };
	const rightTile = { x: 2, y: 0, z: 0, value: '1m' };

	assert.equal(isFreeLogic(leftTile, [leftTile, middleTile, rightTile], rowLayout), true);
	assert.equal(isFreeLogic(rightTile, [leftTile, middleTile, rightTile], rowLayout), true);
	assert.equal(isFreeLogic(middleTile, [leftTile, middleTile, rightTile], rowLayout), false);
	assert.equal(isFreeLogic(middleTile, [middleTile], rowLayout), true);

	const stackedLayout = [
		['ooo'],
		['o']
	];
	const topTile = { x: 0, y: 0, z: 1, value: '2p' };

	assert.equal(isFreeLogic(middleTile, [leftTile, middleTile, rightTile, topTile], stackedLayout), false);
});

test('saveGameStateLogic persists score state needed for restored games', () => {
	global.localStorage = createLocalStorageMock();

	saveGameStateLogic({
		tiles: [{ id: 'tile-1' }],
		timeElapsed: 18,
		pairsRemaining: 5,
		initialPairs: 22,
		seed: 'Z9ab12',
		layoutId: 'tower',
		extraScore: 17,
		lastPairTime: new Date('2026-03-15T12:00:00.000Z'),
	});

	const savedState = JSON.parse(global.localStorage.getItem('mahjongGameState'));
	assert.equal(savedState.layoutId, 'tower');
	assert.equal(savedState.extraScore, 17);
	assert.equal(savedState.lastPairTime, '2026-03-15T12:00:00.000Z');
});

test('loadGameStateLogic restores a compatible saved game', () => {
	const savedBoard = createSolvableTileSet(defaultLayout, 'abc123');
	global.localStorage = createLocalStorageMock({
		mahjongGameState: JSON.stringify({
			tiles: savedBoard.tiles,
			timeElapsed: 33,
			pairsRemaining: 10,
			initialPairs: 22,
			seed: 'abc123',
			layoutId: 'pyramid',
			extraScore: 9,
			lastPairTime: '2026-03-15T12:00:00.000Z',
		}),
	});
	global.window = {
		location: { search: '?s=abc123&l=pyramid' },
		history: { pushState() {} },
		updatePairsDisplay() {},
	};

	const game = {
		tiles: [],
		timeElapsed: 0,
		pairsRemaining: 0,
		initialPairs: 0,
		seed: null,
		extraScore: 0,
		lastPairTime: null,
		messageBox: null,
	};

	let dialogCall = null;
	let drawCalls = 0;
	let refreshCalls = 0;
	let timerStarts = 0;

	loadGameStateLogic(
		game,
		layoutCatalog,
		defaultLayoutId,
		() => {},
		(...args) => { dialogCall = args; },
		() => { drawCalls++; },
		() => { timerStarts++; },
		() => { refreshCalls++; }
	);

	assert.equal(game.tiles.length, savedBoard.tiles.length);
	assert.equal(game.timeElapsed, 33);
	assert.equal(game.pairsRemaining, 10);
	assert.equal(game.extraScore, 9);
	assert.equal(game.layoutId, 'pyramid');
	assert.ok(game.lastPairTime instanceof Date);
	assert.equal(drawCalls, 1);
	assert.equal(refreshCalls, 1);
	assert.equal(timerStarts, 0);
	assert.deepEqual(dialogCall.slice(0, 2), ['welcomeBackTitle', 'welcomeBackContent']);
	assert.deepEqual(
		dialogCall[2].map(button => button.text),
		['resume', 'newGame']
	);
});

test('loadGameStateLogic starts a new solvable game when saved state is incompatible', () => {
	global.localStorage = createLocalStorageMock({
		mahjongGameState: JSON.stringify({
			tiles: [],
			timeElapsed: 12,
			pairsRemaining: 4,
			initialPairs: 22,
			layoutId: 'pyramid',
			seed: 'keepme',
		}),
	});
	global.window = {
		location: { search: '?s=newSeed&l=tower' },
		history: { pushState() {} },
		updatePairsDisplay() {},
	};

	const game = {
		tiles: [],
		timeElapsed: 0,
		pairsRemaining: 0,
		initialPairs: 0,
		seed: null,
		extraScore: 0,
		lastPairTime: null,
		messageBox: null,
		timerInterval: null,
		isTimerRunning: false,
		isGameActive: false,
		showBlockedHighlight: false,
		selectedTile: null,
	};

	let dialogCalls = 0;
	let refreshCalls = 0;
	let drawCalls = 0;

	loadGameStateLogic(
		game,
		layoutCatalog,
		defaultLayoutId,
		() => {},
		() => { dialogCalls++; },
		() => { drawCalls++; },
		() => {},
		() => { refreshCalls++; }
	);

	assert.equal(dialogCalls, 0);
	assert.equal(refreshCalls, 1);
	assert.equal(drawCalls, 1);
	assert.equal(game.tiles.length, 60);
	assert.equal(game.initialPairs, 30);
	assert.equal(game.pairsRemaining, 30);
	assert.equal(game.seed, 'newSeed');
	assert.equal(game.layoutId, 'tower');

	replaySolution(
		{
			tiles: game.tiles.map(tile => ({ x: tile.x, y: tile.y, z: tile.z, value: tile.value })),
			solutionPairs: createSolvableTileSet(towerLayout, 'newSeed').solutionPairs,
		},
		towerLayout
	);
});

test('loadGameStateLogic falls back to a new game when storage access throws', () => {
	global.localStorage = {
		getItem() {
			throw new DOMException('The operation is insecure.', 'SecurityError');
		},
		setItem() {
			throw new DOMException('The operation is insecure.', 'SecurityError');
		},
		removeItem() {
			throw new DOMException('The operation is insecure.', 'SecurityError');
		},
	};
	global.window = {
		location: { search: '?s=abc123' },
		history: { pushState() {} },
		updatePairsDisplay() {},
	};

	const game = {
		tiles: [],
		timeElapsed: 0,
		pairsRemaining: 0,
		initialPairs: 0,
		seed: null,
		extraScore: 0,
		lastPairTime: null,
		messageBox: null,
		timerInterval: null,
		isTimerRunning: false,
		isGameActive: false,
		showBlockedHighlight: false,
		selectedTile: null,
	};

	let drawCalls = 0;

	assert.doesNotThrow(() => {
		loadGameStateLogic(
			game,
			layoutCatalog,
			defaultLayoutId,
			() => {},
			() => {},
			() => { drawCalls++; },
			() => {},
			() => {}
		);
	});

	assert.equal(drawCalls, 1);
	assert.equal(game.seed, 'abc123');
	assert.equal(game.layoutId, 'pyramid');
	assert.equal(game.tiles.length, 44);
	assert.equal(game.initialPairs, 22);
	assert.equal(game.pairsRemaining, 22);
});

test('checkWinLoseConditionLogic stops the timer when the game is over', () => {
	const winningGame = {
		tiles: [],
		timerInterval: setInterval(() => {}, 1000),
		isTimerRunning: true,
		isGameActive: true,
	};

	let winDialog = null;
	checkWinLoseConditionLogic(
		winningGame,
		(...args) => { winDialog = args; },
		() => true
	);

	assert.deepEqual(winDialog, [true]);
	assert.equal(winningGame.isTimerRunning, false);

	const losingGame = {
		tiles: [
			{ value: '1m' },
			{ value: '2m' }
		],
		timerInterval: setInterval(() => {}, 1000),
		isTimerRunning: true,
		isGameActive: true,
	};

	let loseDialog = null;
	checkWinLoseConditionLogic(
		losingGame,
		(...args) => { loseDialog = args; },
		() => true
	);

	assert.deepEqual(loseDialog, [false, 'noMoreMoves']);
	assert.equal(losingGame.isTimerRunning, false);
	assert.equal(losingGame.isGameActive, false);
});
