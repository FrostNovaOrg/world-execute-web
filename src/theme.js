//#region src/theme.js
var COL = {
	me: [
		.42,
		.92,
		1
	],
	meDeep: [
		.12,
		.35,
		1
	],
	you: [
		1,
		.55,
		.22
	],
	rose: [
		1,
		.28,
		.55
	],
	gold: [
		1,
		.78,
		.38
	],
	white: [
		.92,
		.95,
		1
	],
	violet: [
		.55,
		.35,
		1
	],
	red: [
		1,
		.12,
		.08
	],
	subject: [
		.42,
		.92,
		1
	],
	partner: [
		1,
		.55,
		.22
	],
	dim: [
		.32,
		.36,
		.44
	]
};
var HEX = {
	me: "#7ef0ff",
	you: "#ffb36b",
	rose: "#ff6fa8",
	gold: "#ffd27a",
	white: "#eef3ff",
	dim: "#65708a",
	red: "#ff4a3d",
	violet: "#a98bff",
	subject: "#7ef0ff",
	partner: "#ffb36b",
	text: "#eef3ff",
	accent: "#9ff3ff"
};
var THEME = {
	lyrics: {
		font: "JetBrains Mono",
		size: 38,
		weight: 500,
		color: "#e9f1ff",
		accent: HEX.accent,
		glow: 14,
		x: 960,
		y: 968,
		align: "center",
		hold: .35,
		skipCaps: true
	},
	pointcut: { ball: [
		.42,
		.92,
		1
	] },
	dissolveEdge: [
		.6,
		.9,
		1
	],
	swarm: { color: [
		.5,
		.95,
		1
	] },
	rampCol: [
		.8879,
		.8469,
		.7605
	],
	views: {
		ascii: {
			ink: [
				.07,
				.08,
				.1
			],
			paper: [
				.93,
				.92,
				.88
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		dither: {
			ink: [
				.93,
				.95,
				1
			],
			paper: [
				0,
				0,
				0
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		thermal: {
			ink: [
				.07,
				.08,
				.1
			],
			paper: [
				.93,
				.92,
				.88
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		edges: {
			ink: [
				.85,
				.95,
				1
			],
			paper: [
				0,
				0,
				0
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		paper: {
			ink: [
				.07,
				.08,
				.1
			],
			paper: [
				.93,
				.92,
				.88
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		halftone: {
			ink: [
				.93,
				.95,
				1
			],
			paper: [
				0,
				0,
				0
			],
			tint: [
				.42,
				.92,
				1
			]
		},
		duotone: {
			ink: [
				.07,
				.08,
				.1
			],
			paper: [
				.93,
				.92,
				.88
			],
			tint: [
				.42,
				.92,
				1
			]
		}
	}
};
//#endregion
export { COL, HEX, THEME };
