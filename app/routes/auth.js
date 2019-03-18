var indexController = require('../controllers/index');
var authController = require('../controllers/authcontroller');
var dashboardController = require('../controllers/dashboard');
var timesheetController = require('../controllers/timesheet');
var approvedController = require('../controllers/approved');
var usermodController = require('../controllers/usermod');

module.exports = function (app, passport)
{

    app.get('/', indexController.index);

    app.get('/profile', isLoggedIn, authController.profile);

    app.get('/signin', authController.signin);

    //app.post('/signup', passport.authenticate('local-signup',  { successRedirect: '/dashboard', failureRedirect: '/signup'}));
    app.post('/usermod', isLoggedIn, usermodController.usermod);
    app.get('/usermod', isLoggedIn, usermodController.usermod);
    app.get('/dashboard', isLoggedIn, dashboardController.dashboard);

    app.get('/timesheet', isLoggedIn, timesheetController.timesheet);

    app.get('/logout', authController.logout);

    app.post('/approved', isLoggedIn, approvedController.approved);

    app.post('/signin', passport.authenticate('local-signin', { successRedirect: '/dashboard', failureRedirect: '/signin' }));

    function isLoggedIn(req, res, next)
    {
        if (req.isAuthenticated())
            return next();
        res.redirect('/signin');
    }
};
