/*
 * Shared serial connection functions.
 *
 * Each HTML page can use this file to reopen
 * the previously approved OBD adapter.
 */


export async function openApprovedAdapter() {
    if (!("serial" in navigator)) {
        throw new Error( "Web Serial is not supported by this browser.")
    }

    // Get adapters the user has already approved
    const ports = await navigator.serial.getPorts()

    if (ports.length === 0) {
        throw new Error("No approved OBD adapter found. Return to the setup page and connect your adapter.")
    }

    const port = ports[0]

    /*
     * If readable/writable already exist,
     * the port is already open.
     */
    if (!port.readable && !port.writable) {
        await port.open({ baudRate: 38400 })
    }

    return port
}



export async function closeAdapter(port) {
    if (!port) {
        return
    }

    /*
     * A port cannot close while a reader or
     * writer still has the stream locked.
     */
    if (port.readable?.locked) {
        throw new Error( "Cannot change page while the adapter is reading data.")
    }

    if (port.writable?.locked) {
        throw new Error( "Cannot change page while the adapter is sending data.")
    }

    if (port.readable || port.writable) {
        await port.close()
    }
}