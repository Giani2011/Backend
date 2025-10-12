// placeholder email helper. Swap in nodemailer or any provider later.
async function sendEmail(to, subject, text) {
  console.log('sendEmail called', { to, subject, text });
  // IMPLEMENTATION: use nodemailer / SendGrid / SES in production
}
module.exports = { sendEmail };
