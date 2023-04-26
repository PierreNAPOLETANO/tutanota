import { Mail } from "../../api/entities/tutanota/TypeRefs.js"
import m, { Children, Vnode } from "mithril"
import { IconButton } from "../../gui/base/IconButton.js"
import { Icons } from "../../gui/base/icons/Icons.js"
import { promptAndDeleteMails, showMoveMailsDropdown } from "./MailGuiUtils.js"
import { locator } from "../../api/main/MainLocator.js"
import { DROPDOWN_MARGIN } from "../../gui/base/Dropdown.js"

export interface MobileMultiselectionActionToolbarAttrs {
	mails: readonly Mail[]
	selectNone: () => unknown
}

export class MobileMultiselectionActionToolbar {
	private dom: HTMLElement | null = null

	view({ attrs }: Vnode<MobileMultiselectionActionToolbarAttrs>): Children {
		const { mails, selectNone } = attrs
		return m(
			".bottom-nav.bottom-action-bar.flex.items-center.plr-l.justify-between",
			{
				oncreate: ({ dom }) => (this.dom = dom as HTMLElement),
			},
			[
				m(IconButton, {
					icon: Icons.Trash,
					title: "delete_action",
					click: () => promptAndDeleteMails(locator.mailModel, mails, selectNone),
				}),
				locator.mailModel.isMovingMailsAllowed()
					? m(IconButton, {
							icon: Icons.Folder,
							title: "move_action",
							click: (e, dom) => {
								const referenceDom = this.dom ?? dom
								showMoveMailsDropdown(locator.mailModel, referenceDom.getBoundingClientRect(), mails, {
									onSelected: () => selectNone,
									width: referenceDom.offsetWidth - DROPDOWN_MARGIN * 2,
								})
							},
					  })
					: null,
				m(IconButton, {
					icon: Icons.Eye,
					title: "markRead_action",
					click: () => {
						locator.mailModel.markMails(mails, false)
						selectNone()
					},
				}),
				m(IconButton, {
					icon: Icons.NoEye,
					title: "markUnread_action",
					click: () => {
						locator.mailModel.markMails(mails, true)
						selectNone()
					},
				}),
			],
		)
	}
}
