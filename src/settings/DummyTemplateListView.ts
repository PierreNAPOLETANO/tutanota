import m, { Children, Component, Vnode } from "mithril"
import { ListColumnWrapper } from "../gui/ListColumnWrapper"
import { Button, ButtonType } from "../gui/base/Button.js"
import { theme } from "../gui/theme"
import ColumnEmptyMessageBox from "../gui/base/ColumnEmptyMessageBox"
import { createInitialTemplateListIfAllowed } from "../templates/TemplateGroupUtils"
import { showTemplateEditor } from "./TemplateEditor"

export type DummyTemplateListViewAttrs = void

export class DummyTemplateListView implements Component<DummyTemplateListViewAttrs> {
	view(vnode: Vnode<DummyTemplateListViewAttrs>): Children {
		return m(
			ListColumnWrapper,
			{
				headerContent: m(
					".flex.flex-end.center-vertically.plr-l.list-border-bottom",
					m(
						".mr-negative-s",
						m(Button, {
							label: "addTemplate_label",
							type: ButtonType.Primary,
							click: () => {
								// SettingsView will reroute to the folder for the newly created template list (if there is one)
								createInitialTemplateListIfAllowed().then((groupRoot) => {
									if (groupRoot) {
										showTemplateEditor(null, groupRoot)
									}
								})
							},
						}),
					),
				),
			},
			m(
				".fill-absolute.overflow-hidden",
				m(ColumnEmptyMessageBox, {
					color: theme.list_message_bg,
					message: "noEntries_msg",
				}),
			),
		)
	}
}
