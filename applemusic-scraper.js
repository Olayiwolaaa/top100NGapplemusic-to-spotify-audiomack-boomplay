const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Define an interface for MusicRecording objects
function scrapeAppleMusicPlaylist(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const songNames = $("script#schema\\:music-playlist").first().html(); // Retrieve the HTML content of the script tag

      if (songNames) {
        const playlistData = JSON.parse(songNames);
        const musicRecordings = playlistData.track.filter(
          (track) => track["@type"] === "MusicRecording"
        );
        const songNamesArray = musicRecordings.map((track) => track.name);
        resolve(songNamesArray);
      } else {
        throw new Error("Failed to find script tag with playlist data.");
      }
    } catch (error) {
      console.error("Error scraping playlist:", error);
      reject(error);
    }
  });
}

const playlistUrl =
  "https://music.apple.com/kw/playlist/top-100-nigeria/pl.2fc68f6d68004ae993dadfe99de83877";
scrapeAppleMusicPlaylist(playlistUrl)
  .then((songNames) => {
    console.log("Song names:", songNames);
    const filename = "song_names.json";
    fs.writeFile(filename, JSON.stringify(songNames, null, 2), (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      } else {
        console.log(`Song names written to ${filename}`);
      }
    });
  })
  .catch((error) => {
    console.error("Error scraping playlist:", error);
  });
