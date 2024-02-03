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



app.get("/create_public_playlists", async (req, res) => {
  try {
    // Get the list of JSON files in the folder containing playlist data
    const playlistFolder = path.join(__dirname, "playlist_data");
    const jsonFiles = fs
      .readdirSync(playlistFolder)
      .filter((file) => file.endsWith(".json"));

    // Iterate over each JSON file
    for (const jsonFile of jsonFiles) {
      try {
        // Extract playlist name from the JSON file title
        const playlistName = path.basename(jsonFile, ".json");

        // Read the playlist data from the JSON file
        const playlistData = JSON.parse(
          fs.readFileSync(path.join(playlistFolder, jsonFile))
        );

        // Ensure tracks data is in the expected format (array of strings)
        if (
          !Array.isArray(playlistData) ||
          playlistData.some((track) => typeof track !== "string")
        ) {
          throw new Error(`Invalid format for tracks data in ${jsonFile}`);
        }

        // Create a new public playlist on Spotify
        const createdPlaylist = await spotifyApi.createPlaylist(playlistName, {
          public: true,
          description: `Playlist created from ${jsonFile}`,
        });

        // Get the playlist ID
        const playlistId = createdPlaylist.body.id;

        // Initialize an array to store track URIs
        const trackUris = [];

        // Iterate over each track in the playlist data
        for (const track of playlistData) {
          // Construct the search query with the track title
          const searchQuery = track;

          // Search for the track on Spotify
          const searchData = await spotifyApi.searchTracks(searchQuery);

          // If track found, add its URI to the trackUris array
          if (searchData.body.tracks.items.length > 0) {
            trackUris.push(searchData.body.tracks.items[0].uri);
          } else {
            console.log("No tracks found for query: " + searchQuery);
          }
        }

        // If no valid track URIs were found, skip creating the playlist
        if (trackUris.length === 0) {
          console.warn(`No valid tracks found for playlist: ${playlistName}`);
          continue; // Skip to the next playlist
        }

        // Add tracks to the playlist
        await spotifyApi.addTracksToPlaylist(playlistId, trackUris, {
          position: 0,
        });

        // Get the image filename corresponding to the playlist
        const imageFilename = path.join(
          playlistFolder,
          "img",
          `${playlistName}.jpg`
        );

        // Set the playlist image from the image file if it exists
        if (fs.existsSync(imageFilename)) {
          const imageData = fs.readFileSync(imageFilename);
          const base64ImageData = imageData.toString("base64");
          await spotifyApi.uploadCustomPlaylistCoverImage(
            playlistId,
            base64ImageData
          );
          
          // Delete the image file
          fs.unlinkSync(imageFilename);
          console.log(`Image file deleted: ${imageFilename}`);
        } else {
          console.warn(`Image file not found for playlist: ${playlistName}`);
        }

        // Delete the JSON file
        fs.unlinkSync(path.join(playlistFolder, jsonFile));
        console.log(`JSON file deleted: ${jsonFile}`);

        console.log(
          `Playlist created and tracks added successfully for: ${playlistName}`
        );
      } catch (error) {
        console.error(`Error processing JSON file: ${jsonFile}`, error);
      }
    }

    res.send("All playlists created and tracks added successfully.");
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .send("Error occurred while creating playlists or adding tracks.");
  }
});




app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
