import { AdSyncEventListener } from "./AdSyncEventListener.js"
import { ImapSyncSession } from "./ImapSyncSession.js"
import { ImapSyncState } from "./ImapSyncState.js"
import { AdSyncLogger, LogSourceType } from "./utils/AdSyncLogger.js"
import { readFileSync } from "fs-extra"
import { FsExports } from "../../ElectronExportTypes.js"

const defaultAdSyncConfig: AdSyncConfig = {
	isEnableParallelProcessesOptimizer: true,
	isEnableDownloadBlockSizeOptimizer: true,
	parallelProcessesOptimizationDifference: 2,
	downloadBlockSizeOptimizationDifference: 100,
	isEnableImapQresync: false,
}

export interface AdSyncConfig {
	isEnableParallelProcessesOptimizer: boolean
	isEnableDownloadBlockSizeOptimizer: boolean
	parallelProcessesOptimizationDifference: number
	downloadBlockSizeOptimizationDifference: number
	isEnableImapQresync: boolean
}

export class ImapAdSync {
	private syncSession: ImapSyncSession
	adSyncLogger: AdSyncLogger

	constructor(adSyncEventListener: AdSyncEventListener, fs: FsExports, adSyncConfig: AdSyncConfig = defaultAdSyncConfig) {
		let newAdSyncConfig = adSyncConfig
		this.adSyncLogger = new AdSyncLogger(fs)

		const evaluation_conf_json_path = process.env.EVALUATION_CONF_PATH
		console.log(evaluation_conf_json_path)
		if (evaluation_conf_json_path) {
			const jsonString = readFileSync(evaluation_conf_json_path).toString()
			if (jsonString) {
				const evaluation_conf = JSON.parse(jsonString)
				newAdSyncConfig = {
					isEnableParallelProcessesOptimizer: evaluation_conf.isEnableParallelProcessesOptimizer,
					isEnableDownloadBlockSizeOptimizer: evaluation_conf.isEnableDownloadBlockSizeOptimizer,
					parallelProcessesOptimizationDifference: evaluation_conf.parallelProcessesOptimizationDifference,
					downloadBlockSizeOptimizationDifference: evaluation_conf.downloadBlockSizeOptimizationDifference,
					isEnableImapQresync: evaluation_conf.isEnableImapQresync,
				}
			}
		}

		console.log(newAdSyncConfig)

		this.syncSession = new ImapSyncSession(adSyncEventListener, newAdSyncConfig, this.adSyncLogger)

		this.adSyncLogger.initializeLogFile(LogSourceType.SINGLE_PROCESSES_OPTIMIZER)
		this.adSyncLogger.initializeLogFile(LogSourceType.PARALLEL_PROCESSES_OPTIMIZER)
		this.adSyncLogger.initializeLogFile(LogSourceType.DOWNLOAD_BLOCK_SIZE_OPTIMIZER)
		this.adSyncLogger.initializeLogFile(LogSourceType.MAIL_DOWNLOAD)
		this.adSyncLogger.initializeLogFile(LogSourceType.MAIL_ENCRYPTION)
		this.adSyncLogger.initializeLogFile(LogSourceType.MAIL_UPLOAD)
		this.adSyncLogger.initializeLogFile(LogSourceType.GLOBAL)
		this.adSyncLogger.initializeLogFile(LogSourceType.SYSTEM)
	}

	async startAdSync(imapSyncState: ImapSyncState, isIncludeMailUpdates: boolean = true): Promise<void> {
		return this.syncSession.startSyncSession(imapSyncState, isIncludeMailUpdates)
	}

	async stopAdSync(): Promise<void> {
		return this.syncSession.stopSyncSession()
	}
}
