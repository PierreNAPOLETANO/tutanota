import Hammer from "hammerjs"

enum MoveDirection {
	X,
	Y,
}

type CoordinatePair = {
	x: number
	y: number
}

export class PinchZoomV2 {
	private evCache: PointerEvent[] = []
	private touchCount = 0
	// pinching
	private prevDiff = -1
	private maxScale = -1
	private minScale = -1
	private currentScale = -1
	private xMiddle = -1
	private yMiddle = -1
	private pinchTouchIDs: Set<number> = new Set<number>()
	private firstMultiple: { pointer1: CoordinatePair; pointer2: CoordinatePair } = { pointer1: { x: 0, y: 0 }, pointer2: { x: 0, y: 0 } }
	private previousDelta: CoordinatePair = { x: 0, y: 0 }
	private offsetDelta: CoordinatePair = { x: 0, y: 0 }
	private previousInput: { delta: CoordinatePair; event: string } = { delta: { x: 0, y: 0 }, event: "end" }

	// dragging
	private dragTouchIDs: Set<number> = new Set<number>()
	private offsetX = -1
	private offsetY = -1
	private startX = -1
	private startY = -1
	private currentX = -1
	private currentY = -1
	private lastOffsetX = 0 //what should be the default that can never be reached be?
	private lastOffsetY = 0
	private currentTransformOrigin: CoordinatePair = { x: 0, y: 0 }
	private lastTransformOrigin: CoordinatePair = { x: 0, y: 0 }
	private transformOriginNotInitialized = true

	private topScrollValue: number = 0

	constructor(private readonly root: HTMLElement, private readonly parent: HTMLElement) {
		console.log("new Pinch to zoom----------------")
		// this.setInitialScale(1)
		this.root.ontouchend = (e) => {
			this.removeTouches(e)
			// console.log("touch end")
		}
		this.root.ontouchmove = (e) => {
			this.touchmove_handler(e)
			// console.log("touch move")
		}
		this.root.ontouchcancel = (e) => {
			this.removeTouches(e)
			// console.log("touch cancel")
		}

		////// new
		const outerThis = this
		let hammer = new Hammer(this.root, {})

		hammer.get("pinch").set({ enable: true })
		hammer.get("pan").set({ threshold: 0 })

		// @ts-ignore
		// hammer.on("doubletap", function (e) { //FIXME
		// 	let scaleFactor = 1
		// 	if (outerThis.current.zooming === false) {
		// 		outerThis.current.zooming = true
		// 	} else {
		// 		outerThis.current.zooming = false
		// 		scaleFactor = -scaleFactor
		// 	}
		//
		// 	root.style.transition = "0.3s"
		// 	setTimeout(function () {
		// 		root.style.transition = "none"
		// 	}, 300)
		//
		// 	let zoomOrigin = outerThis.getRelativePosition(root, { x: e.center.x, y: e.center.y }, outerThis.originalSize, outerThis.current.z)
		// 	let d = outerThis.scaleFrom(zoomOrigin, outerThis.current.z, outerThis.current.z + scaleFactor)
		// 	outerThis.setCurrentSafePosition(d.x, d.y, d.z)
		//
		// 	outerThis.last.x = outerThis.current.x
		// 	outerThis.last.y = outerThis.current.y
		// 	outerThis.last.z = outerThis.current.z
		//
		// 	outerThis.update()
		// })

		// @ts-ignore
		// hammer.on("pan", function (e) {
		// 	if (outerThis.current.z <= 1) {
		// 		return // use browser behavior //FIXME propagation
		// 	}
		// 	if (outerThis.lastEvent !== "pan") {
		// 		outerThis.fixDeltaIssue = {
		// 			x: e.deltaX,
		// 			y: e.deltaY,
		// 		}
		// 	}
		//
		// 	outerThis.setCurrentSafePosition(
		// 		outerThis.last.x + e.deltaX - outerThis.fixDeltaIssue.x,
		// 		outerThis.last.y + e.deltaY - outerThis.fixDeltaIssue.y,
		// 		outerThis.current.z,
		// 	)
		// 	outerThis.lastEvent = "pan"
		// 	outerThis.update()
		// })

		// @ts-ignore
		// hammer.on("pinch", function (e) {
		// 	let d = outerThis.scaleFrom(outerThis.pinchZoomOrigin, outerThis.last.z, outerThis.last.z * e.scale)
		// 	outerThis.setCurrentSafePosition(d.x + outerThis.last.x + e.deltaX, d.y + outerThis.last.y + e.deltaY, d.z + outerThis.last.z)
		// 	outerThis.lastEvent = "pinch"
		// 	outerThis.update()
		// })

		// @ts-ignore
		// hammer.on("pinchstart", function (e) {
		// 	outerThis.pinchStart.x = e.center.x
		// 	outerThis.pinchStart.y = e.center.y
		// 	outerThis.pinchZoomOrigin = outerThis.getRelativePosition(
		// 		outerThis.root,
		// 		{
		// 			x: outerThis.pinchStart.x,
		// 			y: outerThis.pinchStart.y,
		// 		},
		// 		outerThis.originalSize,
		// 		outerThis.current.z,
		// 	)
		// 	outerThis.lastEvent = "pinchstart"
		// })

		// // @ts-ignore
		// hammer.on("panend", function (e) {
		// 	outerThis.last.x = outerThis.current.x
		// 	outerThis.last.y = outerThis.current.y
		// 	outerThis.lastEvent = "panend"
		// })

		// // @ts-ignore
		// hammer.on("pinchend", function (e) {
		// 	outerThis.last.x = outerThis.current.x
		// 	outerThis.last.y = outerThis.current.y
		// 	outerThis.last.z = outerThis.current.z
		// 	outerThis.lastEvent = "pinchend"
		// })
	}

