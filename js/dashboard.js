import {
    openApprovedAdapter,
    closeAdapter
} from "./serial-connection.js"

import {
    getLogFileHandle
} from "./storage.js"


const adapterStatus = document.getElementById("adapterStatus")
const backToTerminalButton = document.getElementById("backToTerminalButton")

let port = null
let logFile = null

async function initialiseDashboard() {
    try {
        adapterStatus.textContent ="Connecting to OBD adapter..."
        /*
         * Reopen the adapter that was approved
         * from the setup page.
         */
        port = await openApprovedAdapter()

        /*
         * Recover the same session log used
         * by cmd.html.
         */
        logFile = await getLogFileHandle()

        adapterStatus.textContent = "OBD adapter connected"

        console.log(
            "Dashboard connected to adapter:",
            port
        )
    } catch (error) {
        console.error(error)
        adapterStatus.textContent = "Connection failed: " + error.message
    }
}



backToTerminalButton.addEventListener(
    "click",
    async () => {
        try {
            await closeAdapter(port)
            window.location.href = "cmd.html"
        } catch (error) {
            console.error(error)
            adapterStatus.textContent =  "Could not return to terminal: " + error.message
        }
    }
)

initialiseDashboard()