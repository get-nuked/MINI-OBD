const connectButton = document.getElementById("connectButton")
const sendButton = document.getElementById("sendButton")
const commandInput = document.getElementById("commandInput")
const status = document.getElementById("status")
const output = document.getElementById("output")

let port
let logFile = null

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
        output.textContent += "Connected to OBD adapter\n\n"

        await createsessionLogFile()

        commandInput.disabled = false
        sendButton.disabled = false

        commandInput.focus()
    } catch (error) {
        console.error(error)
        status.textContent = "Connection failed"
        output.textContent += "\nERROR: " + error.message
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
    } catch (error) {
        console.error(error)
        output.textContent += "\nERROR: " + error.message
    }

    await writeToLogFile("MINI OBD Session Log\n" + "Session started at: " + now.toLocaleString() + "\n\n")
}


async function writeToLogFile(data) {
    if (!logFile) {
        return
    }

    try {
        const file = await logFile.getFile()
        const writable = await logFile.createWritable({keepExistingData: true})
        await writable.seek(file.size)
        await writable.write(data)
        await writable.close()
    } catch (error) {
        console.error(error)
        output.textContent += "\nERROR: " + error.message
    }
}


async function sendCommand(command) {
    if (!port) {
        return
    }
    command = command.trim().toUpperCase()

    if (command === "") {
        return
    }

    const time = new Date().toLocaleString()

    try {
        output.textContent += "> " + command + "\n"

        // Get access to send data to the adapter
        const writer = port.writable.getWriter()
        const encoder = new TextEncoder()

        // ELM commands end with a carriage return
        await writer.write(
            encoder.encode(command + "\r")
        )

        writer.releaseLock()

        // Read the adapter's response
        const reader = port.readable.getReader()
        const decoder = new TextDecoder()

        let response = ""

        while (true) {
            const { value, done } =
                await reader.read()

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
        output.textContent += response + "\n"
        // Scroll to the latest response
        output.scrollTop = output.scrollHeight

        await writeToLogFile("[" + time + "] COMMAND: " + command + "\nRESPONSE: " + response + "\n\n")
    } catch (error) {
        console.error(error)
        output.textContent += "ERROR: " + error.message + "\n"
        await writeToLogFile("[" + time + "] COMMAND: " + command + "\nRESPONSE: " + error.message + "\n\n")
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