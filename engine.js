let fastForward = false;

const ATYPES = {
	INITIALIZE_ENTITY: "INITIALIZE_ENTITY",
	REMOVE_ENTITY: "REMOVE_ENTITY",
	SET_SPRITE: "SET_SPRITE",
	CHANGE_POSITION_X: "CHANGE_POSITION_X",
	CHANGE_POSITION_Y: "CHANGE_POSITION_Y",
	CHANGE_SIZE_X: "CHANGE_SIZE_X",
	CHANGE_SIZE_Y: "CHANGE_SIZE_Y",
	CHANGE_OPACITY: "CHANGE_OPACITY",
	CHANGE_ROTATION: "CHANGE_ROTATION",
	PLAY_ANIMATION: "PLAY_ANIMATION",
	PAUSE_ANIMATION: "PAUSE_ANIMATION",

	// DISJOINT
	SET_POSITION_X: "SET_POSITION_X",
	SET_POSITION_Y: "SET_POSITION_Y",
	SET_SIZE_X: "SET_SIZE_X",
	SET_SIZE_Y: "SET_SIZE_Y",
	SET_OPACITY: "SET_OPACITY",
	SET_ROTATION: "SET_ROTATION",
	PLAY_SOUND: "PLAY_SOUND",
	SET_FRAME: "SET_FRAME",

	// INTERNAL
	START_CHANGE_POSITION_X: "START_CHANGE_POSITION_X",
	END_CHANGE_POSITION_X: "END_CHANGE_POSITION_X",
	START_CHANGE_POSITION_Y: "START_CHANGE_POSITION_Y",
	END_CHANGE_POSITION_Y: "END_CHANGE_POSITION_Y",

	START_CHANGE_SIZE_X: "START_CHANGE_SIZE_X",
	END_CHANGE_SIZE_X: "END_CHANGE_SIZE_X",
	START_CHANGE_SIZE_Y: "START_CHANGE_SIZE_Y",
	END_CHANGE_SIZE_Y: "END_CHANGE_SIZE_Y",

	START_CHANGE_OPACITY: "START_CHANGE_OPACITY",
	END_CHANGE_OPACITY: "END_CHANGE_OPACITY",

	START_CHANGE_ROTATION: "START_CHANGE_ROTATION",
	END_CHANGE_ROTATION: "END_CHANGE_ROTATION",
};

const EASE_TYPES = {
	CONSTANT: (start, end, i, l) => start + (end - start) * (i / l),
	EASE_IN: (start, end, i, l) => start + (end - start) * (i / l) * (i / l),
	EASE_OUT: (start, end, i, l) => start + (end - start) * Math.sqrt(i / l),
};

class Sprite {
	constructor(path, sizeX, sizeY, indices) {
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.indices = indices;
		this.img = new Image();
		this.img.src = path;
	}

	draw(ctx, x, y, sX, sY, options = {}) {
		const { mirror, iIndex, cropX, cropY } = options;
		if (mirror) {
			ctx.save();
			ctx.setTransform(
				-1,
				0, // set the direction of x axis
				0,
				1, // set the direction of y axis
				x + sX, // set the x origin
				y + 0
			);
			ctx.drawImage(this.img, 0, ((iIndex || 0) % this.indices) * this.sizeY, cropX || this.sizeX, cropY || this.sizeY, 0, 0, sX, sY);
			ctx.restore(); // restore the state as it was when this function was called
		} else {
			ctx.drawImage(this.img, 0, ((iIndex || 0) % this.indices) * this.sizeY, cropX || this.sizeX, cropY || this.sizeY, x, y, sX, sY);
		}
	}
}

class CompositeSprite {
	constructor(sprites, sizeX, sizeY, indices) {
		this.sprites = sprites;
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.indices = indices;
	}

	draw(ctx, x, y, sX, sY, options = {}) {
		this.sprites.forEach((sprite) => sprite.draw(ctx, x, y, sX, sY, options));
	}
}

class NumberText {
	constructor(fontPath, sizeX, sizeY) {
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.img = new Image();
		this.img.src = fontPath;
	}

