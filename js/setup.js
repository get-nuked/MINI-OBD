const connectButton = document.getElementById("connectButton")
const status = document.getElementById("status")
const folderButton = document.getElementById("folderButton")
const folderStatus =  document.getElementById("folderStatus")

let logDirectory = null
let port
let logFile = null

import { writeToLogFile } from "./logger.js"
import { saveLogFileHandle } from "./storage.js"


folderButton.addEventListener("click", async () => {
    try {
        logDirectory = await window.showDirectoryPicker({ mode: "readwrite" })
        folderStatus.textContent = "Log folder: " + logDirectory.name
    } catch (error) {
        console.error(error)
        folderStatus.textContent = "No log folder selected"
    }
})


connectButton.addEventListener("click", async () => {
    try { // Check that the browser supports Web Serial
        if(!logDirectory) {
            throw new Error("Please select a log folder before connecting to the OBD adapter.")
        }

        if (!("serial" in navigator)) {
            throw new Error(
                "Web Serial is not supported by this browser."
            )
        }

        status.textContent = "Choose your OBD adapter..."

        // Opens the browser's serial/Bluetooth device picker
        port = await navigator.serial.requestPort()

        // Opens the serial connection to the adapter
        await port.open({baudRate: 38400})

        status.textContent = "Connected"

        const logFile = await createsessionLogFile()
        await saveLogFileHandle(logFile)
        await port.close() // Close the port after creating the log file
        window.location.href = "cmd.html";

    } catch (error) {
        console.error(error)
        status.textContent = "Connection failed\n" + error.message
    }
})


async function createsessionLogFile() {
    const now = new Date()
    const filename = `MINI-OBD-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.txt`
    const logFile = await logDirectory.getFileHandle(filename, { create: true })  

    await writeToLogFile(logFile, "MINI OBD Session Log\n" + "Session started at: " + now.toLocaleString() + "\n\n")
}






