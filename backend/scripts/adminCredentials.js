// Reads the first admin account's credentials from .env (DEFAULT_ADMIN_*),
// refusing to continue with a missing, placeholder or short password.
const WEAK_PASSWORDS = ['change-me', 'admin123456', 'admin12345'];
const MIN_PASSWORD_LENGTH = 12;

const adminCredentials = () => {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  const problems = [];
  if (!email) {
    problems.push('DEFAULT_ADMIN_EMAIL is not set.');
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH || WEAK_PASSWORDS.includes(password)) {
    problems.push(`DEFAULT_ADMIN_PASSWORD must be a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (problems.length > 0) {
    console.error('❌ Admin credentials are not configured:');
    problems.forEach(problem => console.error(`   - ${problem}`));
    console.error('   Set them in the .env file at the repository root.');
    process.exit(1);
  }

  return { username, email, password };
};

module.exports = adminCredentials;
