var exports = module.exports = {};
var sql = require('mysql');
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];
const sendEmail = require('../controllers/sendEmail');
var bCrypt = require('bcrypt-nodejs');
var con = sql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
});

var pword;
var generateHash = function (password)
{
    return bCrypt.hashSync(password, bCrypt.genSaltSync(8), null);
};
exports.usermod = async function (req, res)
{
    var query = require('url').parse(req.url, true).query;
    if (query.action === "new")
    {
        pword = generateHash(req.body.password);
        await addNewUser(req, pword).catch(function (e) { console.log(e); });
        sendEmail.sendMSG(
            req.body.email,
            'Welcome to the MIT timesheets system!',
            'mailUser',
            {
                name: req.body.firstname + ' ' + req.body.lastname,
                Email: req.body.email,
                Welcome: true,
                changePW: true,
                Password: req.body.password
            });
        res.redirect("/Dashboard");
    }
    if (query.action === "edit")
    {
        pword = generateHash(req.body.password);
        await editUser(req, pword, query).catch(function (e) { console.log(e); });
        sendEmail.sendMSG(
            req.body.email,
            'Your details were updated!',
            'mailUser',
            {
                name: req.body.firstname + ' ' + req.body.lastname,
                Email: req.body.email,
                changePW: req.body.resetPW,
                Password: req.body.password
            });
        res.redirect("/Dashboard");
    }
    if (query.action === "add")
    {
        await addClient(req, query).catch(function (e) { console.log(e); });
        res.redirect("back");
    }
    if (query.action === "rem")
    {
        await remClient(req, query).catch(function (e) { console.log(e); });
        res.redirect("back");
    }
};

async function addNewUser(req, password)
{
    return new Promise((resolve, reject) =>
    {
        if (req.user.admin)
        {
            var adminState = 0;
            if (req.body.admin === "on")
                adminState = 1;
            var queryString = 'Insert Into users (firstname, lastname, username, email, password, status, admin, createdAt) Values ("' + req.body.firstname + '","' + req.body.lastname + '","' + req.body.email + '","' + req.body.email + '","' + password + '","' + 'ACTIVE' + '",' + adminState + ',"' + new Date().toISOString() + '")';
            con.query(queryString, function (err, rows)
            {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        }
        else
            reject("Not an admin");
    });
}

async function editUser(req, password, query)
{
    return new Promise((resolve, reject) =>
    {
        var usr = req.user.id;
        var adminState = 0;
        if (req.body.admin === "on")
            adminState = 1;
        var adminCheck = "";
        if (req.user.admin)
        {
            adminCheck = 'admin = ' + adminState + ', ';
            if (query.user !== null)
                usr = query.user;
        }
        pwCheck = "";
        if (req.body.resetPW)
            pwCheck = 'password = "' + password + '", ';
        var queryString = 'Update users Set firstname="' + req.body.firstname + '", lastname="' + req.body.lastname + '", username="' + req.body.email + '", email="' + req.body.email + '", ' + pwCheck + 'status="' + 'ACTIVE' + '", ' + adminCheck + 'updatedAt = "' + new Date().toISOString() + '" Where id = ' + usr;
        con.query(queryString, function (err, rows)
        {
        if (err)
            reject(err);
        else
            resolve(rows);
        });
    });
}

async function addClient(req, query)
{
    return new Promise((resolve, reject) =>
    {
        if (req.user.admin)
        {
            var adminState = 0;
            if (req.body.admin === "on")
                adminState = 1;
            var queryString = 'Insert Into allowedclients (client, user) Values ("' + req.body.client + '","' + query.user + '")';
            con.query(queryString, function (err, rows)
            {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        }
        else
            reject("Not an admin");
    });
}

async function remClient(req, query)
{
    return new Promise((resolve, reject) =>
    {
        if (req.user.admin)
        {
            var adminState = 0;
            var queryString = 'Delete From allowedclients Where client=' + query.client + ' AND user=' + query.user;
            console.log(query.user);
            con.query(queryString, function (err, rows)
            {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        }
        else
            reject("Not an admin");
    });
}