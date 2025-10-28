// To run this script:
// 1. Make sure you have firebase-admin installed: npm install
// 2. Have your 'serviceAccountKey.json' in the root directory.
// 3. Run the script with user email and role as arguments:
//    node js/set-role.js user@example.com diretoria

const admin = require('firebase-admin');

try {
    const serviceAccount = require('../firebase-admin-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK.');
    console.error('Please make sure you have a valid \'serviceAccountKey.json\' in the root directory.');
    process.exit(1);
}

const [,, email, roleArg] = process.argv;

if (!email || !roleArg) {
    console.log("Usage: node js/set-role.js <email> <role>");
    console.log("Available roles: diretoria, superintendencia, gerencia_regional, comercial, operacional");
    process.exit(1);
}

// Sanitize the role argument aggressively to remove anything other than letters and underscores
const role = roleArg.trim().replace(/[^a-z_]/g, '');

const validRoles = ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional'];
if (!validRoles.includes(role)) {
    console.error(`Invalid role: ${role}.`);
    console.log("Available roles:", validRoles.join(', '));
    process.exit(1);
}

async function setCustomUserRole() {
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { role: role });
        console.log(`Successfully set role '${role}' for user ${email}`);
    } catch (error) {
        console.error(`Error setting custom role:`, error);
    }
    process.exit(0);
}

setCustomUserRole();
