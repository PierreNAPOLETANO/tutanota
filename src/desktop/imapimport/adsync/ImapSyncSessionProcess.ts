import { ImapSyncSessionMailbox } from "./ImapSyncSessionMailbox.js"
import { AdSyncEventListener, AdSyncEventType } from "./AdSyncEventListener.js"
import { ImapAccount, ImapMailIds } from "./ImapSyncState.js"
import { ImapMail } from "./imapmail/ImapMail.js"
// @ts-ignore // TODO define types
import { AdSyncDownloadBlockSizeOptimizer } from "./optimizer/AdSyncDownloadBlockSizeOptimizer.js"
import { ImapError } from "./imapmail/ImapError.js"
import { ImapMailbox, ImapMailboxStatus } from "./imapmail/ImapMailbox.js"
import { AdSyncConfig } from "./ImapAdSync.js"
import { AdSyncProcessesOptimizerEventListener } from "./optimizer/processesoptimizer/AdSyncProcessesOptimizer.js"
import { DifferentialUidLoader, UidFetchRequestType } from "./utils/DifferentialUidLoader.js"

const { ImapFlow } = require("imapflow")

export enum SyncSessionProcessState {
	NOT_STARTED,
	STOPPED,
	RUNNING,
	CONNECTION_FAILED_UNKNOWN,
	CONNECTION_FAILED_NO
}

export class ImapSyncSessionProcess {
	processId: number

	private state: SyncSessionProcessState = SyncSessionProcessState.NOT_STARTED
	private adSyncOptimizer: AdSyncDownloadBlockSizeOptimizer
	private adSyncProcessesOptimizerEventListener: AdSyncProcessesOptimizerEventListener
	private adSyncConfig: AdSyncConfig
	private isIncludeMailUpdates: boolean

	constructor(
		processId: number,
		adSyncOptimizer: AdSyncDownloadBlockSizeOptimizer,
		adSyncProcessesOptimizerEventListener: AdSyncProcessesOptimizerEventListener,
		adSyncConfig: AdSyncConfig,
		isIncludeMailUpdates: boolean,
	) {
		this.processId = processId
		this.adSyncOptimizer = adSyncOptimizer
		this.adSyncProcessesOptimizerEventListener = adSyncProcessesOptimizerEventListener
		this.adSyncConfig = adSyncConfig
		this.isIncludeMailUpdates = isIncludeMailUpdates
	}

	async startSyncSessionProcess(imapAccount: ImapAccount, adSyncEventListener: AdSyncEventListener): Promise<SyncSessionProcessState> {
		const imapClient = new ImapFlow({
			host: imapAccount.host,
			port: imapAccount.port,
			secure: true,
			tls: {
				rejectUnauthorized: false, // TODO deactivate after testing
			},
			logger: true,
			auth: {
				user: imapAccount.username,
				pass: imapAccount.password,
				accessToken: imapAccount.accessToken,
			},
			// @ts-ignore
			qresync: this.adSyncConfig.isEnableImapQresync, // TODO add type definitions
		})

		try {
			await imapClient.connect()
			if (this.state == SyncSessionProcessState.NOT_STARTED) {
				this.runSyncSessionProcess(imapClient, adSyncEventListener)
				this.state = SyncSessionProcessState.RUNNING
			}
		} catch (error) {
			// TODO we most probably did run in a rate limit
			// TODO QRESYNC is an issue if the import got postponed, but we have a new modseq somehow and did not finish loading all emails for this modseq ...
			// https://www.rfc-editor.org/rfc/rfc7162.html#section-3.1.4
			// modsequences should therefore only be used once the complete fetch call is finished ... update in batch --> otherwise cancel batch
			this.state = SyncSessionProcessState.CONNECTION_FAILED_NO
		}
		return this.state
	}

	async stopSyncSessionProcess(): Promise<ImapSyncSessionMailbox> {
		this.state = SyncSessionProcessState.STOPPED
		this.adSyncOptimizer.stopAdSyncOptimizer()
		return this.adSyncOptimizer.optimizedSyncSessionMailbox
	}