	private touchmove_handler(ev: TouchEvent) {
		// console.log(ev)
		switch (ev.touches.length) {
			case 1:
				this.dragHandling(ev)
				break
			case 2:
				this.pinchHandling(ev)
				break
			default:
				break
		}
	}

	private calculateDelta(startOfInput: boolean, ...points: CoordinatePair[]): CoordinatePair {
		//FIXME
		// FIXME return value is semantically not quite accurate
		const center = this.centerOfPoints(...points)
		let offset = this.offsetDelta || {} //FIXME
		let prevDelta = this.previousDelta || {}
		let prevInput = this.previousInput || {}

		if (startOfInput || prevInput.event === "end") {
			prevDelta = this.previousDelta = {
				x: prevInput.delta.x || 0,
				y: prevInput.delta.y || 0,
			}

			offset = this.offsetDelta = {
				x: center.x,
				y: center.y,
			}
		}

		const deltaX = prevDelta.x + (center.x - offset.x)
		const deltaY = prevDelta.y + (center.y - offset.y)
		return { x: deltaX, y: deltaY }
	}

	private pointDistance(point1: CoordinatePair, point2: CoordinatePair): number {
		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
	}

	private centerOfPoints(...points: CoordinatePair[]): CoordinatePair {
		let x = 0
		let y = 0
		for (let point of points) {
			x += point.x
			y += point.y
		}
		return { x: Math.round(x / points.length), y: Math.round(y / points.length) }
	}

	private startPinchSession(ev: TouchEvent) {
		this.firstMultiple = {
			pointer1: { x: ev.touches[0].clientX, y: ev.touches[0].clientY },
			pointer2: { x: ev.touches[1].clientX, y: ev.touches[1].clientY },
		}

		const pinchCenter = this.centerOfPoints({ x: ev.touches[0].clientX, y: ev.touches[0].clientY }, { x: ev.touches[1].clientX, y: ev.touches[1].clientY })
		this.pinchStart.x = pinchCenter.x
		this.pinchStart.y = pinchCenter.y
		this.pinchZoomOrigin = this.getRelativePosition(
			this.root,
			{
				x: this.pinchStart.x,
				y: this.pinchStart.y,
			},
			this.originalSize,
			this.current.z,
		)
		this.lastEvent = "pinchstart"
	}

