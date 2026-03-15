(function() {
	const defaultLayoutId = 'pyramid';

	const layoutDefinitions = [
		{
			id: 'pyramid',
			name: {
				en: 'Pyramid',
				es: 'Pirámide',
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
			id: 'heart',
			name: {
				en: 'Heart',
				es: 'Corazón',
			},
			pattern: [
				[
					' oo  oo ',
					'oooooooo',
					'oooooooo',
					' oooooo ',
					'  oooo  ',
					'  oooo  ',
					'   oo   '
				],
				[
					' oooo ',
					'oooooo',
					' oooo ',
					'  oo  '
				],
				[
					' ooo ',
					'ooooo',
					' ooo ',
					'  o  '
				],
				[
					' oo ',
					'oooo',
					' oo '
				]
			]
		},
		{
			id: 'tower',
			name: {
				en: 'Tower',
				es: 'Torre',
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
			id: 'egg',
			name: {
				en: 'Egg',
				es: 'Huevo',
			},
			pattern: [
				[
					'   oo   ',
					'  oooo  ',
					' oooooo ',
					' oooooo ',
					'oooooooo',
					'oooooooo',
					' oooooo ',
					' oooooo ',
					'  oooo  '
				],
				[
					'        ',
					'        ',
					'  oooo  ',
					' oooooo ',
					' oooooo ',
					'  oooo  '
				],
				[
					'        ',
					'        ',
					'   oo   ',
					'  oooo  ',
					'   oo   '
				],
				[
					'      ',
					'      ',
					'  oo  ',
					'  oo  '
				],
				[
					'    ',
					'    ',
					' oo '
				]
			]
		},
		{
			id: 'turtle',
			name: {
				en: 'Turtle',
				es: 'Tortuga',
			},
			pattern: [
				[
					'   o   ',
					'  ooo  ',
					' ooooo ',
					' ooooo ',
					'ooooooo',
					' ooooo ',
					'ooooooo',
					'  ooo  ',
					'   o   '
				],
				[
					'  ooo  ',
					' ooooo ',
					'ooooooo',
					' ooooo ',
				],
				[
					' ooo ',
					'ooooo',
					' ooo '
				],
				[
					' ooo ',
					' ooo '
				],
				[
					'oo'
				]
			]
		},
		{
			id: 'lantern',
			name: {
				en: 'Lantern',
				es: 'Farol',
			},
			pattern: [
				[
					'   oo   ',
					'   oo   ',
					'  oooo  ',
					' oooooo ',
					'oooooooo',
					'oooooooo',
					'oooooooo',
					'oooooooo',
					'oooooooo',
					'oooooooo',
					'oooooooo',
					' oooooo ',
					'  oooo  ',
					'   oo   ',
					'   oo   '
				],
				[
					'        ',
					'        ',
					'  oooo  ',
					' oooooo ',
					'oooooooo',
					' oooooo ',
					'  oooo  '
				],
				[
					'        ',
					'        ',
					'  oooo  ',
					' oooooo ',
					' oooooo ',
					'  oooo  '
				],
				[
					'      ',
					'      ',
					'  oo  ',
					' oooo ',
					'  oo  '
				],
				[
					'    ',
					'    ',
					' oo ',
					' oo '
				]
			]
		},
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
