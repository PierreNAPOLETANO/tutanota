import m, { Child, Children, Component, Vnode } from "mithril"
import { styles } from "./styles.js"
import { TopAppBar } from "./TopAppBar.js"
import { IconButton } from "./base/IconButton.js"
import { BootIcons } from "./base/icons/BootIcons.js"
import { ViewSlider } from "./nav/ViewSlider.js"
import { OfflineIndicatorMobile } from "./base/OfflineIndicator.js"
import { OfflineIndicatorViewModel } from "./base/OfflineIndicatorViewModel.js"
import { NBSP } from "@tutao/tutanota-utils"
import { ProgressBar } from "./base/ProgressBar.js"

export interface MobileHeaderAttrs {
	viewSlider: ViewSlider
	columnType: "first" | "other"
	mobileActions: Children
	mobileRightmostButton: () => Children
	title?: string
	offlineIndicatorModel: OfflineIndicatorViewModel
}

export class MobileHeader implements Component<MobileHeaderAttrs> {
	view({ attrs }: Vnode<MobileHeaderAttrs>): Children {
		return m(TopAppBar, {
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
			center:
				attrs.columnType === "first" || styles.isSingleColumnLayout()
					? m(".flex.col.items-start", [
							m(".font-weight-600", attrs.title ?? NBSP),
							m(OfflineIndicatorMobile, attrs.offlineIndicatorModel.getCurrentAttrs()),
					  ])
					: null,
			// FIXME
			right: [attrs.mobileActions, styles.isSingleColumnLayout() || attrs.columnType === "other" ? attrs.mobileRightmostButton() : null],
			injections: m(ProgressBar, { progress: attrs.offlineIndicatorModel.getProgress() }),
		})
	}
}

export interface BackgroundColumnLayoutAttrs {
	mobileHeader: () => Children
	desktopToolbar: () => Children
	columnLayout: Child
	backgroundColor?: string
}

export class BackgroundColumnLayout implements Component<BackgroundColumnLayoutAttrs> {
	view({ attrs }: Vnode<BackgroundColumnLayoutAttrs>): Children {
		return m(
			".list-column.flex.col.fill-absolute",
			{
				style: {
					backgroundColor: attrs.backgroundColor,
				},
			},
			[styles.isUsingBottomNavigation() ? attrs.mobileHeader() : attrs.desktopToolbar(), m(".flex-grow.rel", attrs.columnLayout)],
		)
	}
}
