var exports = module.exports = {};
var sql = require('mysql');
var path = require("path");
var env = process.env.NODE_ENV || "development";
//Load the DB config
var config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];

//Figure out when last Sunday was - timesheets are show as week ending Sunday
function getSunday(d) {
    d = new Date(d);
    d.setHours(0); d.setMinutes(0); d.setSeconds(0);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -7 : 0); // adjust when day is sunday
    return new Date(d.setDate(diff));
}
//depreciated by ECP5 Date.toISOstring();
function date2str(x, y) {
    var z = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    };
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function (v) {
        return ((v.length > 1 ? "0" : "") + eval('z.' + v.slice(-1))).slice(-2);
    });
    return y.replace(/(y+)/g, function (v) {
        return x.getFullYear().toString().slice(-v.length);
    });
}
//depreciated by ECP6 setDate
function dateAdd(date, interval, units) {
        var ret = new Date(date); //don't change original date
        var checkRollover = function () { if (ret.getDate() !== date.getDate()) ret.setDate(0); };
        switch (interval.toLowerCase()) {
            case 'year': ret.setFullYear(ret.getFullYear() + units); checkRollover(); break;
            case 'quarter': ret.setMonth(ret.getMonth() + 3 * units); checkRollover(); break;
            case 'month': ret.setMonth(ret.getMonth() + units); checkRollover(); break;
            case 'week': ret.setDate(ret.getDate() + 7 * units); break;
            case 'day': ret.setDate(ret.getDate() + units); break;
            case 'hour': ret.setTime(ret.getTime() + units * 3600000); break;
            case 'minute': ret.setTime(ret.getTime() + units * 60000); break;
            case 'second': ret.setTime(ret.getTime() + units * 1000); break;
            default: ret = undefined; break;
        }
        return ret;
    }
//big me-me
today = date2str(new Date(), 'yyyy-MM-dd');
startDate = getSunday(new Date());
var dateArray = [];
var i = 1;
if (today === date2str(startDate, 'yyyy-MM-dd')) {
    i = 0;
} else {
    dateArray.push({ date: date2str(startDate, 'yyyy-MM-dd'), IsLink: false });
}
for (i; i < 6; i++) {
    startDate.setDate(startDate.getDate() - 7);
    dateArray.push({ date: date2str(startDate, 'yyyy-MM-dd'), IsLink: false });
}

//Connect to DB
exports.dashboard = function (req, res)
{
    var con = sql.createConnection({
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database
    });

    //This returns the list of clients the user can see timesheets for as well as their name
    async function fetchAllowedClients(data)
    {
        return new Promise((resolve, reject) =>
        {
            con.query("select a.client, c.name from allowedclients a inner join clients c on a.client = c.id where a.user = ?", data, function (err, rows)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(rows);
                }
            });
        });
    }

    async function fetchDates(data)
    {
        return new Promise((resolve, reject) =>
        {
            con.query("SELECT DATE_FORMAT(t.day, '%Y-%m-%d') as day, t.duration FROM timesheets t WHERE (t.day BETWEEN DATE_SUB(CURDATE() , INTERVAL 42 DAY) AND CURDATE()) AND t.client = ? ORDER BY t.day ASC", data, function (err, rows)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(rows);
                }
            });
        });
    }

    async function fetchUsers()
    {
        return new Promise((resolve, reject) =>
        {
            con.query("SELECT u.firstname, u.lastname, u.email, u.id, u.status, u.admin FROM users u", null, function (err, rows)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(rows);
                }
            });
        });
    }

    async function UsrFunc()
    {
            if (req.user.admin)
            {
                var rows = await fetchUsers(null).catch((err) => { throw err; });
                return rows;
            }
            else
            {
                return null;
            }
    }
    async function MainFunc()
    {
        var clients = await fetchAllowedClients(req.user.id).catch((err) => { console.log(err); });
        var ClientPrp = [];
        for (var i = 0; i < clients.length; i++)
        {
            var dates = await fetchDates(clients[i].client).catch((err) => { console.log(err); });
            ClientPrp.push({ name: clients[i].name, client: clients[i].client, dateTS: [] });
            ClientPrp[i].dateTS = JSON.parse(JSON.stringify(dateArray));
            var PrevSun = ClientPrp[i].dateTS.length - 1;
            for (var k = 0; k < dates.length; k++)
            {
                if (PrevSun < 0)
                {
                    break;
                }
                var thisDate = new Date(dates[k].day);
                thisDate = date2str(getSunday(thisDate), 'yyyy-MM-dd');
                var NPrevDate = new Date(ClientPrp[i].dateTS[PrevSun].date);
                var PrevDate = new Date(ClientPrp[i].dateTS[PrevSun].date);
                PrevDate.setDate(NPrevDate.getDate() - 7);
                if (new Date(thisDate) >= PrevDate && dates[k].duration > 0)
                {

                    if (thisDate === PrevDate.toISOString().slice(0, 10))
                    {
                        ClientPrp[i].dateTS[PrevSun].IsLink = true;
                    }
                    PrevSun--;
                }
            }
            if (i === clients.length - 1)
            {
                return ClientPrp;
            }
        }
    }

    Promise.all([MainFunc(), UsrFunc()]).then((values) =>
    {
        res.render('dashboard', {
            name: req.user.firstname + " " + req.user.lastname,
            client: values[0],
            users: values[1]
        });
    }).catch((err) =>
    {
        console.log(err);
    });
};