	private pinchHandling(ev: TouchEvent) {
		// new pinch gesture?
		let delta = { x: 0, y: 0 }
		if (!(this.pinchTouchIDs.has(ev.touches[0].identifier) && this.pinchTouchIDs.has(ev.touches[1].identifier))) {
			this.startPinchSession(ev)
			delta = this.calculateDelta(true, { x: ev.touches[0].clientX, y: ev.touches[0].clientY }, { x: ev.touches[1].clientX, y: ev.touches[1].clientY })
			this.previousInput = { delta: { x: delta.x, y: delta.y }, event: "start" }
		} else {
			delta = this.calculateDelta(false, { x: ev.touches[0].clientX, y: ev.touches[0].clientY }, { x: ev.touches[1].clientX, y: ev.touches[1].clientY })
			this.previousInput = { delta: { x: delta.x, y: delta.y }, event: "move" }
		}

		//update current touches
		this.pinchTouchIDs = new Set<number>([ev.touches[0].identifier, ev.touches[1].identifier])

		// Calculate the scaling (1 = no scaling, 0 = maximum pinched in, >1 pinching out
		const scaling =
			this.pointDistance(
				{ x: ev.touches[0].clientX, y: ev.touches[0].clientY },
				{
					x: ev.touches[1].clientX,
					y: ev.touches[1].clientY,
				},
			) / this.pointDistance(this.firstMultiple.pointer1, this.firstMultiple.pointer2)

		let d = this.scaleFrom(this.pinchZoomOrigin, this.last.z, this.last.z * scaling)
		this.setCurrentSafePosition(d.x + this.last.x + delta.x, d.y + this.last.y + delta.y, d.z + this.last.z) //FIXME
		this.lastEvent = "pinch"
		this.update()
	}

	private dragHandling(ev: TouchEvent) {
		//FIXME check for new touch
		if (this.current.z > 1) {
			ev.stopPropagation() // maybe not if is not movable FIXME

			let delta = { x: 0, y: 0 }
			if (!this.dragTouchIDs.has(ev.touches[0].identifier)) {
				// new dragging
				this.dragTouchIDs = new Set<number>([ev.touches[0].identifier])
				delta = this.calculateDelta(true, { x: ev.touches[0].clientX, y: ev.touches[0].clientY }) //FIXME I think delta also needs to be changed if the surrounding is scrolled/ changed
			} else {
				// still same dragging
				delta = this.calculateDelta(false, { x: ev.touches[0].clientX, y: ev.touches[0].clientY })
			}

			if (this.lastEvent !== "pan") {
				this.fixDeltaIssue = {
					x: delta.x,
					y: delta.y,
				}
			}

			this.setCurrentSafePosition(this.last.x + delta.x - this.fixDeltaIssue.x, this.last.y + delta.y - this.fixDeltaIssue.y, this.current.z)
			this.lastEvent = "pan"
			this.update()
		}
	}

	private invalidBorder(): boolean {
		if (
			this.root.style.left > this.parent.style.left ||
			this.root.style.right < this.parent.style.right ||
			this.root.style.top > this.parent.style.top ||
			this.root.style.bottom < this.parent.style.bottom
		) {
			return true
		}
		return false
	}

	/**
	 *
	 * @param scale reset if no values given
	 * @private
	 */
	private saveScale(scale: number = -1) {
		console.log("change scale")
		if (scale === -1) {
			this.currentScale = -1
			this.maxScale = -1
			this.minScale = -1
		} else {
			this.currentScale = scale
			this.minScale = scale //- 0.1 // should further zooming out be possible? //FIXME
			this.maxScale = scale + 1
		}
		console.log("new scale", this.currentScale)
	}

	setInitialScale(scale: number) {
		console.log("initialize scaling", scale)
		if (this.currentScale === -1) {
			this.saveScale(scale)
		}
	}

	private removeTouches(ev: TouchEvent) {
		this.previousInput.event = "end"
		if (ev.touches.length > 0) {
			this.last.x = this.current.x
			this.last.y = this.current.y
			this.last.z = this.current.z
			this.lastEvent = "pinchend"
			this.pinchTouchIDs.clear()
		} else {
			this.last.x = this.current.x
			this.last.y = this.current.y
			this.lastEvent = "panend"
			this.dragTouchIDs.clear()
		}
	}

