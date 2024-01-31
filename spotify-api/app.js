var express = require("express");
var request = require("request");
var crypto = require("crypto");
var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

var client_id = "965df5cc1fdc42ceac8bbb22e34360cf";
var client_secret = "ee540ed6fc8e4e22ac94696350912149";
var redirect_uri = "http://localhost:8888/callback";

const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString("hex").slice(0, length);
};

var stateKey = "spotify_auth_state";

var app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  var scope = "user-read-private user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;
        
        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };
        
        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect(
          "/#" +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
            })
        );
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/add_tracks_to_playlist", function (req, res) {
  var access_token = req.query.access_token; // Get the access token from the query string or from wherever you store it

  // Replace {playlist_id} with the ID of the playlist you want to modify
  var playlist_id = "0dn4XudR0eemryI4BtIYLz";

  var track_uris = [
    "spotify:track:59PSEuGHBGLvgZGXC4wpvG", // Example track URIs
    "spotify:track:5t5oLw5209yleTnJSqM097",
  ];

  var options = {
    url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    headers: { Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64")},
    json: true,
    body: {
      uris: track_uris,
    },
  };
  console.log(options);
  // Add tracks to the playlist
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode === 201) {
      console.log("Tracks added to playlist successfully");
      res.send("Tracks added to playlist successfully");
    } else {
      console.error("Error adding tracks to playlist:", error);
      res.status(response.statusCode).send("Error adding tracks to playlist");
    }
  });
});

app.get("/refresh_token", function (req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };
  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;
      res.send({
        access_token: access_token,
        refresh_token: refresh_token,
      });
    }
  });
});

console.log("Listening on 8888");
app.listen(8888);