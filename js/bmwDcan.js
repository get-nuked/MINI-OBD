export class BmwDcan {
    constructor(elm) {
        this.elm = elm
        this.testerAddress = 0xF1
        this.flowControlBlockSize = 3
        this.flowControlSeparationTime = 0
    }

    async initialise() {
        await this.elm.setCanHeader(this.testerAddress)
    }

    async request(targetAddress, payload) {
        if (payload.length > 6) {
            throw new Error("Multi-frame BMW requests are not implemented yet.")
        }

        const requestFrame = new Array(8).fill(0)
        requestFrame[0] = targetAddress
        requestFrame[1] = payload.length

        payload.forEach((byte, index) => {
            requestFrame[index + 2] = byte
        })

        try {
            const firstLine = await this.elm.sendCanFrame(requestFrame)
            return await this.receiveResponse(targetAddress, firstLine)
        } finally {
            try {
                await this.elm.leaveCanDataMode()
            } catch (error) {
                console.warn("Could not leave ELM CAN data mode:", error)
            }
        }
    }

    async receiveResponse(targetAddress, firstLine) {
        const expectedCanId = 0x600 | targetAddress
        const firstFrame = await this.parseExpectedFrame(firstLine, expectedCanId)
        const bytes = firstFrame.bytes

        if (bytes.length < 2) {
            throw new Error("BMW CAN response is too short")
        }

        if (bytes[0] !== this.testerAddress) {
            throw new Error("BMW response was not addressed to the diagnostic tester")
        }

        const frameType = (bytes[1] >> 4) & 0x0F

        if (frameType === 0) {
            const payloadLength = bytes[1] & 0x0F
            return bytes.slice(2, 2 + payloadLength)
        }

        if (frameType !== 1) {
            throw new Error(`Unexpected first ISO-TP frame type: ${frameType}`)
        }

        if (bytes.length < 8) {
            throw new Error("BMW ISO-TP first frame is incomplete")
        }

        const totalLength = ((bytes[1] & 0x0F) << 8) | bytes[2]
        const response = bytes.slice(3, 8)
        let expectedSequence = 1

        await this.elm.leaveCanDataMode()

        while (response.length < totalLength) {
            const remainingBytes = totalLength - response.length
            const framesThisBlock = Math.min(
                this.flowControlBlockSize,
                Math.ceil(remainingBytes / 6)
            )

            const flowControlFrame = new Array(8).fill(0)
            flowControlFrame[0] = targetAddress
            flowControlFrame[1] = 0x30
            flowControlFrame[2] = this.flowControlBlockSize
            flowControlFrame[3] = this.flowControlSeparationTime

            let line = await this.elm.sendCanFrame(flowControlFrame)

            for (let i = 0; i < framesThisBlock; i++) {
                if (i > 0) {
                    line = await this.elm.readCanLine(3000)
                }

                const frame = await this.parseExpectedFrame(line, expectedCanId)
                const frameBytes = frame.bytes

                if (frameBytes.length < 2 || frameBytes[0] !== this.testerAddress) {
                    throw new Error("Invalid BMW consecutive frame")
                }

                const frameTypeCf = (frameBytes[1] >> 4) & 0x0F
                const sequence = frameBytes[1] & 0x0F

                if (frameTypeCf !== 2) {
                    throw new Error(`Expected consecutive frame, got type ${frameTypeCf}`)
                }

                if (sequence !== (expectedSequence & 0x0F)) {
                    throw new Error(
                        `BMW ISO-TP sequence mismatch. Expected ${expectedSequence & 0x0F}, got ${sequence}`
                    )
                }

                expectedSequence++
                response.push(...frameBytes.slice(2, 8))

                if (response.length >= totalLength) {
                    break
                }
            }

            if (response.length < totalLength) {
                await this.elm.leaveCanDataMode()
            }
        }

        return response.slice(0, totalLength)
    }

    async parseExpectedFrame(line, expectedCanId) {
        const cleaned = line.replace(/\s+/g, "").toUpperCase()

        if (cleaned === "?" || cleaned.includes("NODATA") || cleaned.includes("ERROR")) {
            throw new Error("ELM327 CAN error: " + line)
        }

        if (!/^[0-9A-F]{5,19}$/.test(cleaned) || cleaned.length % 2 !== 1) {
            throw new Error("Invalid CAN frame from ELM327: " + line)
        }

        const canId = parseInt(cleaned.slice(0, 3), 16)
        const bytes = []

        for (let i = 3; i < cleaned.length; i += 2) {
            bytes.push(parseInt(cleaned.slice(i, i + 2), 16))
        }

        if (canId !== expectedCanId) {
            throw new Error(
                `Unexpected CAN ID 0x${canId.toString(16).toUpperCase()}; expected 0x${expectedCanId.toString(16).toUpperCase()}`
            )
        }

        return { canId, bytes, raw: line }
    }
}
