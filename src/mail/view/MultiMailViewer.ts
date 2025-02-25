import m, { Component, Vnode } from "mithril"
import { assertMainOrNode, isApp } from "../../api/common/Env"
import ColumnEmptyMessageBox from "../../gui/base/ColumnEmptyMessageBox"
import { lang } from "../../misc/LanguageViewModel"
import { Icons } from "../../gui/base/icons/Icons"
import { getFolderIcon, getIndentedFolderNameForDropdown, getMoveTargetFolderSystems, markMails } from "../model/MailUtils"
import { FeatureType } from "../../api/common/TutanotaConstants"
import { BootIcons } from "../../gui/base/icons/BootIcons"
import { theme } from "../../gui/theme"
import type { Mail } from "../../api/entities/tutanota/TypeRefs.js"
import { locator } from "../../api/main/MainLocator"
import { moveMails, promptAndDeleteMails } from "./MailGuiUtils"
import { attachDropdown, DropdownButtonAttrs } from "../../gui/base/Dropdown.js"
import { exportMails } from "../export/Exporter"
import { showProgressDialog } from "../../gui/dialogs/ProgressDialog"
import { IconButtonAttrs } from "../../gui/base/IconButton.js"
import { MailViewerToolbar } from "./MailViewerToolbar.js"
import { Button, ButtonType } from "../../gui/base/Button.js"
import { progressIcon } from "../../gui/base/Icon.js"

assertMainOrNode()

export type MultiMailViewerAttrs = {
	selectedEntities: Array<Mail>
	selectNone: () => unknown
	loadingAll: "can_load" | "loading" | "loaded"
	loadAll: () => unknown
	stopLoadAll: () => unknown
}

/**
 * The MailViewer displays the action buttons for multiple selected emails.
 */
export class MultiMailViewer implements Component<MultiMailViewerAttrs> {
	view({ attrs }: Vnode<MultiMailViewerAttrs>) {
		const { selectedEntities, selectNone, loadAll, loadingAll, stopLoadAll } = attrs
		return [
			m(
				".flex.col.fill-absolute",
				m(MailViewerToolbar, {
					mailModel: locator.mailModel,
					mails: selectedEntities,
					selectNone: selectNone,
					readAction: () => markMails(locator.entityClient, selectedEntities, false),
					unreadAction: () => markMails(locator.entityClient, selectedEntities, true),
				}),
				m(
					".flex-grow.rel.overflow-hidden",
					m(ColumnEmptyMessageBox, {
						message: () => this.getMailSelectionMessage(selectedEntities),
						icon: BootIcons.Mail,
						color: theme.content_message_bg,
						backgroundColor: theme.navigation_bg,
						bottomContent: this.renderEmptyMessageButtons(attrs),
					}),
				),
			),
		]
	}

	private renderEmptyMessageButtons({ loadingAll, stopLoadAll, selectedEntities, selectNone, loadAll }: MultiMailViewerAttrs) {
		return loadingAll === "loading"
			? m(".flex.items-center", [
					m(Button, {
						label: "cancel_action",
						type: ButtonType.Secondary,
						click: () => {
							stopLoadAll()
						},
					}),
					m(".flex.items-center.plr-button", progressIcon()),
			  ])
			: selectedEntities.length === 0
			? null
			: m(".flex", [
					m(Button, {
						label: "cancel_action",
						type: ButtonType.Secondary,
						click: () => {
							selectNone()
						},
					}),
					loadingAll === "can_load"
						? m(Button, {
								label: "loadAll_action",
								type: ButtonType.Secondary,
								click: () => {
									loadAll()
								},
						  })
						: null,
			  ])
	}

	private getMailSelectionMessage(selectedEntities: Array<Mail>): string {
		let nbrOfSelectedMails = selectedEntities.length

		if (nbrOfSelectedMails === 0) {
			return lang.get("noMail_msg")
		} else if (nbrOfSelectedMails === 1) {
			return lang.get("oneMailSelected_msg")
		} else {
			return lang.get("nbrOfMailsSelected_msg", {
				"{1}": nbrOfSelectedMails,
			})
		}
	}
}

/**
 *
 * @param selectedEntities the list of entities (mails) the produced action button attrs apply to
 * @param selectNone a function that can be used to clear the selection
 * @param prependCancel should we have a cancel button that clears the selection
 */
export function getMultiMailViewerActionButtonAttrs(selectedEntities: Array<Mail>, selectNone: () => unknown, prependCancel: boolean): Array<IconButtonAttrs> {
	const actionBarAction = (action: () => unknown) => () => {
		selectNone()
		action()
	}

	const move = [
		attachDropdown({
			mainButtonAttrs: {
				title: "move_action",
				icon: Icons.Folder,
			},
			childAttrs: async () => {
				const moveTargets = await getMoveMailButtonAttrs(selectedEntities, selectNone)
				return moveTargets.length > 0 ? moveTargets : []
			},
		}),
	]

	const cancel: IconButtonAttrs[] = prependCancel
		? [
				{
					title: "cancel_action",
					click: selectNone,
					icon: Icons.Cancel,
				},
		  ]
		: []

	return [
		...cancel,
		{
			title: "delete_action",
			click: () => promptAndDeleteMails(locator.mailModel, selectedEntities, () => selectNone()),
			icon: Icons.Trash,
		},
		...move,
		attachDropdown({
			mainButtonAttrs: {
				title: "more_label",
				icon: Icons.More,
			},
			childAttrs: () => [
				{
					label: "markUnread_action",
					click: actionBarAction(() => markMails(locator.entityClient, selectedEntities, true)),
					icon: Icons.NoEye,
				},
				{
					label: "markRead_action",
					click: actionBarAction(() => markMails(locator.entityClient, selectedEntities, false)),
					icon: Icons.Eye,
				},
				!isApp() && !locator.logins.isEnabled(FeatureType.DisableMailExport)
					? {
							label: "export_action",
							click: actionBarAction(() =>
								showProgressDialog("pleaseWait_msg", exportMails(selectedEntities, locator.entityClient, locator.fileController)),
							),
							icon: Icons.Export,
					  }
					: null,
			],
		}),
	]
}

/**
 * Generate button attrs that will move the selected mails to respective folders on clicking the button
 */
async function getMoveMailButtonAttrs(selectedEntities: Mail[], selectNone: () => unknown): Promise<Array<DropdownButtonAttrs>> {
	const actionBarAction = (action: () => unknown) => () => {
		selectNone()
		action()
	}
	const moveTargets = await getMoveTargetFolderSystems(locator.mailModel, selectedEntities)
	return moveTargets.map((folderInfo) => {
		return {
			label: () => getIndentedFolderNameForDropdown(folderInfo),
			click: actionBarAction(() =>
				moveMails({
					mailModel: locator.mailModel,
					mails: selectedEntities,
					targetMailFolder: folderInfo.folder,
				}),
			),
			icon: getFolderIcon(folderInfo.folder),
		}
	})
}
