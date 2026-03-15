(function() {
	const defaultLayoutId = 'pyramid4';

	const layoutDefinitions = [
		{
			id: 'pyramid4',
			name: {
				en: '4-Layer Pyramid',
				es: 'Pirámide de 4 Capas',
			},
			pattern: [
				[
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo'
				],
				[
					'ooo',
					'ooo',
					'ooo'
				],
				[
					'oo',
					'oo'
				],
				[
					'o'
				]
			]
		},
		{
			id: 'tower5',
			name: {
				en: '5-Layer Tower',
				es: 'Torre de 5 Capas',
			},
			pattern: [
				[
					' ooo ',
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo',
					'ooooo',
					' ooo '
				],
				[
					'ooo',
					'ooo',
					'ooo',
					'ooo'
				],
				[
					'oo',
					'oo',
					'oo'
				],
				[
					'oo',
					'oo'
				],
				[
					'oo'
				]
			]
		},
		{
			id: 'gate',
			name: {
				en: 'Gate',
				es: 'Puerta',
			},
			pattern: [
				[
					'oooooo',
					'oo  oo',
					'oo  oo',
					'oooooo'
				],
				[
					'oooo',
					'o  o',
					'oooo'
				],
				[
					'oo',
					'oo',
					'oo'
				]
			]
		},
		{
			id: 'butterfly',
			name: {
				en: 'Butterfly',
				es: 'Mariposa',
			},
			pattern: [
				[
					'oo    oo',
					'oooooooo',
					'oooooooo',
					'oo    oo'
				],
				[
					'oooooo',
					'oooooo'
				],
				[
					'oooo'
				]
			]
		}
	];

	const layoutOptions = layoutDefinitions.reduce((allLayouts, definition) => {
		allLayouts[definition.id] = definition;
		return allLayouts;
	}, {});

	const layoutPatterns = layoutDefinitions.reduce((allLayouts, definition) => {
		allLayouts[definition.id] = definition.pattern;
		return allLayouts;
	}, {});

	const mahjongLayouts = {
		defaultLayoutId,
		layoutDefinitions,
		layoutOptions,
		layoutPatterns,
	};

	if (typeof window !== 'undefined') {
		window.mahjongLayouts = mahjongLayouts;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = mahjongLayouts;
	}
})();
