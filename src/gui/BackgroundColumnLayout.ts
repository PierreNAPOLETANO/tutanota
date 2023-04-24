import m, { Child, Children, Component, Vnode } from "mithril"
import { styles } from "./styles.js"
import { TopAppBar } from "./TopAppBar.js"
import { IconButton } from "./base/IconButton.js"
import { BootIcons } from "./base/icons/BootIcons.js"
import { ViewSlider } from "./nav/ViewSlider.js"

// FIXME extract most of it into "mobile header"

export interface BackgroundColumnLayoutAttrs {
	headerAttrs: () => {}
	viewSlider: ViewSlider
	desktopToolbar: () => Children
	columnType: "first" | "other"
	columnLayout: Child
	mobileActions: () => Children
	mobileRightmostButton: () => Children
}

export class BackgroundColumnLayout implements Component<BackgroundColumnLayoutAttrs> {
	view({ attrs }: Vnode<BackgroundColumnLayoutAttrs>): Children {
		return m(".list-column.flex.col.fill-absolute", [
			styles.isUsingBottomNavigation()
				? m(TopAppBar, {
						left:
							attrs.columnType === "first"
								? m(IconButton, {
										// FIXME
										title: () => "Menu",
										icon: BootIcons.MoreVertical,
										click: () => {
											attrs.viewSlider.focusPreviousColumn()
										},
								  })
								: styles.isSingleColumnLayout()
								? m(IconButton, {
										title: "back_action",
										icon: BootIcons.Back,
										click: () => {
											attrs.viewSlider.focusPreviousColumn()
										},
								  })
								: null,
						// FIXME
						center: attrs.columnType === "first" || styles.isSingleColumnLayout() ? "Some text" : null,
						// FIXME
						right:
							(styles.isSingleColumnLayout() && attrs.columnType === "first") || (!styles.isSingleColumnLayout() && attrs.columnType === "other")
								? attrs.mobileRightmostButton()
								: null,
				  })
				: attrs.desktopToolbar(),
			m(".flex-grow.rel", attrs.columnLayout),
		])
	}
}
