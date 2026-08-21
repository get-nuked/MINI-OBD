export async function writeToLogFile(logFile, data) {
    if (!logFile) {
        return
    }

    const file = await logFile.getFile()
    const writable = await logFile.createWritable({ keepExistingData: true })
    await writable.seek(file.size)
    await writable.write(data)
    await writable.close()
}