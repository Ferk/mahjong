(function() {
	const locales = {
		en: {
			pairsText: 'Pairs:',
			gamePausedTitle: 'Game Paused',
			welcomeBackTitle: 'Welcome Back!',
			welcomeBackContent: 'It looks like you have a game in progress. Would you like to continue?',
			howToPlayTitle: 'How to Play',
			howToPlayContent: "Match pairs of identical tiles to clear the board. A tile is 'free' and can be selected if it is not blocked on its left and right sides by another tile and has no tile on top of it. Clear all the tiles to win!",
			winTitle: 'You Win!',
			winContent: (pairs, time) => `You cleared all ${pairs} pairs in ${time}!`,
			gameOverTitle: 'Game Over 😔',
			noMoreMoves: 'No more valid moves are possible.',
			resume: 'Resume',
			back: 'Back',
			howToPlay: 'How to Play',
			restart: 'Retry',
			newGame: 'New Game',
			changeLayout: 'Change Layout',
			chooseLayoutTitle: 'Choose Layout',
			chooseLayoutContent: 'Pick a layout for the next game.',
			layoutTiles: 'Tiles',
			layoutOpen: 'Open',
			layoutLayers: 'Layers',
			reviewBoard: 'Review Board',
			share: 'Share',
			shareMessage: 'Can you solve this Mahjong board?',
			loadingTiles: 'Loading Tiles...',
			loadingContent: 'Please wait while we prepare the game.',
			score: 'Score',
		},
		es: {
			pairsText: 'Pares:',
			gamePausedTitle: 'Juego en Pausa',
			welcomeBackTitle: '¡Bienvenido de Nuevo!',
			welcomeBackContent: 'Parece que tienes una partida en curso. ¿Te gustaría continuar?',
			howToPlayTitle: 'Cómo Jugar',
			howToPlayContent: "Empareja fichas idénticas para despejar el tablero. Una ficha está 'libre' y se puede seleccionar si no está bloqueada a su izquierda y derecha por otra ficha y no tiene ninguna ficha encima. ¡Despeja todas las fichas para ganar!",
			winTitle: '¡Has Ganado!',
			winContent: (pairs, time) => `¡Despejaste todos los ${pairs} pares en ${time}!`,
			gameOverTitle: 'Has perdido 😔',
			noMoreMoves: 'No hay más movimientos válidos.',
			resume: 'Continuar',
			back: 'Atrás',
			howToPlay: 'Cómo Jugar',
			restart: 'Reintentar',
			newGame: 'Nueva Partida',
			changeLayout: 'Cambiar Diseño',
			chooseLayoutTitle: 'Elegir Diseño',
			chooseLayoutContent: 'Elige un diseño para la siguiente partida.',
			layoutTiles: 'Fichas',
			layoutOpen: 'Libres',
			layoutLayers: 'Capas',
			reviewBoard: 'Revisar Tablero',
			share: 'Compartir',
			shareMessage: '¿Eres capaz de resolver este Mahjong?',
			loadingTiles: 'Cargando Fichas...',
			loadingContent: 'Por favor, espera mientras preparamos el juego.',
			score: 'Puntuación',
		}
	};

	const layoutsSource = typeof window !== 'undefined' && window.mahjongLayouts
		? window.mahjongLayouts
		: require('./layouts.js');
	const {
		defaultLayoutId,
		layoutDefinitions,
		layoutOptions,
		layoutPatterns,
	} = layoutsSource;

	const state = {
		colors: {
			background: '#f0f0f0',
			stroke: '#000',
			side: '#cccccc',
			selected: '#d9f7a7',
			text: '#000',
			blocked: '#b8b8b8'
		},
		tileImages: {},
		currentLanguage: 'en',
		localizedStrings: locales.en,
	};

	const detectLocale = () => {
		const browserLanguage = navigator.language.split('-')[0];
		state.currentLanguage = locales[browserLanguage] ? browserLanguage : 'en';
		state.localizedStrings = locales[state.currentLanguage];
		return state.localizedStrings;
	};

	const getStrings = () => state.localizedStrings;
	const translate = (keyOrText) => state.localizedStrings[keyOrText] || keyOrText;
	const getLayoutDefinition = (layoutId = defaultLayoutId) => layoutOptions[layoutId] || layoutOptions[defaultLayoutId];
	const getLayoutDefinitions = () => layoutDefinitions;
	const getLayoutPatterns = () => layoutPatterns;
	const getActiveLayout = (game) => getLayoutDefinition(game.layoutId || defaultLayoutId).pattern;
	const getLayoutName = (layoutDefinition, language = state.currentLanguage) => {
		if (!layoutDefinition || !layoutDefinition.name) {
			return '';
		}

		return layoutDefinition.name[language] || layoutDefinition.name.en || layoutDefinition.id;
	};

	const getBoardMetrics = (game, activeLayout = getActiveLayout(game)) => {
		const baseLayer = activeLayout[0];
		const baseLayerWidth = baseLayer[0].length;
		const baseLayerHeight = baseLayer.length;
		const maxZ = activeLayout.length - 1;
		const boardPadding = 8;

		return {
			baseLayerWidth,
			baseLayerHeight,
			boardIdealWidth: baseLayerWidth * game.tileSize.width + maxZ * game.tileSize.depth + boardPadding * 2,
			boardIdealHeight: baseLayerHeight * game.tileSize.height + maxZ * game.tileSize.depth + boardPadding * 2,
		};
	};

	const roundRect = (ctx, x, y, width, height, radius) => {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	};

	const drawTile = (game, x, y, size, value, isSelected, isFreeTile) => {
		game.ctx.save();
		game.ctx.translate(x, y);
		game.ctx.imageSmoothingEnabled = false;

		if (isSelected) {
			game.ctx.fillStyle = state.colors.selected;
			const padding = 4;
			roundRect(game.ctx, -padding, -padding, size.width + 2 * padding, size.height + 2 * padding, 8);
			game.ctx.fill();
		}

		let fillStyle;
		if (isSelected) {
			fillStyle = state.colors.selected;
		} else if (!isFreeTile && game.showBlockedHighlight) {
			fillStyle = state.colors.blocked;
		} else {
			fillStyle = state.colors.background;
		}

		game.ctx.fillStyle = fillStyle;
		game.ctx.strokeStyle = state.colors.stroke;
		game.ctx.lineWidth = 2;
		roundRect(game.ctx, 0, 0, size.width, size.height, 8);
		game.ctx.fill();
		game.ctx.stroke();

		game.ctx.fillStyle = state.colors.side;
		game.ctx.beginPath();
		game.ctx.moveTo(size.width, 0);
		game.ctx.lineTo(size.width + size.depth, size.depth);
		game.ctx.lineTo(size.width + size.depth, size.height + size.depth);
		game.ctx.lineTo(size.width, size.height);
		game.ctx.closePath();
		game.ctx.fill();

		game.ctx.beginPath();
		game.ctx.moveTo(0, size.height);
		game.ctx.lineTo(size.depth, size.height + size.depth);
		game.ctx.lineTo(size.width + size.depth, size.height + size.depth);
		game.ctx.lineTo(size.width, size.height);
		game.ctx.closePath();
		game.ctx.fill();

		const image = state.tileImages[value];
		if (image) {
			const imageScale = Math.min(size.width / image.width, size.height / image.height) * 0.9;
			const imageWidth = image.width * imageScale;
			const imageHeight = image.height * imageScale;
			const imageX = (size.width - imageWidth) / 2;
			const imageY = (size.height - imageHeight) / 2;
			game.ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
		} else {
			game.ctx.fillStyle = state.colors.text;
			game.ctx.font = `${size.height * 0.7}px Arial`;
			game.ctx.textAlign = 'center';
			game.ctx.textBaseline = 'middle';
			game.ctx.fillText(value || '', size.width / 2, size.height / 2);
		}

		game.ctx.restore();
	};

	const draw = (game, isFree) => {
		if (!game.ctx || !game.canvas) {
			return;
		}

		game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
		if (game.tiles.length === 0) {
			return;
		}

		const activeLayout = getActiveLayout(game);
		const scaledTileSize = {
			width: game.tileSize.width * game.scale,
			height: game.tileSize.height * game.scale,
			depth: game.tileSize.depth * game.scale,
		};
		const { baseLayerWidth, baseLayerHeight } = getBoardMetrics(game, activeLayout);
		const boardWidth = baseLayerWidth * game.tileSize.width * game.scale;
		const boardHeight = baseLayerHeight * game.tileSize.height * game.scale;
		const globalOffsetX = (game.canvas.width - boardWidth) / 2;
		const globalOffsetY = (game.canvas.height - boardHeight) / 2;

		const sortedTiles = [...game.tiles].sort((firstTile, secondTile) => firstTile.z - secondTile.z);
		sortedTiles.forEach(tile => {
			const layer = activeLayout[tile.z];
			const layerWidth = layer[0].length;
			const layerHeight = layer.length;
			const layerOffsetX = (baseLayerWidth - layerWidth) / 2 * scaledTileSize.width;
			const layerOffsetY = (baseLayerHeight - layerHeight) / 2 * scaledTileSize.height;
			const x = tile.x * scaledTileSize.width - tile.z * scaledTileSize.depth + layerOffsetX + globalOffsetX;
			const y = tile.y * scaledTileSize.height - tile.z * scaledTileSize.depth + layerOffsetY + globalOffsetY;

			drawTile(
				game,
				x,
				y,
				scaledTileSize,
				tile.value,
				tile.id === (game.selectedTile ? game.selectedTile.id : null),
				isFree(tile)
			);
		});
	};

	const resizeCanvas = (game, drawCallback) => {
		if (!game.canvas || !game.canvas.parentElement) {
			return;
		}

		const container = game.canvas.parentElement;
		const availableWidth = container.clientWidth;
		const availableHeight = container.clientHeight;
		const { boardIdealWidth, boardIdealHeight } = getBoardMetrics(game);
		const boardAspectRatio = boardIdealWidth / boardIdealHeight;

		let finalWidth;
		let finalHeight;

		if (availableWidth / availableHeight > boardAspectRatio) {
			finalHeight = availableHeight;
			finalWidth = finalHeight * boardAspectRatio;
		} else {
			finalWidth = availableWidth;
			finalHeight = finalWidth / boardAspectRatio;
		}

		game.canvas.style.width = `${finalWidth}px`;
		game.canvas.style.height = `${finalHeight}px`;
		game.canvas.width = finalWidth * 4;
		game.canvas.height = finalHeight * 4;
		game.scale = finalWidth * 4 / boardIdealWidth;

		if (typeof drawCallback === 'function') {
			drawCallback();
		}
	};

	const scheduleResize = (game, drawCallback) => {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => resizeCanvas(game, drawCallback));
		});
	};

	const initUi = (game, handlers) => {
		detectLocale();

		game.canvas = document.getElementById('game-canvas');
		game.ctx = game.canvas.getContext('2d');
		game.messageBox = document.getElementById('message-box');
		game.dialogPanel = document.getElementById('dialog-panel');
		game.dialogTitle = document.getElementById('dialog-title');
		game.dialogContent = document.getElementById('dialog-content');
		game.dialogButtons = document.getElementById('dialog-buttons');
		game.timerDisplay = document.getElementById('timer-display');
		game.pairsDisplay = document.getElementById('pairs-remaining-display');

		game.canvas.addEventListener('mousedown', handlers.onCanvasClick);
		game.canvas.addEventListener('touchstart', handlers.onCanvasTouch, { passive: false });
		window.addEventListener('resize', handlers.onResize);
		window.addEventListener('beforeunload', handlers.onBeforeUnload);
		document.getElementById('top-bar').addEventListener('click', handlers.onMenuClick);

		if ('ResizeObserver' in window) {
			game.resizeObserver = new ResizeObserver(() => scheduleResize(game, handlers.onResize));
			game.resizeObserver.observe(game.canvas.parentElement);
		}

		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(() => scheduleResize(game, handlers.onResize));
		}
	};

	const preloadImages = (game, tileTypes) => {
		showDialog(game, 'loadingTiles', 'loadingContent', []);

		const promises = tileTypes.map(tileType => new Promise((resolve) => {
			const image = new Image();
			image.onload = () => {
				state.tileImages[tileType] = image;
				resolve();
			};
			image.onerror = () => {
				console.log(`Failed to load image for tile: ${tileType}.png. Falling back to text.`);
				resolve();
			};
			image.src = `tiles/${tileType}.png`;
		}));

		return Promise.all(promises);
	};

	const updatePairsDisplay = (game) => {
		if (game.pairsDisplay) {
			game.pairsDisplay.textContent = `${state.localizedStrings.pairsText} ${game.pairsRemaining}`;
		}
	};

	const updateTimerDisplay = (game) => {
		if (!game.timerDisplay) {
			return;
		}

		const minutes = Math.floor(game.timeElapsed / 60).toString().padStart(2, '0');
		const seconds = (game.timeElapsed % 60).toString().padStart(2, '0');
		game.timerDisplay.textContent = `${minutes}:${seconds}`;
	};

	const createDialogButton = (buttonData) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = translate(buttonData.text);
		button.onclick = buttonData.action;
		button.className = 'px-6 py-3 rounded-full text-white font-bold transition-colors duration-300 shadow-lg';

		switch (buttonData.color) {
			case 'green':
				button.classList.add('bg-green-500', 'hover:bg-green-600');
				break;
			case 'yellow':
				button.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
				break;
			case 'blue':
				button.classList.add('bg-blue-500', 'hover:bg-blue-600');
				break;
			case 'gray':
				button.classList.add('bg-gray-500', 'hover:bg-gray-600');
				break;
		}

		return button;
	};

	const prepareDialog = (game, title, content) => {
		const resolvedTitle = translate(title);
		const resolvedContent = translate(content);

		game.dialogTitle.textContent = resolvedTitle;
		game.dialogContent.innerHTML = resolvedContent;
		game.dialogButtons.innerHTML = '';
	};

	const setDialogVariant = (game, variant = 'default') => {
		if (!game.dialogPanel) {
			return;
		}

		game.dialogPanel.classList.remove('w-auto', 'max-w-xl', 'w-11/12', 'max-w-4xl');

		if (variant === 'wide') {
			game.dialogPanel.classList.add('w-11/12', 'max-w-4xl');
			return;
		}

		game.dialogPanel.classList.add('w-auto', 'max-w-xl');
	};

	const appendDialogButtons = (game, buttons) => {
		game.dialogButtons.innerHTML = '';

		buttons.forEach(buttonData => {
			game.dialogButtons.appendChild(createDialogButton(buttonData));
		});

		game.dialogButtons.style.display = buttons.length > 0 ? 'flex' : 'none';
	};

	const getLayoutPreviewBounds = (layoutPattern, tileWidth, tileHeight, elevationX, elevationY) => {
		const baseLayer = layoutPattern[0];
		const baseLayerWidth = baseLayer[0].length;
		const baseLayerHeight = baseLayer.length;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		layoutPattern.forEach((layer, z) => {
			const layerWidth = layer[0].length;
			const layerHeight = layer.length;
			const layerOffsetX = (baseLayerWidth - layerWidth) / 2 * tileWidth;
			const layerOffsetY = (baseLayerHeight - layerHeight) / 2 * tileHeight;

			for (let y = 0; y < layer.length; y++) {
				for (let x = 0; x < layer[y].length; x++) {
					if (layer[y][x] !== 'o') {
						continue;
					}

					const tileX = x * tileWidth - z * elevationX + layerOffsetX;
					const tileY = y * tileHeight - z * elevationY + layerOffsetY;

					minX = Math.min(minX, tileX);
					maxX = Math.max(maxX, tileX + tileWidth);
					minY = Math.min(minY, tileY);
					maxY = Math.max(maxY, tileY + tileHeight);
				}
			}
		});

		return {
			minX,
			maxX,
			minY,
			maxY,
			width: maxX - minX,
			height: maxY - minY,
		};
	};

	const createLayoutPreview = (layoutDefinition) => {
		const previewWidth = 112;
		const previewHeight = 112;
		const tileWidth = 14;
		const tileHeight = 11;
		const tileDepth = 1.8;
		const elevationX = tileDepth * 0.6;
		const elevationY = tileDepth * 0.45;
		const padding = 10;
		const unscaledBounds = getLayoutPreviewBounds(
			layoutDefinition.pattern,
			tileWidth,
			tileHeight,
			elevationX,
			elevationY
		);
		const scale = Math.min(
			(previewWidth - padding * 2) / unscaledBounds.width,
			(previewHeight - padding * 2) / unscaledBounds.height
		);
		const scaledTileWidth = tileWidth * scale;
		const scaledTileHeight = tileHeight * scale;
		const scaledElevationX = elevationX * scale;
		const scaledElevationY = elevationY * scale;
		const scaledTileDepth = tileDepth * scale;
		const scaledBounds = getLayoutPreviewBounds(
			layoutDefinition.pattern,
			scaledTileWidth,
			scaledTileHeight,
			scaledElevationX,
			scaledElevationY
		);
		const globalOffsetX = (previewWidth - scaledBounds.width) / 2 - scaledBounds.minX;
		const globalOffsetY = (previewHeight - scaledBounds.height) / 2 - scaledBounds.minY;
		const baseLayer = layoutDefinition.pattern[0];
		const baseLayerWidth = baseLayer[0].length;
		const baseLayerHeight = baseLayer.length;
		const preview = document.createElement('div');

		preview.className = 'relative mx-auto h-28 w-28 max-w-full rounded-2xl bg-slate-100/70 ring-1 ring-slate-200/80';

		layoutDefinition.pattern.forEach((layer, z) => {
			const layerWidth = layer[0].length;
			const layerHeight = layer.length;
			const layerOffsetX = (baseLayerWidth - layerWidth) / 2 * scaledTileWidth;
			const layerOffsetY = (baseLayerHeight - layerHeight) / 2 * scaledTileHeight;
			const faceLightness = Math.max(74, 91 - z * 4);
			const sideLightness = Math.max(66, 84 - z * 4);

			for (let y = 0; y < layer.length; y++) {
				for (let x = 0; x < layer[y].length; x++) {
					if (layer[y][x] !== 'o') {
						continue;
					}

					const tile = document.createElement('div');
					const tileX = x * scaledTileWidth - z * scaledElevationX + layerOffsetX + globalOffsetX;
					const tileY = y * scaledTileHeight - z * scaledElevationY + layerOffsetY + globalOffsetY;

					tile.className = 'absolute rounded-sm border';
					tile.style.left = `${tileX}px`;
					tile.style.top = `${tileY}px`;
					tile.style.width = `${scaledTileWidth}px`;
					tile.style.height = `${scaledTileHeight}px`;
					tile.style.zIndex = String(10 + z);
					tile.style.background = `hsl(39 88% ${faceLightness}%)`;
					tile.style.borderColor = `hsl(33 42% ${Math.max(58, faceLightness - 16)}%)`;
					tile.style.boxShadow = `${scaledTileDepth * 0.7}px ${scaledTileDepth * 0.7}px 0 hsl(34 42% ${sideLightness}% / 0.4)`;
					preview.appendChild(tile);
				}
			}
		});

		return preview;
	};

	const showLayoutDialog = (game, layoutDefinitions, layoutSummaries, currentLayoutId, onLayoutSelected, onBack) => {
		setDialogVariant(game, 'wide');
		prepareDialog(game, 'chooseLayoutTitle', '');

		const intro = document.createElement('p');
		intro.textContent = translate('chooseLayoutContent');
		intro.className = 'mb-4 text-sm md:text-base text-gray-600';

		const grid = document.createElement('div');
		grid.className = 'grid grid-cols-2 gap-3 md:grid-cols-3';

		layoutDefinitions.forEach(layoutDefinition => {
			const card = document.createElement('button');
			const preview = createLayoutPreview(layoutDefinition);
			const summary = layoutSummaries[layoutDefinition.id] || {
				tileCount: 0,
				openTileCount: 0,
				layerCount: layoutDefinition.pattern.length,
			};
			const isSelected = layoutDefinition.id === currentLayoutId;
			const name = document.createElement('span');
			const nameText = getLayoutName(layoutDefinition);

			card.type = 'button';
			card.onclick = () => onLayoutSelected(layoutDefinition.id);
			card.className = 'flex flex-col items-center rounded-2xl border-2 bg-white px-3 py-3 text-center shadow-sm transition-all duration-200';
			card.title = `${nameText} - ${translate('layoutTiles')}: ${summary.tileCount}, ${translate('layoutOpen')}: ${summary.openTileCount}, ${translate('layoutLayers')}: ${summary.layerCount}`;
			card.setAttribute('aria-label', card.title);
			if (isSelected) {
				card.classList.add('border-green-500', 'bg-green-50', 'shadow-md');
			} else {
				card.classList.add('border-slate-200', 'hover:border-sky-400', 'hover:bg-sky-50');
			}

			name.textContent = nameText;
			name.className = 'mt-3 text-xs font-semibold leading-tight text-slate-700 md:text-sm';

			card.appendChild(preview);
			card.appendChild(name);
			grid.appendChild(card);
		});

		game.dialogContent.innerHTML = '';
		game.dialogContent.appendChild(intro);
		game.dialogContent.appendChild(grid);
		appendDialogButtons(game, [
			{ text: 'back', action: onBack, color: 'gray' }
		]);
		game.messageBox.classList.remove('hidden-dialog');
	};

	const showDialog = (game, title, content, buttons) => {
		setDialogVariant(game, 'default');
		prepareDialog(game, title, content);

		appendDialogButtons(game, buttons);
		game.messageBox.classList.remove('hidden-dialog');
	};

	const mahjongUi = {
		defaultLayoutId,
		getStrings,
		translate,
		getLayoutDefinition,
		getLayoutDefinitions,
		getLayoutPatterns,
		getLayoutName,
		getActiveLayout,
		getBoardMetrics,
		initUi,
		preloadImages,
		updatePairsDisplay,
		updateTimerDisplay,
		draw,
		resizeCanvas,
		scheduleResize,
		showLayoutDialog,
		showDialog,
	};

	if (typeof window !== 'undefined') {
		window.mahjongUi = mahjongUi;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = mahjongUi;
	}
})();
