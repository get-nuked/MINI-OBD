/*
 * Shared serial connection functions.
 *
 * Each HTML page can use this file to reopen
 * the previously approved OBD adapter.
 */


export async function openApprovedAdapter() {

    if (!("serial" in navigator)) {
        throw new Error(
            "Web Serial is not supported by this browser."
        )
    }


    const ports =
        await navigator.serial.getPorts()


    console.log(
        "Approved serial ports:",
        ports.length
    )


    if (ports.length === 0) {
        throw new Error(
            "No approved OBD adapter found. Return to the setup page and connect your adapter."
        )
    }


    /*
     * Standard Bluetooth Serial Port Profile (SPP).
     *
     * Bluetooth ELM/STN OBD adapters normally expose their
     * RFCOMM serial connection using this service UUID.
     */
    const BLUETOOTH_SPP =
        "00001101-0000-1000-8000-00805f9b34fb"


    /*
     * Print every approved port while developing.
     */
    for (
        let i = 0;
        i < ports.length;
        i++
    ) {

        const info =
            ports[i].getInfo()

        console.log(
            "Port",
            i,
            info
        )
    }


    /*
     * Look specifically for a Bluetooth SPP serial endpoint.
     */
    const sppPorts =
        ports.filter(port => {

            const info =
                port.getInfo()

            return (
                info.bluetoothServiceClassId
                    ?.toLowerCase() ===
                BLUETOOTH_SPP
            )
        })


    console.log(
        "Bluetooth SPP ports found:",
        sppPorts.length
    )


    let port


    if (sppPorts.length === 1) {

        /*
         * Ideal case:
         * exactly one standard Bluetooth serial connection.
         */
        port =
            sppPorts[0]

        console.log(
            "Using Bluetooth SPP OBD port:",
            port.getInfo()
        )

    } else if (
        sppPorts.length === 0 &&
        ports.length === 1
    ) {

        /*
         * Fallback for adapters/browsers which do not expose
         * the Bluetooth service UUID through getInfo().
         */
        port =
            ports[0]

        console.warn(
            "No SPP UUID was exposed. Using the only approved serial port."
        )

    } else if (
        sppPorts.length === 0
    ) {

        throw new Error(
            "Several serial ports are approved, but none expose the standard Bluetooth SPP service."
        )

    } else {

        throw new Error(
            "More than one Bluetooth SPP serial port is approved."
        )
    }


    /*
     * Only open the port if it isn't already open.
     */
    if (
        !port.readable &&
        !port.writable
    ) {

        console.log(
            "Opening selected serial port at 38400..."
        )


        await port.open({
            baudRate: 38400
        })


        /*
         * Give the Bluetooth RFCOMM connection a moment
         * to settle before sending ATI.
         */
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1000
                )
        )
    }


    console.log(
        "Selected serial port opened successfully."
    )


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