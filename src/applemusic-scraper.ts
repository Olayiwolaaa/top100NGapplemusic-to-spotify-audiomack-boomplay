import axios from "axios";
import cheerio from "cheerio";
import { NG_APPLE_MUSIC_URL } from "./config";

async function scrapeAppleMusicPlaylist(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Example: Extract song names
    const songNames = $(".songs-list-row__by-line")
      .map((index, element) => $(element).text())
      .get();

    return songNames;
  } catch (error) {
    console.error("Error scraping playlist:", error);
    throw error;
  }
}

const playlistUrl = "https://music.apple.com/vg/playlist/top-100-nigeria/pl.2fc68f6d68004ae993dadfe99de83877";
scrapeAppleMusicPlaylist(playlistUrl)
  .then((songNames) => {
    console.log("Song names:", songNames);
    // Process scraped data as needed
  })
  .catch((error) => {
    console.error("Error scraping playlist:", error);
  });
