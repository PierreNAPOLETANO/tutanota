import { pureComponent } from "./base/PureComponent.js"
import m from "mithril"
import { px, size } from "./size.js"

export const DesktopListToolbar = pureComponent((__, children) => {
	return m(".flex.pt-xs.pb-xs.items-center", [children])
})

export const DesktopViewerToolbar = pureComponent((__, children) => {
	return m(".flex.pt-xs.pb-xs.plr-m", [
		// Height keeps the toolbar showing for consistency, even if there are no actions
		m(".flex-grow", { style: { height: px(size.button_height) } }),
		children,
	])
})
