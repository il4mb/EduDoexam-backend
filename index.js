#!/usr/bin/env node
import app from './dist/app.js'
import { info } from './dist/utils/logger.js'

app.listen(process.env.PORT, () => {
  info(`Server running on port ${process.env.PORT}`)
})