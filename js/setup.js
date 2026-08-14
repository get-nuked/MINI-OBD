const connectButton = document.getElementById("connectButton")
const status = document.getElementById("status")

let port
let logFile = null

import { writeToLogFile } from "./logger.js"
import { saveLogFileHandle } from "./storage.js"


connectButton.addEventListener("click", async () => {
    try { // Check that the browser supports Web Serial
        if (!("serial" in navigator)) {
            throw new Error(
                "Web Serial is not supported by this browser."
            )
        }

        status.textContent = "Choose your OBD adapter..."

        // Opens the browser's serial/Bluetooth device picker
        port = await navigator.serial.requestPort()

        // Opens the serial connection to the adapter
        await port.open({
            baudRate: 38400
        })

        status.textContent = "Connected"

        await createsessionLogFile()
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

    try {
        logFile = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [
                {
                    description: "Text Files",
                    accept: { "text/plain": [".txt"] }
                }
            ]
        })
        await saveLogFileHandle(logFile)
    } catch (error) {
        console.error(error)
        status.textContent += "\nERROR: " + error.message
    }

    await writeToLogFile(logFile, "MINI OBD Session Log\n" + "Session started at: " + now.toLocaleString() + "\n\n")
}






