const nodemailer = require('nodemailer');
const config = require('../../config');


const gmailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.mail.auth.user,
        pass: config.mail.auth.pass
    }
});


const devTransport = nodemailer.createTransport({

    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
        user: config.mail.auth.user,
        pass: config.mail.auth.pass
    }
});


const transport = config.env === 'production' ? gmailTransport : gmailTransport; // TODO cange for not production for devTransport


const sendmail = (to, subject, content, err) => {

    const mailOptions = {
        to,
        subject,
        text: content,
        from: config.mail.from
    };

    transport.sendMail(mailOptions, err);
};

module.exports = sendmail;
