const sendButton = document.getElementById("sendButton")
const commandInput = document.getElementById("commandInput")
const output = document.getElementById("output")

let port
let logFile = null


export async function writeToLogFile(data) {
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