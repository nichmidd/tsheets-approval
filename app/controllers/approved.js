var exports = module.exports = {};
var sql = require('mysql');
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];
const sendEmail = require('../controllers/sendEmail');
//send mail with options
exports.approved = function (req, res)
{
    console.log("approved body reached");
    var query = require('url').parse(req.url, true).query;
    var date = query.date;
    var time = query.time;
    var client = query.client;
    var Pdate = query.Pdate;
    var Ptime = query.Ptime;

    var con = sql.createConnection({
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database
    });

    async function checkUserAccess(c)
    {
        var queryString = "select client from allowedclients where user = " + req.user.id + " and client =" +c;
        var filter = c;
        return new Promise((resolve, reject) =>
        {
            con.query(queryString, filter, function (err, rows)
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    if (rows === null)
                    {
                        console.dir(rows);
                        resolve(false);
                    }
                    else
                    {
                        console.dir(rows);
                        resolve(true);
                    }
                }
            });
        });
        

    }

    async function approveTimesheet(d, t, c, u, AD)
    {
        var queryString = "insert into Approvals values (?, ?, ?, ?, ?)";
        var filter = [d, t, c, u, AD];
        return new Promise((resolve, reject) =>
        {
            con.query(queryString, filter, function (err)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(true);
                }
            });
        });
    }

    async function flagTimesheets(d, c)
    {
        var locDate = new Date(d);
        var nuDate = new Date(d);
        nuDate.setDate(locDate.getDate() - 7);
        var queryString = 'Update timesheets Set Approved=1 Where day > "' + nuDate.toISOString() + '" And day < "' + locDate.toISOString() + '" And client = ' + c;
        console.log(queryString);
        return new Promise((resolve, reject) =>
        {
            con.query(queryString, function (err)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(true);
                }
            });
        });
    }

    async function MainFunc()
    {
        console.log(req.body.Content);
        if (Ptime > 0)
        {
            sendEmail.sendMSG(
                req.user.email,
                'Timesheet Approved!',
                'mailTS',
                {
                    Cdate: date,
                    timesheets: JSON.parse(req.body.Content),
                    timesheetsB: JSON.parse(req.body.ContentB),
                    total: time,
                    totalB: Ptime,
                    fortTotal: time + Ptime
                });
        }
        else
        {
            sendEmail.sendMSG(
                req.user.email,
                'Timesheet Approved!',
                'mailTS',
                {
                    Cdate: date,
                    timesheets: JSON.parse(req.body.Content),
                    total: time
                });
        }
        var IsAvail = await checkUserAccess(client);
        console.log("Is Client Available to User? " + IsAvail + ", Client is: " + client + ", User is: " + req.user.id);
        if (IsAvail)
        {
            console.log("Client Access Granted");
            var TSFuncs = [approveTimesheet(date, time, client, req.user.id, new Date()), flagTimesheets(date,client)];
            if (Pdate !== "")
            {
                TSFuncs.push(approveTimesheet(Pdate, Ptime, client, req.user.id, new Date()));
                TSFuncs.push(flagTimesheets(Pdate, client));
            }
            Promise.all(TSFuncs).then(values =>
            {
                console.log("Should be approved");
                res.render('approved');
            }).catch(err =>
            {
                console.log(TSFuncs);
                console.log(err);
                res.redirect('dashboard');
            });
        }
        else
        {
            console.log("Client Access Denied");
            res.redirect('dashboard');
        }
    }
    MainFunc();
};