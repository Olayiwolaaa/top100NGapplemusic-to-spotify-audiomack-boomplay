const express = require("express"),
  SpotifyWebApi = require("spotify-web-api-node"),
  fs = require("fs"),
  path = require("path");

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
  try {
    // Get a list of all JSON files in the "Top100" folder
    const top100Folder = path.join(__dirname, "Top100");
    const jsonFiles = fs
      .readdirSync(top100Folder)
      .filter((file) => file.endsWith(".json"));

    // Iterate through each JSON file
    for (const jsonFile of jsonFiles) {
      try {
        // Read the JSON file data
        const jsonData = JSON.parse(
          fs.readFileSync(path.join(top100Folder, jsonFile))
        );

        // Create a new playlist on Spotify with the title of the JSON file
        const playlistName = path.basename(jsonFile, path.extname(jsonFile));
        const createdPlaylist = await spotifyApi.createPlaylist(playlistName, {
          public: true,
          description: `Playlist created from ${jsonFile}`,
        });

        // Initialize search promises array
        const searchPromises = [];

        // Iterate through each track in the JSON data
        for (const track of jsonData) {
          // Construct the search query with the track title and artist
          const searchQuery = `${track.title} ${track.artist}`;

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
        }

        // Wait for all promises to resolve
        const trackUris = await Promise.all(searchPromises);

        // Filter out null values (tracks that were not found)
        const validTrackUris = trackUris.filter((uri) => uri !== null);

        // If no valid track URIs were found, send an error response
        if (validTrackUris.length === 0) {
          throw new Error("No tracks found for any of the queries.");
        }

        // Get the playlist ID
        const playlistId = createdPlaylist.body.id;

        // Add tracks from the JSON file data to the playlist
        await spotifyApi.addTracksToPlaylist(playlistId, validTrackUris, {
          position: 0,
        });

        // Get the image filename corresponding to the playlist title
        const imageFilename = path.join(
          __dirname,
          "Top100",
          "img",
          `${playlistName}.jpg`
        );

        // Set the playlist image from the image file
        if (fs.existsSync(imageFilename)) {
          const imageData = fs.readFileSync(imageFilename);
          await spotifyApi.uploadCustomPlaylistCoverImage(
            playlistId,
            imageData
          );
        } else {
          console.warn(`Image file not found for playlist: ${playlistName}`);
        }

        console.log(
          `Playlist created and tracks added successfully for: ${playlistName}`
        );
      } catch (error) {
        console.error(`Error processing JSON file: ${jsonFile}`, error);
      }
    }

    res.send("Playlists created and tracks added successfully.");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error occurred while updating playlists.");
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
