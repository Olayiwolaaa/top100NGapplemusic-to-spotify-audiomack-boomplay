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
  const scopes = ["playlist-modify-public"];
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
      res.send("Login successful!");

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
    // Read song data from the Spotify playlist array object JSON file
    const songData = JSON.parse(fs.readFileSync("song_names.json"));
    

    const searchPromises = [];
    songData.forEach(({ title, album, year }) => {
      // Construct the search query with the song title, album title, and release year
      const searchQuery = `${title} album:${album} year:${year}`;

      // Push a promise to search for tracks with the constructed query
      searchPromises.push(
        spotifyApi.searchTracks(searchQuery).then((searchData) => {
          if (searchData.body.tracks.items.length > 0) {
            return searchData.body.tracks.items[0].uri;
          } else {
            console.log("No tracks found for query: " + searchQuery);
            return null; // Return null to indicate that no track was found
          }
        })
      );
    });

    // Wait for all promises to resolve
    const trackUris = await Promise.all(searchPromises);

    // Filter out null values (tracks that were not found)
    const validTrackUris = trackUris.filter((uri) => uri !== null);

    // If no valid track URIs were found, send an error response
    if (validTrackUris.length === 0) {
      throw new Error("No tracks found for any of the queries.");
    }

    // Create a new public playlist with a name and description
    const playlistName = "Naija50Fit";
    const playlistDescription =
      "Get pumped up with 50 Nigerian tracks for your workout! From Afrobeat to Afropop, this playlist will keep you moving and motivated. Let the energetic rhythms of Nigerian music power your fitness sessions!";
    const createdPlaylist = await spotifyApi.createPlaylist(playlistName, {
      public: true,
      description: playlistDescription,
    });

    // Get the playlist ID
    const playlistId = createdPlaylist.body.id;

    // Add tracks to the playlist
    await spotifyApi.addTracksToPlaylist(playlistId, validTrackUris, {
      position: 0,
    });

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
