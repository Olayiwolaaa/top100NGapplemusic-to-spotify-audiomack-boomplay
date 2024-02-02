const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");

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

// Read the JSON file named "Top100"
const items = require("./AppleMusicTop100.json");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Create the "Top100" folder if it doesn't exist
    const top100Folder = path.join(__dirname, "Top100");
    if (!fs.existsSync(top100Folder)) {
      fs.mkdirSync(top100Folder);
    }

    // Create the "img" folder if it doesn't exist
    const imgFolder = path.join(top100Folder, "img");
    if (!fs.existsSync(imgFolder)) {
      fs.mkdirSync(imgFolder);
    }

    // Iterate over each item
    for (const item of items) {
      const { title, url } = item;

      try {
        const songs = await scrapeAppleMusicPlaylist(url);

        // Write the scraped data to a JSON file with the name of the title
        const filename = path.join(top100Folder, `${title}.json`);
        fs.writeFileSync(filename, JSON.stringify(songs, null, 2));
        console.log(`Data written to ${filename}`);

        // Load the website
        await page.goto(
          "https://bendodson.com/projects/apple-music-artwork-finder/"
        );

        // Insert the URL into the input field
        await page.type("#apple-music-playlist-artwork", url);

        // Click the "Search" button
        await page.click("input.submit");

        // Wait for the artwork to load
        await page.waitForSelector("img[alt='']");

        // Get the URL of the artwork image
        const imageUrl = await page.$eval("img[alt='']", (img) => img.src);

        // Define the image filename with the title
        const imageFilename = path.join(imgFolder, `${title}.jpg`);
        const writer = fs.createWriteStream(imageFilename);

        // Download the artwork image
        const response = await axios.get(imageUrl, { responseType: "stream" });
        response.data.pipe(writer);
        console.log(`Artwork downloaded: ${imageFilename}`);
      } catch (error) {
        console.error(`Error processing item "${title}":`, error);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();
