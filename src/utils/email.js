// Placeholder email module - emails are disabled for now
export const sendVerificationEmail = async (email, token) => {
  console.log('📧 [Email Disabled] Verification email would be sent to:', email);
  return { success: true };
};

export const sendPasswordResetEmail = async (email, token) => {
  console.log('📧 [Email Disabled] Password reset email would be sent to:', email);
  return { success: true };
};