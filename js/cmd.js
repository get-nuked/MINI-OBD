import { writeToLogFile } from "./logger.js"
import { getLogFileHandle } from "./storage.js"
import { openApprovedAdapter, closeAdapter} from "./serial-connection.js"
import { Elm327 } from "./elm327.js"


const sendButton =document.getElementById("sendButton")
const commandInput =document.getElementById("commandInput")
const output =document.getElementById("output")
const faultScanButton = document.getElementById("faultScanButton")

let port = null
let elm = null
let logFile = null
let commandInProgress = false

async function initialiseCommandPage() {
    try {
        output.textContent += "Opening OBD adapter...\n"
        port = await openApprovedAdapter()
        elm = new Elm327(port)
        logFile = await getLogFileHandle()
        if (logFile) {
            output.textContent += "Session logging enabled.\n"
        } else {
            output.textContent += "Session logging disabled.\n"
        }

        /*
         * Test communication immediately.
         */
        output.textContent += "Testing adapter...\n"
        const identification = await elm.send("ATI",5000)
        output.textContent +="Adapter response:\n" + identification + "\n"
        sendButton.disabled = false
        commandInput.disabled = false
        commandInput.focus()
        output.textContent += "OBD adapter ready.\n\n"
    } catch (error) {
        console.error(error)

        output.textContent +="Connection failed: " + error.message + "\n"
    }
}

async function sendCommand(command) {
    if (!elm || commandInProgress) {
        return
    }

    command = command.trim().toUpperCase()
    if (command === "") {
        return
    }

    commandInProgress = true
    sendButton.disabled = true
    commandInput.disabled = true
    const time =new Date() .toLocaleString()

    try {
        output.textContent +="> " + command + "\n"

        /*
         * Use our shared ELM driver.
         */
        const response =await elm.send(command, 5000)
        output.textContent += response + "\n"
        output.scrollTop = output.scrollHeight

        if (logFile) {
            await writeToLogFile(logFile, "[" + time + "] COMMAND: " + command + "\nRESPONSE: " + response + "\n\n")
        }

    } catch (error) {
        console.error(error)
        output.textContent +="ERROR: " + error.message + "\n"

        if (logFile) {
            await writeToLogFile(logFile, "[" + time + "] COMMAND: " + command + "\nERROR: " + error.message + "\n\n")
        }
    } finally {
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
    }
)

commandInput.addEventListener("keydown", async event => {
        if (event.key === "Enter") {
            const command = commandInput.value
            commandInput.value = ""
            await sendCommand(command)
        }
    }
)

faultScanButton.addEventListener("click", async () => {
        try {
            /*
             * Explicitly close the serial connection
             * before loading another HTML document.
             */
            await closeAdapter(port)
            port = null
            elm = null
            window.location.href = "faults.html"
        } catch (error) {
            console.error(error)
            output.textContent += "Could not open fault scanner: " + error.message + "\n"
        }
    }
)

initialiseCommandPage()