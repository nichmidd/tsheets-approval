var exports = module.exports = {};
var sql = require('mysql');
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];

exports.timesheet = function (req, res)
{
    var query = require('url').parse(req.url, true).query;
    var date = new Date(query.date);
    date.setHours(0);
    var client = query.client;

    var con = sql.createConnection({
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database
    });

    let AsyncTest = new Promise((resolve, reject) =>
    {

        var j = 0;
        for (var i = 0; i < 4; i++)
        {
            j = i;
        }
        resolve(i);
    });

    //Taking advantage of SQL inbuilt timezone functionality reduces clientside load and improves page load speed.
    //Sub querying allows us to have less queries, improving speed and reducing error likelyhood and improving code cleanliness.
    //behold, the power and simplicity of promises!!!
        let FetchTS = new Promise((resolve, reject) =>
        {
            var nuDate = new Date(date);
            nuDate.setDate(date.getDate() - 7);
            var nuistDate = new Date(date);
            nuistDate.setDate(date.getDate() - 14);
            var queryString =
                "select t.id, "
                + "DATE_FORMAT(Convert_TZ(t.start,'UTC','Australia/Canberra'), '%Y-%m-%d') as day, "
                + "DATE_FORMAT(Convert_TZ(t.start,'UTC','Australia/Canberra'), '%H:%i') as start, "
                + "DATE_FORMAT(Convert_TZ(t.end,'UTC','Australia/Canberra'), '%H:%i') as end, "
                + "t.duration, co.fn, co.ln, cl.name, "
                + "(Select SUM(t1.duration) From timesheets t1 Where t1.day < '" + date.toISOString() + "' AND t1.day > '" + nuDate.toISOString() + "' AND t1.client = t.client) AS totalA, "
                + "(Select SUM(t2.duration) From timesheets t2 Where t2.day < '" + nuDate.toISOString() + "' AND t2.day > '" + nuistDate.toISOString() + "' AND t2.client = t.client) AS totalB, "
                + "(Select COUNT(t3.Approved) From timesheets t3 Where t3.Approved = 0 AND t3.day < '" + date.toISOString() + "' AND t3.day > '" + nuDate.toISOString() + "' AND t3.client = t.client) AS ApprovedA, "
                + "(Select COUNT(t4.Approved) From timesheets t4 Where t4.Approved = 0 AND t4.day < '" + nuDate.toISOString() + "' AND t4.day > '" + nuistDate.toISOString() + "' AND t4.client = t.client) AS ApprovedB "
                + "FROM timesheets t INNER JOIN clients cl ON t.client = cl.id INNER JOIN contractors co ON t.contractor = co.id "
                + "WHERE t.day < '" + date.toISOString() + "' AND t.day > '" + nuistDate.toISOString() + "' AND t.client = " + client
                + " GROUP BY id, day, start, end, fn ORDER BY day, start, end;";
            //console.log(queryString);
            con.query(queryString, null, function (err, rows)
            {
                if (err)
                {
                    console.log("FetchTS failed: " + err);
                    reject(err);
                } else
                {
                    console.dir(rows);
                    resolve(rows);
                }
            });
        });
    //It is theoretically possible to merge this with the other query, making a single super query, 
    //Negating the need for all this JS code, but it'd make the former even messier.
        let FetchAD = new Promise((resolve, reject) =>
        {
            var nuDate = new Date(date);
            nuDate.setDate(date.getDate() - 7);
            var nuistDate = new Date(date);
            nuistDate.setDate(date.getDate() - 14);
            var queryString = "select approvalDate FROM Approvals WHERE weekEnding <= '" + date.toISOString() + "' AND weekEnding >= '" + nuistDate.toISOString() + "' AND client = " + client + " AND user = " + req.user.id;
            console.log(queryString);
            con.query(queryString, null, async function (err, rows)
            {

                if (err)
                {
                    console.log("FetchAD failed: " + err);
                    reject(err);
                } else
                {
                    //This loop can be replaced using array find
                    if (rows.length > 0)
                    {
                        resolve(rows);
                    }
                    else
                    {
                        //console.log("rows returned a null value")
                        //console.dir(rows);
                        resolve(null);
                    }
                }
            });
        });

    function PassToPage(Content, SlicerInt, Total, TotalB, WeekApproval, FortApproval)
    {
        console.log("weekApproval = " + WeekApproval + ", fortApproval = " + FortApproval);
        var newDate = new Date(date);
        var FortTotal = Total + TotalB;
        newDate.setDate(date.getDate() - 7);
        res.render('timesheet', {
            title: Content[0].name,
            timesheetsB: Content.slice(0, SlicerInt),
            timesheets: Content.slice(SlicerInt),
            total: Total.toFixed(2),
            totalB: TotalB,
            fortTotal: FortTotal,
            Cdate: date.toISOString().slice(0, 10),
            weekApproval: WeekApproval,
            fortApproval: FortApproval,
            Client: client,
            Pdate: newDate.toISOString().slice(0, 10),
            email: req.user.email,
            SerializedContent: JSON.stringify(Content.slice(SlicerInt)),
            SerializedContentB: JSON.stringify(Content.slice(0, SlicerInt))
        });
    }

    AsyncTest.then((successval) =>
    {
        console.log(successval);
    });

    Promise.all([FetchTS, FetchAD]).then(values =>
    {
        var newDate = new Date(date);
        newDate.setDate(date.getDate() - 7);
        var content = values[0];
        var approval = values[1];
        var WeekApproval = "Not Approved";
        var FortApproval = "Not Approved";
        var ConB = (content[0].totalB === null) ? 0 : content[0].totalB;
        if (approval !== null)
        {
            if (content[0].ApprovedA === 0)
            {
                
                WeekApproval = "Approved on " + approval[0].approvalDate.toISOString().slice(0, 10);
                if (ConB > 0 && content[0].ApprovedB === 0)
                {
                    FortApproval = "Approved on " + approval[0].approvalDate.toISOString().slice(0, 10);
                }
            }

        }
        var totalhours = 0;
        //array find could make this faster.
        if (ConB > 0)
        {
            var i;
            for (i = 0; i < content.length; i++)
            {
                var ImpulsedDate = new Date(content[i].day + ' ' + content[i].start);
                //console.log("Impulse Date = " + ImpulsedDate + " NewDate = " + newDate);
                if (ImpulsedDate >= newDate)
                {
                    totalhours = content[0].totalA;
                    var Btotalhours = ConB;
                    PassToPage(content, i, totalhours, Btotalhours, WeekApproval, FortApproval);
                    break;
                }
                if (i === content.length - 1)
                {
                    totalhours = content[0].totalA;
                    PassToPage(content, 0, totalhours, 0, WeekApproval, FortApproval);
                }
            }
        }
        else
        {
            totalhours = content[0].totalA;
            PassToPage(content, 0, totalhours, 0, WeekApproval, FortApproval);
        }
    }).catch((err) =>
    {
        console.log(err);
        });
}