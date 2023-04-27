import { FsExports } from "../../../ElectronExportTypes.js"

export enum LogSourceType {
	SINGLE_PROCESSES_OPTIMIZER,
	PARALLEL_PROCESSES_OPTIMIZER,
	DOWNLOAD_BLOCK_SIZE_OPTIMIZER,
	MAIL_DOWNLOAD,
	MAIL_ENCRYPTION,
	MAIL_UPLOAD,
	GLOBAL,
	SYSTEM,
}

export class AdSyncLogger {
	private fs: FsExports

	constructor(fs: FsExports) {
		this.fs = fs
	}

	async initializeLogFile(logSourceType: LogSourceType) {
		let filepath = ""
		let logText = ""

		//TODO add different evaluation rounds counter

		switch (logSourceType) {
			case LogSourceType.SINGLE_PROCESSES_OPTIMIZER:
				filepath = "./outputs/single_processes_optimizer.csv"
				logText = "currentInterval fromTimeStamp, currentInterval toTimeStamp, combinedAverageThroughputCurrent, UpdateAction\n"
				break

			case LogSourceType.PARALLEL_PROCESSES_OPTIMIZER:
				filepath = "./outputs/parallel_processes_optimizer.csv"
				logText =
					"currentInterval fromTimeStamp, currentInterval toTimeStamp, combinedAverageThroughputCurrent, UpdateAction, maxParallelProcesses, runningProcessMap Size, runningProcessMap MailboxPaths\n"
				break

			case LogSourceType.DOWNLOAD_BLOCK_SIZE_OPTIMIZER:
				filepath = "./outputs/download_block_size_optimizer.csv"
				logText =
					"currentInterval fromTimeStamp, currentInterval toTimeStamp, averageThroughputCurrent, downloadBlockSizeCurrent, downloadBlockSizeDidIncrease, mailboxPath\n"
				break

			case LogSourceType.MAIL_DOWNLOAD:
				filepath = "./outputs/mail_download.csv"
				logText = "mailDownloadStartTime, mailDownloadEndTime, mailDownloadTime, currenThroughput, mailSize, imapUid, mailboxPath, processId\n"
				break

			case LogSourceType.MAIL_ENCRYPTION:
				filepath = "./outputs/mail_encryption.csv"
				logText = "encryptionStartTime, encryptionEndTime, encryptionTime, currenThroughput, mailSize, imapUid, mailboxPath\n"
				break

			case LogSourceType.MAIL_UPLOAD:
				filepath = "./outputs/mail_upload.csv"
				logText = "mailUploadStartTime, mailUploadEndTime, mailUploadTime, currenThroughput, mailSize, imapUid, mailboxPath\n"
				break

			case LogSourceType.GLOBAL:
				filepath = "./outputs/global.csv"
				logText = "timeStamp, event, processId, mailboxPath\n"
				break

			case LogSourceType.SYSTEM:
				filepath = "./outputs/system.csv"
				logText = "startTime, endTime, downloadTime, event, downloadedQuota, averageThroughput (bytes/ms), onMailCounter\n"
				break
		}

		await this.fs.promises.writeFile(filepath, logText)
	}

	async writeToLog(logText: string, logSourceType: LogSourceType) {
		let filepath = ""

		switch (logSourceType) {
			case LogSourceType.SINGLE_PROCESSES_OPTIMIZER:
				filepath = "./outputs/single_processes_optimizer.csv"
				break

			case LogSourceType.PARALLEL_PROCESSES_OPTIMIZER:
				filepath = "./outputs/parallel_processes_optimizer.csv"
				break

			case LogSourceType.DOWNLOAD_BLOCK_SIZE_OPTIMIZER:
				filepath = "./outputs/download_block_size_optimizer.csv"
				break

			case LogSourceType.MAIL_DOWNLOAD:
				filepath = "./outputs/mail_download.csv"
				break

			case LogSourceType.MAIL_ENCRYPTION:
				filepath = "./outputs/mail_encryption.csv"
				break

			case LogSourceType.MAIL_UPLOAD:
				filepath = "./outputs/mail_upload.csv"
				break

			case LogSourceType.GLOBAL:
				filepath = "./outputs/global.csv"
				break

			case LogSourceType.SYSTEM:
				filepath = "./outputs/system.csv"
				break
		}

		await this.fs.promises.appendFile(filepath, logText)
	}
}
