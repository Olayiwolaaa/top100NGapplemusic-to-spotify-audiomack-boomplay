const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const puppeteer = require("puppeteer");

function scrapeAppleMusicPlaylist(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const songs = [];

      // Iterate over each song in the playlist
      $(".songs-list .song").each((index, element) => {
        const title = $(element).find(".song-name").text().trim();
        const artist = $(element).find(".by-line a").text().trim();
        const album = $(element).find(".by-line span").text().trim();

        // Push the title, artist, and album to the songs array
        songs.push({ title, artist, album });
      });

      resolve(songs);
    } catch (error) {
      reject(error);
    }
  });
}

// Read the JSON file named "Top100"
const items = require("./Top100.json");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Iterate over each item
  for (const item of items) {
    const { title, url } = item;

    try {
      // Scrape data from the Apple Music playlist URL
      const songs = await scrapeAppleMusicPlaylist(url);

      // Write the scraped data to a JSON file with the name of the title
      const filename = `${title}.json`;
      fs.writeFileSync(filename, JSON.stringify(songs, null, 2));
      console.log(`Data written to ${filename}`);

      // Load the website
      await page.goto(
        "https://bendodson.com/projects/apple-music-artwork-finder/"
      );

      // Insert the URL into the input field
      await page.type("#apple-music-url", url);

      // Click the "Search" button
      await page.click("#search-button");

      // Wait for the artwork to load
      await page.waitForSelector(".album-art img");

      // Get the URL of the artwork image
      const imageUrl = await page.$eval(".album-art img", (img) => img.src);

      // Download the artwork with the name of the title
      const imageFilename = `${title}.jpg`;
      const writer = fs.createWriteStream(imageFilename);
      const response = await axios.get(imageUrl, { responseType: "stream" });
      response.data.pipe(writer);
      console.log(`Artwork downloaded: ${imageFilename}`);
    } catch (error) {
      console.error(`Error processing item "${title}":`, error);
    }
  }

  await browser.close();
})();
