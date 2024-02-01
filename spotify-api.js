const { RateLimiter } = require("limiter");
const limiter = new RateLimiter(1, "second");
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const fs = require("fs");


// Initialize an Express application.
const app = express();
// Define the port number on which the server will listen.
const port = 8888;

// Initialize the Spotify API with credentials from environment variables.
const spotifyApi = new SpotifyWebApi({
  clientId: "965df5cc1fdc42ceac8bbb22e34360cf",
  clientSecret: "ee540ed6fc8e4e22ac94696350912149",
  redirectUri: "http://localhost:8888/callback",
});
``
// Route handler for the login endpoint.
app.get("/login", (req, res) => {
  // Define the scopes for authorization; these are the permissions we ask from the user.
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-modify-public",
  ];
  // Redirect the client to Spotify's authorization page with the defined scopes.
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// Route handler for the callback endpoint after the user has logged in.
app.get("/callback", (req, res) => {
  // Extract the error, code, and state from the query parameters.
  const error = req.query.error;
  const code = req.query.code;

  // If there is an error, log it and send a response to the user.
  if (error) {
    console.error("Callback Error:", error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  // Exchange the code for an access token and a refresh token.
  spotifyApi
    .authorizationCodeGrant(code)
    .then((data) => {
      const accessToken = data.body["access_token"];
      const refreshToken = data.body["refresh_token"];
      const expiresIn = data.body["expires_in"];

      // Set the access token and refresh token on the Spotify API object.
      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);

      // Send a success message to the user.
      res.send(
        "Login successful!"
      );

      // Refresh the access token periodically before it expires.
      setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken();
        const accessTokenRefreshed = data.body["access_token"];
        spotifyApi.setAccessToken(accessTokenRefreshed);
      }, (expiresIn / 2) * 1000); // Refresh halfway before expiration.
    })
    .catch((error) => {
      console.error("Error getting Tokens:", error);
      res.send("Error getting tokens");
    });
});


app.get("/add_tracks_to_playlist", async (req, res) => {
  const { q } = req.query;
  const searchSongTitle = JSON.parse(fs.readFileSync("song_names.json"));


  const searchPromises = [];
  searchSongTitle.forEach((query) => {
    searchPromises.push(
      spotifyApi.searchTracks(query).then((searchData) => {
        return searchData.body.tracks.items[0].uri;
      })
    );
  });

  try {
    const playlist_id = "4Hzyms4nPhY1JeVv3gyIyu";
    const trackUris = await Promise.all(searchPromises);

    await spotifyApi.addTracksToPlaylist(playlist_id, trackUris, {
      position: 0,
    });

    res.send("Tracks added to playlist successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error occurred while adding tracks to playlist");
  }
});

// Start the Express server.
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
