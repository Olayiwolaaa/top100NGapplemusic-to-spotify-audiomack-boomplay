
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const fs = require("fs");


// Initialize an Express application.
const app = express();
const port = 8888;

// Initialize the Spotify API with credentials from environment variables.
const spotifyApi = new SpotifyWebApi({
  clientId: "34c8673e76f545f2be2522fb3a3e7280",
  clientSecret: "ffe0e782bcfa4e639144452f0f92f48c",
  redirectUri: "http://localhost:8888/callback",
});

// Route handler for the login endpoint.
app.get("/login", (req, res) => {
  const scopes = [
    "playlist-modify-public",
  ];
  // Redirect the client to Spotify's authorization page with the defined scopes.
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// Route handler for the callback endpoint after the user has logged in.
app.get("/callback", (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  // If there is an error, log it and send a response to the user.
  if (error) {
    console.error("Callback Error:", error);
    res.send(`Callback Error: ${error}`);
    return;
  }
  
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

app.get("/applemusic_update", async (req, res) => {
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

    // Delete the song_names.json file
    fs.unlinkSync("song_names.json");

    res.send("Tracks added to playlist successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error occurred while adding tracks to playlist");
  }
});

app.get("/create_public_playlist", async (req, res) => {
  try {
    // Read song titles and artist names from the JSON file
    const songData = JSON.parse(fs.readFileSync("song_names.json"));

    const searchPromises = [];
    songData.forEach(({ title, artist }) => {
      // Construct the search query with both the song title and artist name
      const searchQuery = `${title} artist:${artist}`;

      // Push a promise to search for tracks with the constructed query
      searchPromises.push(
        spotifyApi.searchTracks(searchQuery).then((searchData) => {
          if (searchData.body.tracks.items.length > 0) {
            return searchData.body.tracks.items[0].uri;
          } else {
            throw new Error("No tracks found for query: " + searchQuery);
          }
        })
      );
    });

    const trackUris = await Promise.all(searchPromises);

    // Create a new public playlist with a name
    const playlistName = "100 Shades of Baddo: Olamide's Greatest Tracks";
    const playlistDescription =
      "Enjoy the best of Olamide with this curated playlist.";
    const createdPlaylist = await spotifyApi.createPlaylist(playlistName, {
      public: true,
      description: playlistDescription,
    });

    // Get the playlist ID
    const playlistId = createdPlaylist.body.id;

    // Add tracks to the playlist
    await spotifyApi.addTracksToPlaylist(playlistId, trackUris, {
      position: 0,
    });

    // Delete the song_names.json file after adding tracks
    fs.unlinkSync("song_names.json");

    res.send("Playlist created and tracks added successfully.");
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .send("Error occurred while creating playlist or adding tracks.");
  }
});


app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
