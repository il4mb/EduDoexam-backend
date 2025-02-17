const info = (...params: any[]) => console.info(...params)
const error = (...params: any[]) => console.error(...params)
const warning = (...params: any[]) => console.warn(...params)
const debug = (...params: any[]) => console.debug(...params)
const log = (...params: any[]) => console.log(...params)

export {
    info, error, warning, debug, log
}