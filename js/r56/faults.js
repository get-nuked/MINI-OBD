import { openApprovedAdapter } from "../serial-connection.js"
import { Elm327 } from "../elm327.js"
import { BmwDcan } from "../bmwDcan.js"
import { getLogFileHandle } from "../storage.js"
import { writeToLogFile } from "../logger.js"
import { scanR56Faults } from "./fault-scanner.js"

const adapterStatus = document.getElementById("adapterStatus")
const scanButton = document.getElementById("scanButton")
const faultOutput = document.getElementById("faultOutput")

let port = null
let elm = null
let bmw = null
let logFile = null
let scanInProgress = false

async function initialisePage() {
    try {
        adapterStatus.textContent = "Opening OBD adapter..."

        port = await openApprovedAdapter()
        elm = new Elm327(port)

        adapterStatus.textContent = "Initialising BMW D-CAN..."
        await elm.initialiseForBmw()

        bmw = new BmwDcan(elm)
        await bmw.initialise()

        try {
            logFile = await getLogFileHandle()
        } catch (error) {
            console.warn("Session log unavailable:", error)
        }

        adapterStatus.textContent = "BMW diagnostic connection ready"
        scanButton.disabled = false
    } catch (error) {
        console.error(error)
        adapterStatus.textContent = "Connection failed: " + error.message
    }
}

scanButton.addEventListener("click", async () => {
    if (!bmw || scanInProgress) {
        return
    }

    scanInProgress = true
    scanButton.disabled = true
    faultOutput.textContent = "Starting R56 fault scan...\n"

    try {
        const results = await scanR56Faults(
            bmw,
            ({ module, state, result }) => {
                if (state === "scanning") {
                    adapterStatus.textContent = `Scanning ${module.id}...`
                }

                if (state === "complete") {
                    faultOutput.textContent += `${module.id}: ${result.faults.length} fault(s)\n`
                }

                if (state === "failed") {
                    faultOutput.textContent += `${module.id}: unavailable (${result.error})\n`
                }
            }
        )

        const report = formatScanReport(results)
        faultOutput.textContent = report
        adapterStatus.textContent = "Fault scan complete"

        if (logFile) {
            const time = new Date().toLocaleString()
            await writeToLogFile(
                logFile,
                `[${time}] R56 FAULT SCAN\n${report}\n\n`
            )
        }
    } catch (error) {
        console.error(error)
        adapterStatus.textContent = "Fault scan failed"
        faultOutput.textContent += "\nERROR: " + error.message
    } finally {
        scanInProgress = false
        scanButton.disabled = false
    }
})

function formatScanReport(results) {
    const lines = []
    const totalFaults = results.reduce(
        (total, result) => total + result.faults.length,
        0
    )

    lines.push("R56 FAULT SCAN")
    lines.push("================")
    lines.push(`Faults detected: ${totalFaults}`)
    lines.push("")

    for (const result of results) {
        lines.push(`${result.module.id} - ${result.module.name}`)

        if (!result.responding) {
            lines.push("  No usable response")
            lines.push(`  ${result.error}`)
            lines.push("")
            continue
        }

        if (!result.faultReadSupported) {
            lines.push("  Module responded, but fault-memory read was rejected")
            lines.push(`  ${result.error}`)
            lines.push("")
            continue
        }

        if (result.faults.length === 0) {
            lines.push("  No faults")
            lines.push("")
            continue
        }

        for (const fault of result.faults) {
            lines.push(`  ${fault.code}  status ${fault.statusHex}`)

            if (fault.detail) {
                lines.push(`    detail: ${fault.detail.rawDetailHex || "(none)"}`)
            }

            if (fault.detailError) {
                lines.push(`    detail read failed: ${fault.detailError}`)
            }
        }

        lines.push("")
    }

    return lines.join("\n")
}

initialisePage()
