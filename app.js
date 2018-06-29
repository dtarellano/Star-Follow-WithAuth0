const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const flash = require('connect-flash');
const request = require('request');
const axios = require('axios');

dotenv.load();

const routes = require('./routes/index');
const user = require('./routes/user');

// This will configure Passport to use Auth0
const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    let options = {
      method: 'POST',
      url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      headers: { 'content-type': 'application/json' },
      body: {
        grant_type: 'client_credentials',
        client_id: process.env.API_CLIENT,
        client_secret: process.env.API_CLIENT_SECRET,
        audience: `https:/${process.env.AUTH0_DOMAIN}/api/v2/`
      },
      json: true
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      let access_token = body.access_token;

      let options = {
        method: 'GET',
        url: `https://${proccess.env.AUTH0_DOMAIN}/api/v2/users/${profile.id}`,
        headers: { authorization: `Bearer ${access_token}` }
      };
      request(options, function(error, response, body) {
        if (error) throw new Error(error);

        const token = JSON.parse(body).identities[0].access_token;
        const user = 'USER_OF_REPO';
        const repo = 'REPO_OF_USER';
        // STAR A REPO
        axios
          .put(
            `https://api.github.com/user/starred/${user}/${repo}`,
            {},
            {
              headers: {
                Authorization: `token ${token}`
              }
            }
          )
          .then((data, reject) => {
            console.log('SUCCESS!!!!', data);
          })
          .catch(err => console.log('ERROR: ', err));

        // FOLLOW A USER
        const follow = 'USER_TO_FOLLOW';
        axios
          .put(
            `https://api.github.com/user/following/${follow}`,
            {},
            {
              headers: {
                Authorization: `token ${token}`
              }
            }
          )
          .then((data, reject) => {
            console.log('FOLLOWED!!!: ', data);
          })
          .catch(err => console.log('ERROR: ', err));
      });
    });
    return done(null, profile);
  }
);

passport.use(strategy);

// you can use this section to keep a smaller payload
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    secret: 'shhhhhhhhh',
    resave: true,
    saveUninitialized: true
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());

// Handle auth failure error messages
app.use(function(req, res, next) {
  if (req && req.query && req.query.error) {
    req.flash('error', req.query.error);
  }
  if (req && req.query && req.query.error_description) {
    req.flash('error_description', req.query.error_description);
  }
  next();
});

// Check logged in
app.use(function(req, res, next) {
  res.locals.loggedIn = false;
  if (req.session.passport && typeof req.session.passport.user != 'undefined') {
    res.locals.loggedIn = true;
  }
  next();
});

app.use('/', routes);
app.use('/user', user);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