	toN(c) {
		if (c == "0" || Number(c)) {
			return Number(c);
		}
		if (c.charCodeAt(0) >= "A".charCodeAt(0)) {
			return 16 + (c.charCodeAt(0) - "A".charCodeAt(0));
		}
		switch (c) {
			case "+":
				return 10;
			case "-":
				return 11;
			case "%":
				return 12;
			case "/":
				return 13;
			case "*":
				return 14;
			default:
				return 15;
		}
	}

	draw(ctx, x, y, sX, sY, options = {}) {
		const { iIndex, text } = options;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === " ") {
				continue;
			}
			ctx.drawImage(this.img, this.sizeX * this.toN(text[i]), iIndex * this.sizeY, this.sizeX, this.sizeY, x + i * sX, y, sX, sY);
		}
	}
}

class Font {
	constructor(fontPath, sizeX, sizeY) {
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.img = new Image();
		this.img.src = fontPath;
	}

	draw(ctx, x, y, sX, sY, options = {}) {
		const { iIndex, text } = options;
		for (let i = 0; i < text.length; i++) {
			ctx.drawImage(this.img, this.sizeX * text.charCodeAt(i), iIndex * this.sizeY, this.sizeX, this.sizeY, x + i * sX, y, sX, sY);
		}
	}
}

class AnimationEngine {
	constructor(data, tickTime, fps, canvas, ctx, callback) {
		this.data = data;
		this.tickTime = tickTime;
		this.fps = fps;
		this.canvas = canvas;
		this.ctx = ctx;
		this.callback = callback;
		this.iterator = 0;

		this.initialize();
	}

	tickToFrame(tick) {
		return Math.floor((tick * this.fps) / this.tickTime);
	}

