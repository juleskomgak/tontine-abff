// Compatibility wrapper: BanqueTontine now maps to BanqueCentrale
// This file exists for backward compatibility with existing code that references BanqueTontine
module.exports = require('./BanqueCentrale');
