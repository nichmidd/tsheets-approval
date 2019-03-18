var path = require("path");
var env = require('dotenv').load();
var config = require(path.join(__dirname, '/app/config/config.json'));
console.log(path.join(__dirname, '/app/config/config.json'));
var express = require('express');
var app = express();
var passport = require('passport');
var session = require('express-session');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');

    //For BodyParser
    app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
    //For Passport
    app.use(session({ secret: config.auth.secret ,resave: true, saveUninitialized:true})); // CHANGEME - change to something better
    app.use(passport.initialize());
    app.use(passport.session()); // FIXME - needs to be non-memory session cache

     //For Handlebars
var hbs = exphbs.create(
    {
        helpers: {
            is: function (arg1, arg2, options)
            {
                return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
            }
        },
        extname: '.hbs'
    }
);
app.set('views', './app/views');
    app.engine('hbs', hbs.engine);
    app.set('view engine', '.hbs');
app.use("/styles", express.static("./app/stylesheets"));
app.use("/img", express.static("./app/img"));

	//Models
    var models = require("./app/models");

    //Routes
    var authRoute = require('./app/routes/auth.js')(app,passport);

    //load passport strategies
    require('./app/config/passport/passport.js')(passport,models.user);

    //Sync Database
    models.sequelize.sync().then(function(){
        console.log('Nice! Database looks fine');

    }).catch(function(err){
        console.log(err, "Something went wrong with the Database Update!");
    });

	app.listen(5000, 'localhost', function(err){
        if (!err)
            console.log("Site is live"); else console.log(err);

	});