	private async runSyncSessionProcess(imapClient: typeof ImapFlow, adSyncEventListener: AdSyncEventListener) {
		let isMailboxFinished = false

		try {
			let highestModSeq = this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.highestModSeq

			let status = await imapClient.status(this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.path, {
				messages: true,
				uidNext: true,
				uidValidity: true,
				highestModseq: true,
			})

			let imapMailboxStatus = ImapMailboxStatus.fromImapFlowStatusObject(status)
			this.updateMailboxState(imapMailboxStatus)

			this.adSyncOptimizer.optimizedSyncSessionMailbox.initSessionMailbox(imapMailboxStatus.messageCount)
			adSyncEventListener.onMailboxStatus(imapMailboxStatus)


			// TODO change back to getMailboxLock ?
			await imapClient.mailboxOpen(this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.path, { readonly: true })

			let openedImapMailbox = ImapMailbox.fromSyncSessionMailbox(this.adSyncOptimizer.optimizedSyncSessionMailbox)

			let isEnableImapQresync = this.adSyncConfig.isEnableImapQresync && highestModSeq != null

			let differentialUidLoader = new DifferentialUidLoader(
				imapClient,
				adSyncEventListener,
				openedImapMailbox,
				this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap,
				isEnableImapQresync,
				this.isIncludeMailUpdates
			)
			let deletedUids = await differentialUidLoader.calculateInitialUidDiff()
			this.handleDeletedUids(deletedUids, openedImapMailbox, adSyncEventListener) // handle non-blocking

			let fetchOptions = this.initFetchOptions(imapMailboxStatus, isEnableImapQresync)
			let nextUidFetchRequest = await differentialUidLoader.getNextUidFetchRequest(this.adSyncOptimizer.optimizedSyncSessionMailbox.downloadBlockSize)

			while (nextUidFetchRequest) {
				this.adSyncOptimizer.optimizedSyncSessionMailbox.reportDownloadBlockSizeUsage(nextUidFetchRequest.usedDownloadBlockSize)

				let mailFetchStartTime = Date.now()
				let mails = imapClient.fetch(
					nextUidFetchRequest.uidFetchSequenceString,
					{
						uid: true,
						source: true,
						labels: true,
						size: true,
						flags: true,
						internalDate: true,
						headers: true,
					},
					fetchOptions,
				)

				for await (const mail of mails) {
					if (this.state == SyncSessionProcessState.STOPPED) {
						await this.logout(imapClient, isMailboxFinished)
						return
					}

					let mailFetchEndTime = Date.now()
					let mailFetchTime = mailFetchEndTime - mailFetchStartTime

					if (mail.source) {
						let mailSize = mail.source.length
						let mailDownloadTime = mailFetchTime != 0 ? mailFetchTime : 1 // we approximate the mailFetchTime to minimum 1 millisecond
						let currenThroughput = mailSize / mailDownloadTime
						this.adSyncOptimizer.optimizedSyncSessionMailbox.reportCurrentThroughput(currenThroughput)

						this.adSyncProcessesOptimizerEventListener.onDownloadUpdate(
							this.processId,
							this.adSyncOptimizer.optimizedSyncSessionMailbox,
							mailSize,
						)

						let imapMail = await ImapMail.fromImapFlowFetchMessageObject(
							mail,
							openedImapMailbox,
							this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.get(mail.uid)
						)

						switch (nextUidFetchRequest.fetchRequestType) {
							case UidFetchRequestType.CREATE:
								this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.set(
									imapMail.uid,
									new ImapMailIds(imapMail.uid),
								)
								adSyncEventListener.onMail(imapMail, AdSyncEventType.CREATE)
								break;
							case UidFetchRequestType.UPDATE:
								adSyncEventListener.onMail(imapMail, AdSyncEventType.UPDATE)
								break;
							case UidFetchRequestType.QRESYNC:
								this.handleQresyncFetchResult(imapMail, adSyncEventListener)
								break;
						}
					} else {
						adSyncEventListener.onError(new ImapError(`No IMAP mail source available for IMAP mail with UID ${mail.uid}.`))
					}
				}

				nextUidFetchRequest = await differentialUidLoader.getNextUidFetchRequest(this.adSyncOptimizer.optimizedSyncSessionMailbox.downloadBlockSize)
			}

			isMailboxFinished = true
		} catch (error: any) {
			adSyncEventListener.onError(new ImapError(error))
		} finally {
			await this.logout(imapClient, isMailboxFinished)
		}
	}

	private async logout(imapClient: typeof ImapFlow, isMailboxFinished: boolean) {
		await imapClient.logout()

		if (isMailboxFinished) {
			this.adSyncProcessesOptimizerEventListener.onMailboxFinish(this.processId, this.adSyncOptimizer.optimizedSyncSessionMailbox)
		} else {
			this.adSyncProcessesOptimizerEventListener.onMailboxInterrupted(this.processId, this.adSyncOptimizer.optimizedSyncSessionMailbox)
		}
	}

	private initFetchOptions(imapMailboxStatus: ImapMailboxStatus, isEnableImapQresync: boolean) {
		let fetchOptions = {}
		if (isEnableImapQresync) {
			let highestModSeq = [...this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.values()].reduce<bigint>(
				(acc, imapMailIds) => imapMailIds.modSeq && imapMailIds.modSeq > acc ? imapMailIds.modSeq : acc
				, BigInt(0))
			fetchOptions = {
				uid: true,
				changedSince: highestModSeq,
			}
		} else {
			fetchOptions = {
				uid: true,
			}
		}
		return fetchOptions
	}

	// TODO handle Qresync delete events
	private handleQresyncFetchResult(imapMail: ImapMail, adSyncEventListener: AdSyncEventListener) {
		let isMailUpdate = this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.has(imapMail.uid)

		if (isMailUpdate) {
			adSyncEventListener.onMail(imapMail, AdSyncEventType.UPDATE)
		} else {
			this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.set(
				imapMail.uid,
				new ImapMailIds(imapMail.uid),
			)
			adSyncEventListener.onMail(imapMail, AdSyncEventType.CREATE)
		}
	}

	private async handleDeletedUids(deletedUids: number[], openedImapMailbox: ImapMailbox, adSyncEventListener: AdSyncEventListener) {
		deletedUids.forEach((deletedUid) => {
			let imapMail = new ImapMail(deletedUid, openedImapMailbox).setExternalMailId(this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.get(deletedUid))
			this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState.importedUidToMailIdsMap.delete(deletedUid)
			adSyncEventListener.onMail(imapMail, AdSyncEventType.DELETE)
		})
	}

	updateMailboxState(imapMailboxStatus: ImapMailboxStatus) {
		let mailboxState = this.adSyncOptimizer.optimizedSyncSessionMailbox.mailboxState
		mailboxState.uidValidity = imapMailboxStatus.uidValidity
		mailboxState.uidNext = imapMailboxStatus.uidNext
		mailboxState.highestModSeq = imapMailboxStatus.highestModSeq
	}
}
