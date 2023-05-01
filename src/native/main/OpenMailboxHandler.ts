import m from "mithril"
import { locator } from "../../api/main/MainLocator"
import { MailFolderType } from "../../api/common/TutanotaConstants.js"
import { assertSystemFolderOfType } from "../../api/common/mail/CommonMailUtils.js"

export async function openMailbox(userId: Id, mailAddress: string, requestedPath: string | null) {
	if (locator.logins.isUserLoggedIn() && locator.logins.getUserController().user._id === userId) {
		if (!requestedPath) {
			const [mailboxDetail] = await locator.mailModel.getMailboxDetails()
			const inbox = assertSystemFolderOfType(mailboxDetail.folders, MailFolderType.INBOX)
			m.route.set("/mail/" + inbox.mails)
		} else {
			m.route.set("/mail" + requestedPath)
		}
	} else {
		const redirectUser = !requestedPath ? `/login?noAutoLogin=false&userId=${userId}&loginWith=${mailAddress}` : `/login?noAutoLogin=false&userId=${userId}&loginWith=${mailAddress}&requestedPath=${encodeURIComponent(requestedPath)}`;
		m.route.set(redirectUser);
	}
}

export function openCalendar(userId: Id) {
	const calendarRoute = (locator.logins.isUserLoggedIn() && locator.logins.getUserController().user._id === userId) ? "/calendar/agenda" : `/login?noAutoLogin=false&userId=${userId}&requestedPath=${encodeURIComponent("/calendar/agenda")}`;
	m.route.set(calendarRoute);
}
