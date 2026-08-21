export class DiagnosticNegativeResponseError extends Error {
    constructor(service, responseCode) {
        super(
            `ECU rejected service 0x${hexByte(service)} with response code 0x${hexByte(responseCode)}`
        )
        this.name = "DiagnosticNegativeResponseError"
        this.service = service
        this.responseCode = responseCode
    }
}

export function parseFaultList(payload) {
    checkForNegativeResponse(payload)

    if (payload.length < 2 || payload[0] !== 0x58) {
        throw new Error("Unexpected fault-memory response: " + bytesToHex(payload))
    }

    const count = payload[1]
    const requiredLength = 2 + count * 3

    if (payload.length < requiredLength) {
        throw new Error(
            `Fault response says ${count} faults but the payload is too short`
        )
    }

    const faults = []

    for (let i = 0; i < count; i++) {
        const offset = 2 + i * 3
        const codeValue = (payload[offset] << 8) | payload[offset + 1]
        const statusByte = payload[offset + 2]

        faults.push({codeValue, code: codeValue.toString(16).toUpperCase().padStart(4, "0"), ediabasCode: "0x" + codeValue.toString(16).toUpperCase().padStart(6, "0"), statusByte, statusHex: "0x" + hexByte(statusByte), detail: null})
    }

    return faults
}

export function parseFaultDetail(payload) {
    checkForNegativeResponse(payload)

    if (payload.length < 5 || payload[0] !== 0x57) {
        throw new Error("Unexpected fault-detail response: " + bytesToHex(payload))
    }

    const codeValue = (payload[2] << 8) | payload[3]

    return {
        recordCount: payload[1],
        codeValue,
        code: codeValue.toString(16).toUpperCase().padStart(4, "0"),
        statusByte: payload[4],
        statusHex: "0x" + hexByte(payload[4]),
        rawDetailBytes: payload.slice(5),
        rawDetailHex: bytesToHex(payload.slice(5))
    }
}

export function bytesToHex(bytes) {
    return bytes.map(hexByte).join(" ")
}

function checkForNegativeResponse(payload) {
    if (payload.length >= 3 && payload[0] === 0x7F) {
        throw new DiagnosticNegativeResponseError(payload[1], payload[2])
    }
}

function hexByte(value) {
    return Number(value).toString(16).toUpperCase().padStart(2, "0")
}
