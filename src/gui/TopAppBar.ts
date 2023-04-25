import { pureComponent } from "./base/PureComponent.js"
import m, { Children } from "mithril"

export interface TopAppBarAttrs {
	left?: Children
	center?: Children
	right?: Children
}

export const TopAppBar = pureComponent(({ left, center, right }: TopAppBarAttrs) => {
	return m(".flex.items-center", [left ?? null, m(".flex-grow.flex.items-center", center ?? null), right ?? null])
})

// use cases
// 1. single column, the first column: drawer menu button, title & offline, two actions
// 2. single column, the second column: back button, title & offline, single action
// 3. single column, the first column, multiselect
// 4. two column, the first column: drawer menu button, title & offline, single action
// 5. two column, the second column: many buttons
// 6. two column, the first column, multiselect
// 7. two column, the second column, multiselect
