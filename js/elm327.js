export class Elm327 {
    constructor(port) {
        this.port = port
        this.encoder = new TextEncoder()
        this.decoder = new TextDecoder()
        this.receiveBuffer = ""
        this.dataMode = false
    }

    async send(command, timeout = 2000) {
        await this.writeRaw(command + "\r")
        return await this.readUntilPrompt(timeout)
    }

    async writeRaw(text) {
        const writer = this.port.writable.getWriter()
        try {
            await writer.write(this.encoder.encode(text))
        } finally {
            writer.releaseLock()
        }
    }

    async readChunk(timeout = 2000) {
        const reader = this.port.readable.getReader()
        let timer

        try {
            const result = await Promise.race([
                reader.read(),
                new Promise((_, reject) => {
                    timer = setTimeout(async () => {
                        try {
                            await reader.cancel()
                        } catch {}
                        reject(new Error("ELM327 response timeout"))
                    }, timeout)
                })
            ])

            if (result.done) {
                throw new Error("Serial connection closed")
            }

            return this.decoder.decode(result.value, { stream: true })
        } finally {
            clearTimeout(timer)
            try {
                reader.releaseLock()
            } catch {}
        }
    }

    async readUntilPrompt(timeout = 2000) {
        const deadline = Date.now() + timeout

        while (true) {
            const promptIndex = this.receiveBuffer.indexOf(">")

            if (promptIndex !== -1) {
                const response = this.receiveBuffer.slice(0, promptIndex + 1)
                this.receiveBuffer = this.receiveBuffer.slice(promptIndex + 1)
                return response
            }

            const remaining = deadline - Date.now()
            if (remaining <= 0) {
                throw new Error("ELM327 response timeout")
            }

            this.receiveBuffer += await this.readChunk(remaining)
        }
    }

    async readCanLine(timeout = 2000) {
        const deadline = Date.now() + timeout

        while (true) {
            const separatorIndex = this.receiveBuffer.search(/[\r\n]/)

            if (separatorIndex !== -1) {
                const line = this.receiveBuffer.slice(0, separatorIndex).trim()
                this.receiveBuffer = this.receiveBuffer
                    .slice(separatorIndex + 1)
                    .replace(/^[\r\n]+/, "")

                if (line === "") {
                    continue
                }

                return line
            }

            const promptIndex = this.receiveBuffer.indexOf(">")
            if (promptIndex !== -1) {
                const beforePrompt = this.receiveBuffer.slice(0, promptIndex).trim()
                this.receiveBuffer = this.receiveBuffer.slice(promptIndex + 1)
                this.dataMode = false

                if (beforePrompt) {
                    return beforePrompt
                }

                throw new Error("ELM327 returned no CAN data")
            }

            const remaining = deadline - Date.now()
            if (remaining <= 0) {
                throw new Error("Timed out waiting for CAN response")
            }

            this.receiveBuffer += await this.readChunk(remaining)
        }
    }

    async sendCanFrame(bytes, timeout = 3000) {
        const text = bytes.map(byte => byte.toString(16).toUpperCase().padStart(2, "0")).join("")
        await this.writeRaw(text + "\r")
        this.dataMode = true

        const line = await this.readCanLine(timeout)

        if (line === "?" || line.includes("ERROR") || line.includes("NO DATA")) {
            throw new Error("ELM327 CAN error: " + line)
        }

        return line
    }

    async leaveCanDataMode(timeout = 2000) {
        if (!this.dataMode) {
            return
        }

        if (this.receiveBuffer.includes(">")) {
            const promptIndex = this.receiveBuffer.indexOf(">")
            this.receiveBuffer = this.receiveBuffer.slice(promptIndex + 1)
            this.dataMode = false
            return
        }

        await this.writeRaw("    ")

        try {
            await this.readUntilPrompt(timeout)
        } finally {
            this.dataMode = false
        }
    }

    async initialiseForBmw() {
        const requiredCommands = ["ATD", "ATE0", "ATSH6F1", "ATCF600", "ATCM700", "ATPBC001", "ATSPB", "ATAT0", "ATSTFF", "ATAL", "ATH1", "ATS0", "ATL0"]

        for (const command of requiredCommands) {
            const response = await this.send(command)
            console.log(command, response)

            if (response.includes("?") || response.includes("ERROR")) {
                throw new Error(`ELM327 rejected ${command}`)
            }
        }

        const optionalCommands = ["ATCSM0", "ATCTM5", "ATJE"]

        for (const command of optionalCommands) {
            try {
                const response = await this.send(command)
                console.log("Optional:", command, response)
            } catch (error) {
                console.warn("Optional ELM command failed:", command)
            }
        }

        console.log("ELM identification:", await this.send("ATI"))

        try {
            console.log("Device description:", await this.send("AT@1"))
        } catch {}

        try {
            console.log("Manufacturer:", await this.send("AT#1"))
        } catch {}
    }

    async setCanHeader(sourceAddress) {
        const header = 0x600 | sourceAddress
        const headerHex = header.toString(16).toUpperCase().padStart(3, "0")
        const response = await this.send("ATSH" + headerHex)

        if (response.includes("?") || response.includes("ERROR")) {
            throw new Error("Could not set CAN header")
        }
    }
}
