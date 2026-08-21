import {
    R56_MODULES,
    READ_FAULT_MEMORY_REQUEST,
    READ_FAULT_DETAIL_SERVICE
} from "./fault-definition.js"

import {
    DiagnosticNegativeResponseError,
    parseFaultList,
    parseFaultDetail
} from "./fault-parser.js"

export async function scanR56Faults(bmw, onProgress = null) {
    const results = []

    for (const module of R56_MODULES) {
        onProgress?.({ module, state: "scanning" })

        try {
            const payload = await requestWithRetry(
                bmw,
                module.address,
                READ_FAULT_MEMORY_REQUEST
            )

            const faults = parseFaultList(payload)

            for (const fault of faults) {
                try {
                    const detailPayload = await requestWithRetry(
                        bmw,
                        module.address,
                        [
                            READ_FAULT_DETAIL_SERVICE,
                            (fault.codeValue >> 8) & 0xFF,
                            fault.codeValue & 0xFF
                        ]
                    )

                    fault.detail = parseFaultDetail(detailPayload)
                } catch (error) {
                    fault.detailError = error.message
                }
            }

            const result = {
                module,
                responding: true,
                faultReadSupported: true,
                faults
            }

            results.push(result)
            onProgress?.({ module, state: "complete", result })
        } catch (error) {
            const negativeResponse = error instanceof DiagnosticNegativeResponseError

            const result = {
                module,
                responding: negativeResponse,
                faultReadSupported: false,
                faults: [],
                error: error.message,
                negativeResponseCode: negativeResponse ? error.responseCode : null
            }

            results.push(result)
            onProgress?.({ module, state: "failed", result })
        }
    }

    return results
}

async function requestWithRetry(bmw, targetAddress, payload) {
    let lastError = null

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            return await bmw.request(targetAddress, payload)
        } catch (error) {
            if (error instanceof DiagnosticNegativeResponseError) {
                throw error
            }

            lastError = error

            if (attempt < 2) {
                await delay(120)
            }
        }
    }

    throw lastError
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
