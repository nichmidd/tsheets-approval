var path = require("path");
var config = require(path.join(__dirname, '..', 'config', 'config.json'));
var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var mailgunTransport = require('nodemailer-mailgun-transport');

var auth =
{
    auth:
    {
        api_key: config.auth.api_key,
        domain: config.auth.domain
    }
};

var options = {
    viewEngine: {
        extname: '.hbs',
        layoutsDir: 'app/views',
        defaultLayout: 'mailTS',
        partialsDir: 'app/views'
    },
    viewPath: 'app/views',
    extName: '.hbs'
};

class sendEmail
{
    sendMSG(To, Subject, Template, Context)
    {
        var transporter = nodemailer.createTransport(mailgunTransport(auth));
        transporter.use('compile', hbs(options));
        transporter.sendMail({
            from: 'noreply@mitservices.com.au',
            to: To,
            subject: Subject,
            template: Template,
            context: Context
        }, function (error, response)
            {
                console.log('mail sent to ' + To);
                console.log(error);
                console.log(response);
                transporter.close();
            });
    }
}

module.exports = new sendEmail();