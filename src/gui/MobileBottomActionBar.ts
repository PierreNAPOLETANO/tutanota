import { pureComponent } from "./base/PureComponent.js"
import m from "mithril"

export const MobileBottomActionBar = pureComponent((_, children) => {
	return m(".bottom-nav.flex.items-center.plr-l.justify-between", children)
})
