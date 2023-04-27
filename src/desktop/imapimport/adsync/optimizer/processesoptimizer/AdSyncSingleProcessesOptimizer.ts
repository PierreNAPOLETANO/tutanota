import { AdSyncProcessesOptimizer } from "./AdSyncProcessesOptimizer.js"
import { ImapSyncSessionMailbox } from "../../ImapSyncSessionMailbox.js"
import { SyncSessionEventListener } from "../../ImapSyncSession.js"
import { AdSyncLogger, LogSourceType } from "../../utils/AdSyncLogger.js"

const OPTIMIZATION_INTERVAL = 5 // in seconds

export class AdSyncSingleProcessesOptimizer extends AdSyncProcessesOptimizer {
	constructor(mailboxes: ImapSyncSessionMailbox[], syncSessionEventListener: SyncSessionEventListener, adSyncLogger: AdSyncLogger) {
		super(mailboxes, 0, syncSessionEventListener, adSyncLogger) // setting optimizationDifference to zero (0)
	}

	override optimize() {
		let currentInterval = this.getCurrentTimeStampInterval()
		let lastInterval = this.getLastTimeStampInterval()
		let combinedAverageThroughputCurrent = this.getCombinedAverageThroughputInTimeInterval(currentInterval.fromTimeStamp, currentInterval.toTimeStamp)
		let combinedAverageThroughputLast = this.getCombinedAverageThroughputInTimeInterval(lastInterval.fromTimeStamp, lastInterval.toTimeStamp)

		this.adSyncLogger.writeToLog(
			`${currentInterval.fromTimeStamp}, ${currentInterval.toTimeStamp}, ${combinedAverageThroughputCurrent}, ${0}\n`,
			LogSourceType.SINGLE_PROCESSES_OPTIMIZER,
		)
	}

	override startAdSyncOptimizer(): void {
		super.startAdSyncOptimizer()
		this.scheduler = setInterval(this.optimize.bind(this), OPTIMIZATION_INTERVAL * 1000) // every OPTIMIZATION_INTERVAL seconds
		this.optimize() // call once to enable logging
		this.startSyncSessionProcesses(1)
	}

	override forceStopSyncSessionProcess(processId: number, isExceededRateLimit: boolean = false) {
		super.forceStopSyncSessionProcess(processId)
	}
}