	//// new

	private pinchZoomOrigin: { x: number; y: number } = { x: 0, y: 0 }
	private fixDeltaIssue: { x: number; y: number } = { x: 0, y: 0 }
	private pinchStart: { x: number; y: number } = { x: 0, y: 0 }
	private lastEvent: string = ""

	private originalSize = {
		width: 200, //FIXME
		height: 300,
	}

	private current = {
		x: 0,
		y: 0,
		z: 1,
		zooming: false,
		width: this.originalSize.width * 1,
		height: this.originalSize.height * 1,
	}

	private last = {
		x: this.current.x,
		y: this.current.y,
		z: this.current.z,
	}

	private getRelativePosition(
		element: HTMLElement,
		point: { x: number; y: number },
		originalSize: { width: number; height: number },
		scale: number,
	): { x: number; y: number } {
		let domCoords = this.getCoords(element)

		let elementX = point.x - domCoords.x
		let elementY = point.y - domCoords.y

		let relativeX = elementX / ((originalSize.width * scale) / 2) - 1
		let relativeY = elementY / ((originalSize.height * scale) / 2) - 1
		return { x: relativeX, y: relativeY }
	}

	private getCoords(elem: HTMLElement) {
		// crossbrowser version
		let box = elem.getBoundingClientRect()

		let body = document.body
		let docEl = document.documentElement

		let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop
		let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft

		let clientTop = docEl.clientTop || body.clientTop || 0
		let clientLeft = docEl.clientLeft || body.clientLeft || 0

		let top = box.top + scrollTop - clientTop
		let left = box.left + scrollLeft - clientLeft
		let bottom = box.bottom + scrollTop - clientTop
		let right = box.right + scrollLeft - clientLeft

		return { x: Math.round(left), y: Math.round(top), x2: Math.round(right), y2: Math.round(bottom) }
	}

	private scaleFrom(zoomOrigin: { x: number; y: number }, currentScale: number, newScale: number) {
		let currentShift = this.getCoordinateShiftDueToScale(this.originalSize, currentScale)
		let newShift = this.getCoordinateShiftDueToScale(this.originalSize, newScale)

		let zoomDistance = newScale - currentScale

		let shift = {
			x: currentShift.x - newShift.x,
			y: currentShift.y - newShift.y,
		}

		let output = {
			x: zoomOrigin.x * shift.x,
			y: zoomOrigin.y * shift.y,
			z: zoomDistance,
		}
		return output
	}

	private getCoordinateShiftDueToScale(size: { width: number; height: number }, scale: number) {
		let newWidth = scale * size.width
		let newHeight = scale * size.height
		let dx = (newWidth - size.width) / 2
		let dy = (newHeight - size.height) / 2
		return {
			x: dx,
			y: dy,
		}
	}

	private update() {
		this.current.height = this.originalSize.height * this.current.z
		this.current.width = this.originalSize.width * this.current.z
		this.root.style.transform = "translate3d(" + this.current.x + "px, " + this.current.y + "px, 0) scale(" + this.current.z + ")"
	}

	/**
	 * top y should not be > initial top y
	 * bottom y should not be < initial bottom y
	 * left x should not be > initial left x
	 * right x should not be < initial right x
	 * @param newX
	 * @param newY
	 * @param newZ
	 * @private
	 */
	private setCurrentSafePosition(newX: number, newY: number, newZ: number) {
		let parentBorders = this.getCoords(this.parent)
		let rootBorders = this.getCoords(this.root)
		if (rootBorders.x + newX < parentBorders.x && rootBorders.x2 + newX > parentBorders.x2) {
			this.current.x = newX
		}
		if (rootBorders.y + newY < parentBorders.y && rootBorders.y2 + newY > parentBorders.y2) {
			this.current.y = newY
		}
		this.current.z = Math.max(1, Math.min(4, newZ)) // don't allow zooming out or zooming in more than 3x
	}
}
