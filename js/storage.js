function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MiniOBD", 1)

        request.onupgradeneeded = () => {
            const database = request.result

            if (!database.objectStoreNames.contains("state")) {
                database.createObjectStore("state")
            }
        }

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}


export async function saveLogFileHandle(logFile) {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("state", "readwrite")
        const store = transaction.objectStore("state")

        store.put(logFile, "logFile")

        transaction.oncomplete = () => {
            resolve()
        }

        transaction.onerror = () => {
            reject(transaction.error)
        }
    })
}


export async function getLogFileHandle() {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("state", "readonly")
        const store = transaction.objectStore("state")
        const request = store.get("logFile")

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}