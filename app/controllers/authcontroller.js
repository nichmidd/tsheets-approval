var exports = module.exports = {};
var sql = require('mysql');
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];
var con = sql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
});

async function findUserDeets(usr)
{
    return new Promise((resolve, reject) =>
    {
        var queryString = "Select * from users where id = " + usr;
        con.query(queryString, function (err, rows)
        {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}

async function findAllowedClients(usr)
{
    return new Promise((resolve, reject) =>
    {
        var queryString = "Select a.client As ClientID, c.name As ClientName From allowedclients a Left Join clients c On c.id = a.client Where user = " + usr;
        con.query(queryString, function (err, rows)
        {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}

async function findClients()
{
    return new Promise((resolve, reject) =>
    {
        var queryString = "Select * from clients";
        con.query(queryString, function (err, rows)
        {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}

exports.profile = async function (req, res)
{
    
    var query = require('url').parse(req.url, true).query;
    console.log(query.user);
    console.log(query);
    if (req.user.admin && query.action === "new")
        res.render('profile', { action: "new", admin: true });
    else if (query.action === "edit")
    {
        var usr = req.user.id;
        var queries = [];
        if (req.user.admin)
        {
            if (query.user !== "null")
            {
                usr = query.user;
                console.log("For some reason user is not null? + " + query.user);
            }
            queries = [findUserDeets(usr), findClients(), findAllowedClients(usr)];
        }
        else
            queries = [findUserDeets(usr), findAllowedClients(usr)];
        console.log(usr);
        Promise.all(queries).then(values =>
        {

            if (values.length === 2)
                res.render('profile', { action: "edit", id: usr, email: values[0][0].email, firstname: values[0][0].firstname, lastname: values[0][0].lastname, USRclients: values[1] });
            else
            {
                console.dir(values[2]);
                res.render('profile', { action: "edit", id: usr, email: values[0][0].email, firstname: values[0][0].firstname, lastname: values[0][0].lastname, admin: true, usrAdmin: values[0][0].admin, USRclients: values[2], clients: values[1] });
            }
        }).catch(err =>
        {
            console.log(err);
        });
    }
};

exports.signin = function (req, res)
{
    res.render('signin');
};

exports.logout = function (req, res)
{
    req.session.destroy(function (err)
    {
        res.redirect('/');
    });
};