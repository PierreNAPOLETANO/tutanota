import { ImapMailIds } from "../ImapSyncState.js"
import { AdSyncEventListener } from "../AdSyncEventListener.js"
import { ImapMailbox } from "../imapmail/ImapMailbox.js"

const { ImapFlow } = require("imapflow")

interface UidFetchSequence {
	fromUid: number
	toUid: number
}

export enum UidFetchRequestType {
	CREATE,
	UPDATE,
	QRESYNC
}

export interface UidFetchRequest {
	uidFetchSequenceString: string
	fetchRequestType: UidFetchRequestType
	usedDownloadBlockSize?: number
}

export class DifferentialUidLoader {

	private uidFetchRequestQueue: UidFetchRequest[] = []

	private uidCreateQueue: number[] = []
	private uidUpdateQueue: number[] = []

	private readonly imapClient: typeof ImapFlow
	private readonly adSyncEventListener: AdSyncEventListener
	private readonly openedImapMailbox: ImapMailbox
	private readonly importedUidToMailIdsMap: Map<number, ImapMailIds>
	private readonly isEnableImapQresync: boolean
	private readonly isIncludeMailUpdates: boolean

	constructor(imapClient: typeof ImapFlow,
				adSyncEventListener: AdSyncEventListener,
				openedImapMailbox: ImapMailbox,
				importedUidToMailIdsMap: Map<number, ImapMailIds>,
				isEnableImapQresync: boolean,
				isIncludeMailUpdates: boolean
	) {
		this.imapClient = imapClient
		this.adSyncEventListener = adSyncEventListener
		this.openedImapMailbox = openedImapMailbox
		this.importedUidToMailIdsMap = importedUidToMailIdsMap
		this.isEnableImapQresync = isEnableImapQresync
		this.isIncludeMailUpdates = isIncludeMailUpdates
	}

	async calculateInitialUidDiff(): Promise<number[]> {
		// if IMAP QRESYNC is enabled and supported by the IMAP server, we do not need to calculate the diff on our own
		if (this.isEnableImapQresync) {
			this.uidFetchRequestQueue.push(
				{
					uidFetchSequenceString: '1:*',
					fetchRequestType: UidFetchRequestType.QRESYNC
				}
			)
			return [] // delete events are handle automatically by IMAP QRESYNC extension
		}

		let mails = await this.imapClient.fetch(`1:*`, { uid: true }, {})

		for await (const mail of mails) {
			let uid = mail.uid
			if (this.importedUidToMailIdsMap.has(uid)) {
				this.uidUpdateQueue.push(uid)
			} else {
				this.uidCreateQueue.push(uid)
			}
		}

		let deletedUids = [...this.importedUidToMailIdsMap.keys()].filter((uid) => {
			!this.uidUpdateQueue.includes(uid) && !this.uidCreateQueue.includes(uid)
		})
		return deletedUids
	}

	async getNextUidFetchRequest(downloadBlockSize: number): Promise<UidFetchRequest | null> {
		let waitingUidFetchRequest = this.uidFetchRequestQueue.pop()
		if (waitingUidFetchRequest) {
			return waitingUidFetchRequest
		}

		let nextUidFetchRange: number[]
		let fetchRequestType: UidFetchRequestType

		if (this.uidCreateQueue.length != 0) {
			nextUidFetchRange = this.uidCreateQueue.splice(0, downloadBlockSize)
			fetchRequestType = UidFetchRequestType.CREATE
		} else if (this.isIncludeMailUpdates && this.uidUpdateQueue.length != 0) {
			nextUidFetchRange = this.uidUpdateQueue.splice(0, downloadBlockSize)
			fetchRequestType = UidFetchRequestType.UPDATE
		} else {
			return null
		}

		let uidFetchSequenceStrings = this.buildUidFetchSequenceStrings(nextUidFetchRange)
		let nextUidFetchSequenceRequests = uidFetchSequenceStrings.map(uidFetchSequenceString => {
			return {
				uidFetchSequenceString: uidFetchSequenceString,
				fetchRequestType: fetchRequestType,
				usedDownloadBlockSize: downloadBlockSize
			}
		})

		this.uidFetchRequestQueue.push(...nextUidFetchSequenceRequests)
		return this.uidFetchRequestQueue.pop() ?? null
	}

	private buildUidFetchSequenceStrings(uidsToFetch: number[]): string[] {
		let uidFetchSequenceList = uidsToFetch.reduce<UidFetchSequence[]>((uidFetchSequenceList, uid: number) => {
			let prevUidFetchSequence = uidFetchSequenceList.at(-1)

			if (prevUidFetchSequence && prevUidFetchSequence.toUid == uid - 1) {
				prevUidFetchSequence.toUid = uid
				uidFetchSequenceList[-1] = prevUidFetchSequence
			} else {
				let newUidFetchSequence = {
					fromUid: uid,
					toUid: uid
				}
				uidFetchSequenceList.push(newUidFetchSequence)
			}
			return uidFetchSequenceList
		}, [])

		// We restrict the length of the uidFetchSequenceString to speed up IMAP server communication (we only allow 25 SequenceStrings per IMAP command)
		let perChunk = 25
		let uidFetchSequenceChunks = uidFetchSequenceList.reduce<UidFetchSequence[][]>((uidFetchSequenceListChunks: UidFetchSequence[][], uidFetchSequenceList, index) => {
			const chunkIndex = Math.floor(index / perChunk)

			if (!uidFetchSequenceListChunks[chunkIndex]) {
				uidFetchSequenceListChunks[chunkIndex] = []
			}

			uidFetchSequenceListChunks[chunkIndex].push(uidFetchSequenceList)

			return uidFetchSequenceListChunks
		}, [])

		let uidFetchSequenceStrings = uidFetchSequenceChunks.map(uidFetchSequenceChunk => {
			return uidFetchSequenceChunk.reduce<string>((uidFetchSequenceString, uidFetchSequence, index) => {
				if (uidFetchSequence.fromUid == uidFetchSequence.toUid) {
					return uidFetchSequenceString + `${uidFetchSequence.fromUid}` + (index == uidFetchSequenceChunk.length - 1 ? '' : ',')
				} else {
					return uidFetchSequenceString + `${uidFetchSequence.fromUid}:${uidFetchSequence.toUid}` + (index == uidFetchSequenceChunk.length - 1 ? '' : ',')
				}
			}, '')
		})

		return uidFetchSequenceStrings
	}
}
