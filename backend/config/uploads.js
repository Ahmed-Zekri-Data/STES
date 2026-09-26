const path = require('path');

// Where uploaded files are stored on disk. UPLOAD_PATH may be absolute or
// relative to backend/; the default is backend/uploads (ignored by git).
const uploadRoot = () => path.resolve(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');

module.exports = { uploadRoot };
