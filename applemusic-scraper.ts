import axios from "axios";
import cheerio from "cheerio";
import { NG_APPLE_MUSIC_URL } from "./config";

// Define an interface for MusicRecording objects
interface MusicRecording {
  "@type": string;
  name: string;
  url: string;
  duration: string;
  offers: {
    "@type": string;
    category: string;
    price: number;
  };
  audio: {
    "@type": string;
    potentialAction: {
      "@type": string;
      expectsAcceptanceOf: {
        "@type": string;
        category: string;
      };
      target: {
        "@type": string;
        actionPlatform: string;
      };
    };
    name: string;
    duration: string;
    thumbnailUrl: string;
  };
}

async function scrapeAppleMusicPlaylist(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const songNames = $("script#schema\\:music-playlist").first().html(); // Retrieve the HTML content of the script tag

    if (songNames) {
      const playlistData = JSON.parse(songNames);
      const musicRecordings = playlistData.track.filter(
        (track: MusicRecording) => track["@type"] === "MusicRecording"
      );
      const songNamesArray = musicRecordings.map(
        (track: MusicRecording) => track.name
      );
      return songNamesArray;
    } else {
      throw new Error("Failed to find script tag with playlist data.");
    }
  } catch (error) {
    console.error("Error scraping playlist:", error);
    throw error;
  }
}

const playlistUrl = NG_APPLE_MUSIC_URL;
scrapeAppleMusicPlaylist(playlistUrl)
  .then((songNames) => {
    console.log("Song names:", songNames);
  })
  .catch((error) => {
    console.error("Error scraping playlist:", error);
  });
