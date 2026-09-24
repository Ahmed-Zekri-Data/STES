const path = require('path');

// The .env file lives at the repository root, but the backend is started
// from backend/ (npm start, nodemon, scripts), so dotenv's default
// cwd-relative lookup would never find it.
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