	initialize() {
		const { ticks, actions } = this.data;
		let parsedActions = [];
		for (let i = 0; i < this.tickToFrame(ticks); i++) {
			parsedActions.push([]);
		}
		this.tracker = {};
		actions.forEach((action) => {
			switch (action.type) {
				case ATYPES.INITIALIZE_ENTITY: {
					const { tick, id, sprite, alpha, posX, posY, sizeX, sizeY, rot, zIndex, iIndex, play, text, mirror } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.INITIALIZE_ENTITY,
						id: id,
						sprite: sprite,
						alpha: alpha || 0,
						posX: posX,
						posY: posY,
						sizeX: sizeX,
						sizeY: sizeY,
						rot: rot || 0,
						zIndex: zIndex || 0,
						iIndex: iIndex || 0,
						play: play || false,
						text: text,
						mirror: mirror || false,
					});
					this.tracker[id] = {
						display: false,
					};
					break;
				}
				case ATYPES.REMOVE_ENTITY: {
					const { tick, id } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.REMOVE_ENTITY,
						id: id,
					});
					break;
				}
				case ATYPES.PLAY_ANIMATION: {
					const { tick, id } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.PLAY_ANIMATION,
						id: id,
					});
					break;
				}
				case ATYPES.PAUSE_ANIMATION: {
					const { tick, id } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.PAUSE_ANIMATION,
						id: id,
					});
					break;
				}
				case ATYPES.SET_FRAME: {
					const { tick, id, iIndex } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_FRAME,
						id: id,
						iIndex: iIndex,
					});
					break;
				}
				case ATYPES.SET_SPRITE: {
					const { tick, id, sprite, play, iIndex, text, mirror } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_SPRITE,
						id: id,
						sprite: sprite,
						play: play || false,
						iIndex: iIndex || 0,
						text: text,
						mirror: mirror,
					});
					break;
				}
				case ATYPES.SET_POSITION_X: {
					const { tick, id, posX } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_POSITION_X,
						id: id,
						posX: posX,
					});
					break;
				}
				case ATYPES.CHANGE_POSITION_X: {
					const { startTick, endTick, id, ease, posX } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_POSITION_X,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_POSITION_X,
						id: id,
						posX: posX,
					});
					break;
				}
				case ATYPES.SET_POSITION_Y: {
					const { tick, id, posY } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_POSITION_Y,
						id: id,
						posY: posY,
					});
					break;
				}
				case ATYPES.CHANGE_POSITION_Y: {
					const { startTick, endTick, id, ease, posY } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_POSITION_Y,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_POSITION_Y,
						id: id,
						posY: posY,
					});
					break;
				}
				case ATYPES.SET_SIZE_X: {
					const { tick, id, sizeX } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_SIZE_X,
						id: id,
						sizeX: sizeX,
					});
					break;
				}
				case ATYPES.CHANGE_SIZE_X: {
					const { startTick, endTick, id, ease, sizeX } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_SIZE_X,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_SIZE_X,
						id: id,
						sizeX: sizeX,
					});
					break;
				}
				case ATYPES.SET_SIZE_Y: {
					const { tick, id, sizeY } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_SIZE_Y,
						id: id,
						sizeY: sizeY,
					});
					break;
				}
				case ATYPES.CHANGE_SIZE_Y: {
					const { startTick, endTick, id, ease, sizeY } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_SIZE_Y,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_SIZE_Y,
						id: id,
						sizeY: sizeY,
					});
					break;
				}
				case ATYPES.SET_OPACITY: {
					const { tick, id, alpha } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_OPACITY,
						id: id,
						alpha: alpha,
					});
					break;
				}
				case ATYPES.CHANGE_OPACITY: {
					const { startTick, endTick, id, ease, alpha } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_OPACITY,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_OPACITY,
						id: id,
						alpha: alpha,
					});
					break;
				}
				case ATYPES.SET_ROTATION: {
					const { tick, id, rot } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.SET_ROTATION,
						id: id,
						rot: rot,
					});
					break;
				}
				case ATYPES.CHANGE_ROTATION: {
					const { startTick, endTick, id, ease, rot } = action;
					parsedActions[this.tickToFrame(startTick)].push({
						type: ATYPES.START_CHANGE_ROTATION,
						id: id,
						ease: ease,
					});
					parsedActions[this.tickToFrame(endTick)].push({
						type: ATYPES.END_CHANGE_ROTATION,
						id: id,
						rot: rot,
					});
					break;
				}
				case ATYPES.PLAY_SOUND: {
					const { tick, volume, audio } = action;
					parsedActions[this.tickToFrame(tick)].push({
						type: ATYPES.PLAY_SOUND,
						volume: volume,
						audio: audio,
					});
					break;
				}
			}
		});
		this.internalActions = [];
		for (let i = 0; i < this.tickToFrame(ticks); i++) {
			this.internalActions.push([]);
		}
		for (let i = 0; i < parsedActions.length; i++) {
			parsedActions[i].forEach((action) => {
				switch (action.type) {
					case ATYPES.START_CHANGE_POSITION_X: {
						// find start position
						let startX = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.posX !== undefined);
							if (relAction) {
								startX = relAction.posX;
								break;
							}
						}
						// find end position
						let endX = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_POSITION_X);
							if (relAction) {
								endX = relAction.posX;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newX = action.ease(startX, endX, j - i, tweenLength);
							this.internalActions[j].push({
								type: ATYPES.SET_POSITION_X,
								id: action.id,
								posX: newX,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_POSITION_X: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_POSITION_X,
						});
						break;
					}
					case ATYPES.START_CHANGE_POSITION_Y: {
						// find start position
						let startY = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.posY !== undefined);
							if (relAction) {
								startY = relAction.posY;
								break;
							}
						}
						// find end position
						let endY = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_POSITION_Y);
							if (relAction) {
								endY = relAction.posY;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newY = action.ease(startY, endY, j - i, tweenLength);
							this.internalActions[j].push({
								type: ATYPES.SET_POSITION_Y,
								id: action.id,
								posY: newY,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_POSITION_Y: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_POSITION_Y,
						});
						break;
					}
					case ATYPES.START_CHANGE_SIZE_X: {
						// find start alpha
						let startSizeX = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.sizeX !== undefined);
							if (relAction) {
								startSizeX = relAction.sizeX;
								break;
							}
						}
						// find end position
						let endSizeX = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_SIZE_X);
							if (relAction) {
								endSizeX = relAction.sizeX;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newSizeX = action.ease(startSizeX, endSizeX, j - i, tweenLength);
							this.internalActions[j].push({
								type: ATYPES.SET_SIZE_X,
								id: action.id,
								sizeX: newSizeX,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_SIZE_X: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_SIZE_X,
						});
						break;
					}
					case ATYPES.START_CHANGE_SIZE_Y: {
						// find start alpha
						let startSizeY = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.sizeY !== undefined);
							if (relAction) {
								startSizeY = relAction.sizeY;
								break;
							}
						}
						// find end position
						let endSizeY = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_SIZE_Y);
							if (relAction) {
								endSizeY = relAction.sizeY;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newSizeY = action.ease(startSizeY, endSizeY, j - i, tweenLength);
							this.internalActions[j].push({
								type: ATYPES.SET_SIZE_Y,
								id: action.id,
								sizeY: newSizeY,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_SIZE_Y: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_SIZE_Y,
						});
						break;
					}
					case ATYPES.START_CHANGE_OPACITY: {
						// find start alpha
						let startAlpha = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.alpha !== undefined);
							if (relAction) {
								startAlpha = relAction.alpha;
								break;
							}
						}
						// find end position
						let endAlpha = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_OPACITY);
							if (relAction) {
								endAlpha = relAction.alpha;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newAlpha = action.ease(startAlpha, endAlpha, j - i, tweenLength);
							this.internalActions[j].push({
								type: ATYPES.SET_OPACITY,
								id: action.id,
								alpha: newAlpha,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_OPACITY: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_OPACITY,
						});
						break;
					}
					case ATYPES.START_CHANGE_ROTATION: {
						// find start rot
						let startRot = undefined;
						for (let j = i; j >= 0; j--) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.rot !== undefined);
							if (relAction) {
								startRot = relAction.rot;
								break;
							}
						}
						// find end rot
						let endRot = undefined;
						let endFrame = undefined;
						for (let j = i + 1; j < parsedActions.length; j++) {
							const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.type === ATYPES.END_CHANGE_ROTATION);
							if (relAction) {
								endRot = relAction.rot;
								endFrame = j;
								break;
							}
						}
						// calculate tween
						const tweenLength = endFrame - i;
						for (let j = i; j < endFrame; j++) {
							const newRot = action.ease(startRot, endRot, j - i, tweenLength) % 360;
							this.internalActions[j].push({
								type: ATYPES.SET_ROTATION,
								id: action.id,
								rot: newRot,
							});
						}
						break;
					}
					case ATYPES.END_CHANGE_ROTATION: {
						this.internalActions[i].push({
							...action,
							type: ATYPES.SET_ROTATION,
						});
						break;
					}
					default:
						if (action.play || action.type === ATYPES.PLAY_ANIMATION) {
							let startIndex = undefined;
							for (let j = i; j >= 0; j--) {
								const relAction = parsedActions[j].find((action2) => action2.id === action.id && action2.iIndex !== undefined);
								if (relAction) {
									startIndex = relAction.iIndex;
									break;
								}
							}
							let c = 1;
							let k = 0;
							for (let j = i; j < parsedActions.length; j++) {
								let flag = false;
								parsedActions[j].forEach((parsedAction) => {
									if ((parsedAction.play === false || parsedAction.type === ATYPES.PAUSE_ANIMATION) && parsedAction.id === action.id) {
										flag = true;
									}
								});
								if (flag) {
									break;
								} else if (j > i && k % this.tickToFrame(1) === 0) {
									this.internalActions[j].push({
										type: ATYPES.SET_FRAME,
										id: action.id,
										iIndex: startIndex + c,
									});
									c++;
								}
								k++;
							}
						}
						if (action.type !== ATYPES.PLAY_ANIMATION && action.type !== ATYPES.PAUSE_ANIMATION) {
							this.internalActions[i].push(action);
						}
				}
			});
		}
	}

	doTick() {
		this.internalActions[this.iterator].forEach((action) => {
			switch (action.type) {
				case ATYPES.INITIALIZE_ENTITY: {
					const { id, sprite, alpha, posX, posY, sizeX, sizeY, rot, zIndex, iIndex, play, text, mirror } = action;
					this.tracker[id] = {
						...this.tracker[id],
						display: true,
						sprite: sprite,
						alpha: alpha,
						posX: posX,
						posY: posY,
						sizeX: sizeX,
						sizeY: sizeY,
						rot: rot,
						zIndex: zIndex,
						iIndex: iIndex,
						play: play,
						text: text,
						mirror: mirror,
					};
					break;
				}
				case ATYPES.REMOVE_ENTITY: {
					const { id } = action;
					this.tracker[id] = {
						...this.tracker[id],
						display: false,
					};
					break;
				}
				case ATYPES.SET_SPRITE: {
					const { id, sprite, play, iIndex, text, mirror } = action;
					this.tracker[id] = {
						...this.tracker[id],
						sprite: sprite,
						play: play || false,
						iIndex: iIndex,
						text: text,
						mirror: mirror || false,
					};
					break;
				}
				case ATYPES.SET_POSITION_X: {
					const { id, posX } = action;
					this.tracker[id] = {
						...this.tracker[id],
						posX: posX,
					};
					break;
				}
				case ATYPES.SET_POSITION_Y: {
					const { id, posY } = action;
					this.tracker[id] = {
						...this.tracker[id],
						posY: posY,
					};
					break;
				}
				case ATYPES.SET_SIZE_X: {
					const { id, sizeX } = action;
					this.tracker[id] = {
						...this.tracker[id],
						sizeX: sizeX,
					};
					break;
				}
				case ATYPES.SET_SIZE_Y: {
					const { id, sizeY } = action;
					this.tracker[id] = {
						...this.tracker[id],
						sizeY: sizeY,
					};
					break;
				}
				case ATYPES.SET_OPACITY: {
					const { id, alpha } = action;
					this.tracker[id] = {
						...this.tracker[id],
						alpha: alpha,
					};
					break;
				}
				case ATYPES.SET_ROTATION: {
					const { id, rot } = action;
					this.tracker[id] = {
						...this.tracker[id],
						rot: rot,
					};
					break;
				}
				case ATYPES.SET_FRAME: {
					const { id, iIndex } = action;
					this.tracker[id] = {
						...this.tracker[id],
						iIndex: iIndex,
					};
					break;
				}
				case ATYPES.PLAY_SOUND: {
					const { audio, volume } = action;
					audio.volume = volume;
					audio.play();
					break;
				}
			}
		});
	}

	runFrame(timeMs) {
		if (!this.startTime || timeMs - this.startTime >= 1000 / this.fps) {
			this.doTick();
			this.iterator++;
			if (fastForward) {
				if (this.iterator < this.internalActions.length) {
					this.doTick();
					this.iterator++;
				}
			}
			this.startTime = timeMs;
		}
		Object.entries(this.tracker)
			.toSorted((a, b) => a[1].zIndex - b[1].zIndex)
			.forEach(([_, { display, sprite, alpha, posX, posY, sizeX, sizeY, rot, iIndex, text, mirror }]) => {
				if (!display) {
					return;
				}
				this.ctx.globalAlpha = alpha;
				if (rot !== 0) {
					this.ctx.save();
					this.ctx.translate(posX + sizeX / 2, posY + sizeY / 2);
					this.ctx.rotate((rot * Math.PI) / 180);
					sprite.draw(this.ctx, -sizeX / 2, -sizeY / 2, sizeX, sizeY, {
						iIndex: iIndex % sprite.indices,
						mirror,
						text,
					});
					this.ctx.restore();
				} else {
					sprite.draw(this.ctx, posX, posY, sizeX, sizeY, { iIndex: sprite.indices ? iIndex % sprite.indices : iIndex, mirror, text });
				}
			});
		if (this.iterator >= this.internalActions.length) {
			this.callback();
		}
	}
}
