const app = require('./app') // the actual Express application
const config = require('./utils/config.js')
const logger = require('./utils/logger')

app.listen(config.PORT, config.IP_ADDRESS || "localhost", () => {
  logger.info(`Server running on port ${config.PORT}`)
})