import {writeToLogFile} from "./logger.js"
import {saveLogFileHandle, clearLogFileHandle} from "./storage.js"

const logFileButton = document.getElementById("folderBox")
const logFileStatus = document.getElementById("folderStatus")
const logFileCheckbox = document.getElementById("logFile")
const connectButton = document.getElementById("connectButton")
const status = document.getElementById("status")

let port = null


connectButton.addEventListener("click", async () => {
    try {
        /*
        * VERY IMPORTANT:
        *
        * Remove any log handle left over
        * from a previous session.
        *
        * Otherwise cmd.html could retrieve
        * an old log file and start writing
        * this session into it.
        */
        if (logFileCheckbox.checked) {
            // User chooses/creates the .txt logfile.
            const logFile = await createSessionLogFile()
            /*
             * Don't let a missing folderStatus element
             * murder the rest of the connection process.
             */
            if (logFileStatus) {
                logFileStatus.textContent = logFile.name
            }

            /*
             * STEP 2
             *
             * IMPORTANT:
             * Ask for the OBD adapter IMMEDIATELY after
             * the Save As picker returns.
             *
             * Do not put IndexedDB/log-writing awaits
             * between these two picker operations.
             */
            status.textContent = "Choose your OBD adapter..."
            port = await navigator.serial.requestPort()

            /*
             * We now have BOTH handles.
             *
             * From here onwards we can safely perform
             * ordinary asynchronous work.
             */
            status.textContent = "Opening OBD adapter..."
            await port.open({baudRate: 38400})

            /*
             * Save logfile handle for cmd.html.
             */
            await saveLogFileHandle(logFile)

            /*
             * Initialise the logfile.
             */
            const now =new Date()
            await writeToLogFile(
                logFile,

                "R56doc Session Log\n" +
                "Session started at: " +
                now.toLocaleString() +
                "\n\n"
            )
            status.textContent ="Connected"

            /*
             * cmd.html reconnects to the approved
             * adapter, so release it first.
             */
            await port.close()
            port = null
            window.location.href = "cmd.html"
        } else {
            await clearLogFileHandle()
            await startSession(null)
        }
    } catch (error) {
        if (error.name === "AbortError") {
            status.textContent = "Connection cancelled."
            return
        }

        console.error(error)
        status.textContent = "Connection failed: " + error.message
    }
}
)

// /*
//  * ========================================
//  * CONNECT WITHOUT A LOG FILE
//  * ========================================
//  *
//  * Clicking the normal Connect button starts
//  * the diagnostic session without creating
//  * any log file.
//  */
// connectButton.addEventListener("click", async () => {
//     try {
//         /*
//         * VERY IMPORTANT:
//         *
//         * Remove any log handle left over
//         * from a previous session.
//         *
//         * Otherwise cmd.html could retrieve
//         * an old log file and start writing
//         * this session into it.
//         */
//         await clearLogFileHandle()

//         /*
//         * Start the session with no log.
//         */
//         await startSession(null)
//     } catch (error) {

//         console.error(error)
//         status.textContent = "Connection failed: " + error.message
//     }
// }
// )


// /*
//  * ========================================
//  * CREATE LOG FILE + CONNECT
//  * ========================================
//  *
//  * The user chooses exactly where the .txt
//  * file should be saved and may rename it.
//  *
//  * Once the file has been selected,
//  * R56doc automatically starts the session.
//  */
// logFileButton.addEventListener("click", async () => {
//         try {
//             /*
//              * STEP 1
//              * User chooses/creates the .txt logfile.
//              */
//             const logFile = await createSessionLogFile()
//             /*
//              * Don't let a missing folderStatus element
//              * murder the rest of the connection process.
//              */
//             if (logFileStatus) {
//                 logFileStatus.textContent = logFile.name
//             }

//             /*
//              * STEP 2
//              *
//              * IMPORTANT:
//              * Ask for the OBD adapter IMMEDIATELY after
//              * the Save As picker returns.
//              *
//              * Do not put IndexedDB/log-writing awaits
//              * between these two picker operations.
//              */
//             status.textContent = "Choose your OBD adapter..."
//             port = await navigator.serial.requestPort()

//             /*
//              * We now have BOTH handles.
//              *
//              * From here onwards we can safely perform
//              * ordinary asynchronous work.
//              */
//             status.textContent = "Opening OBD adapter..."
//             await port.open({baudRate: 38400})

//             /*
//              * Save logfile handle for cmd.html.
//              */
//             await saveLogFileHandle(logFile)

//             /*
//              * Initialise the logfile.
//              */
//             const now =new Date()
//             await writeToLogFile(
//                 logFile,

//                 "R56doc Session Log\n" +
//                 "Session started at: " +
//                 now.toLocaleString() +
//                 "\n\n"
//             )
//             status.textContent ="Connected"

//             /*
//              * cmd.html reconnects to the approved
//              * adapter, so release it first.
//              */
//             await port.close()
//             port = null
//             window.location.href = "cmd.html"
//         } catch (error) {
//             if (error.name === "AbortError") {
//                 status.textContent = "Connection cancelled."
//                 return
//             }

//             console.error(error)
//             status.textContent = "Connection failed: " + error.message
//         }
//     }
// )



/*
 * ========================================
 * START DIAGNOSTIC SESSION
 * ========================================
 *
 * logFile may either be:
 *
 * FileSystemFileHandle
 *
 * OR:
 *
 * null
 *
 * The actual OBD connection does not depend
 * on logging existing.
 */
async function startSession(logFile = null) {
    if (!("serial" in navigator)) {
        throw new Error("Web Serial is not supported by this browser.")
    }

    status.textContent = "Choose your OBD adapter..."
    /*
     * Ask the user which serial/Bluetooth
     * adapter should be used.
     */
    port = await navigator.serial.requestPort()
    status.textContent = "Opening OBD adapter..."
    await port.open({baudRate: 38400})
    status.textContent = "Connected"

    /*
     * Only initialise the logfile if
     * logging was requested.
     */
    if (logFile) {
        const now = new Date()
        await writeToLogFile(logFile, "R56doc Session Log\n" + "Session started at: " + now.toLocaleString() + "\n\n")
    }


    /*
     * cmd.html opens the approved adapter
     * again, so release it before navigating.
     */
    await port.close()
    port = null
    window.location.href = "cmd.html"
}



/*
 * ========================================
 * CREATE SESSION LOG FILE
 * ========================================
 *
 * Unlike the previous implementation,
 * this asks for ONE .txt file rather than
 * asking for an entire folder.
 */
async function createSessionLogFile() {
    if (!("showSaveFilePicker" in window)) {
        throw new Error("Saving log files is not supported by this browser.")
    }

    const now = new Date()
    const filename = `R56doc-${now.getFullYear()}-` + `${String(now.getMonth() + 1).padStart(2, "0")}-` + `${String(now.getDate()).padStart(2, "0")}-` + `${String(now.getHours()).padStart(2, "0")}-` + `${String(now.getMinutes()).padStart(2, "0")}.txt`

    /*
     * Browser opens the normal Save As
     * dialogue.
     */
    const logFile = await window.showSaveFilePicker({suggestedName: filename, types: [{description:"R56doc text log", accept: {"text/plain": [".txt"]}}], excludeAcceptAllOption: false})
    return logFile
}