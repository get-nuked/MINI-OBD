const sendButton = document.getElementById("sendButton")
const commandInput = document.getElementById("commandInput")
const output = document.getElementById("output")

let port
let logFile = null
let commandInProgress = false

import { writeToLogFile } from "./logger.js"
import { getLogFileHandle } from "./storage.js"


async function reconnectToAdapter() {
    const ports = await navigator.serial.getPorts();

    if (ports.length === 0) {
        throw new Error("No previously approved adapter found. Please connect your OBD adapter from the setup page.");
        console.log("No previously approved adapter found");
        return;
    }

    port = ports[0];
    await port.open({baudRate: 38400});
    console.log("Reconnected");
}


async function initialiseCommandPage() {
    try {
        await reconnectToAdapter()
        logFile = await getLogFileHandle()

        if (!logFile) {
            throw new Error("No log file handle found. Please start a new session from the setup page.");
        }
        sendButton.disabled = false
        commandInput.disabled = false
        commandInput.focus()
        output.textContent += "Connected to OBD adapter. You can now send commands.\n"
    } catch (error) {
        console.error(error)
        output.textContent += "Failed to reconnect: " + error.message
    }
}

initialiseCommandPage()


async function readWithTimeout(reader, timeout = 3000) {
    let timer
    try {
        return await Promise.race([
            reader.read(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(
                        new Error(
                            "OBD adapter did not respond within 3 seconds"
                        )
                    )
                }, timeout)
            })
        ])

    } finally {
        clearTimeout(timer)
    }
}


async function sendCommand(command) {
    if (!port || commandInProgress) {
        return
    }
    command = command.trim().toUpperCase()

    if (command === "") {
        return
    }

    commandInProgress = true
    sendButton.disabled = true
    commandInput.disabled = true

    const time = new Date().toLocaleString()

    let writer, reader

    try {
        output.textContent += "> " + command + "\n"

        // Get access to send data to the adapter
        writer = port.writable.getWriter()
        const encoder = new TextEncoder()

        // ELM commands end with a carriage return
        await writer.write(encoder.encode(command + "\r"))

        writer.releaseLock()
        writer = null

        // Read the adapter's response
        reader = port.readable.getReader()
        const decoder = new TextDecoder()

        let response = ""

        while (true) {
            const { value, done } = await readWithTimeout(reader)

            if (done) {
                break
            }

            response += decoder.decode(value)

            // ">" means the ELM327 is ready for another command
            if (response.includes(">")) {
                break
            }
        }

        reader.releaseLock()
        reader = null

        output.textContent += response + "\n"
        // Scroll to the latest response
        output.scrollTop = output.scrollHeight

        await writeToLogFile(logFile, "[" + time + "] COMMAND: " + command + "\nRESPONSE: " + response + "\n\n")
    } catch (error) {
        console.error(error)
        output.textContent += "ERROR: " + error.message + "\n"
        await writeToLogFile(logFile, "[" + time + "] COMMAND: " + command + "\nRESPONSE: " + error.message + "\n\n")
    } finally {
        // Always release locks, even if an error occurs
        if (reader) {
            try {
                await reader.cancel()
                reader.releaseLock()
            } catch {}
        }

        if (writer) {
            try {
                writer.releaseLock()
            } catch {}
        }

        commandInProgress = false
        sendButton.disabled = false
        commandInput.disabled = false
        commandInput.focus()
    }
}


sendButton.addEventListener("click", async () => {
    const command = commandInput.value
    commandInput.value = ""
    await sendCommand(command)
    commandInput.focus()
})


// Pressing Enter also sends the command
commandInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        const command = commandInput.value
        commandInput.value = ""
        await sendCommand(command)
        commandInput.focus()
    }
})