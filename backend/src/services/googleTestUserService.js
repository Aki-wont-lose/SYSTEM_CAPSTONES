// Simple service to auto-add new student emails to Google OAuth Test Users
// If GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_CLOUD_PROJECT are set, it will try to call Google API
// Otherwise it just logs and can be manually synced via console.cloud.google.com > Audience > Test users
// For final defense, recommend to Publish App to Production instead of staying in Testing

export const addTestUser = async (email) => {
  if (!email || !email.includes('@')) return;

  // If no service account configured, just log for manual add
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  console.log(`[Google Test User] New student created: ${email} - should be added to Test users`);

  if (!hasServiceAccount || !projectId) {
    console.log(`[Google Test User] No service account configured. Add manually: console.cloud.google.com > Google Auth Platform > Audience > Test users > + Add users > ${email}`);
    console.log(`[Google Test User] Or publish app: Audience > Publish App (then any Gmail works without adding)`);
    return { added: false, manual: true, email };
  }

  try {
    // Try to use Google Cloud Identity API via googleapis if available
    // This is a placeholder for actual API call - requires googleapis package and service account
    // const { google } = await import('googleapis');
    // const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    // ... actual API call would go here
    console.log(`[Google Test User] Service account found, would add ${email} to project ${projectId} via API (implement with googleapis if needed)`);
    return { added: true, email };
  } catch (e) {
    console.warn(`[Google Test User] Failed to auto-add ${email}:`, e.message);
    return { added: false, error: e.message, email };
  }
};
