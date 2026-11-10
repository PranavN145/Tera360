/**
 * Terra360 - Root Server Proxy
 * Directs execution to the primary backend API server under backend/server.js.
 * Web routes (/officer, /field, etc.) are strictly served by the Next.js frontend application.
 */

module.exports = require('./backend/server.js');
