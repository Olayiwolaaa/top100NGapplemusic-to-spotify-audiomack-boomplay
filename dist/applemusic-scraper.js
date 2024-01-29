"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
// import { NG_APPLE_MUSIC_URL } from "./config";
function scrapeAppleMusicPlaylist(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(url);
            const $ = cheerio_1.default.load(response.data);
            // Example: Extract song names
            const songNames = $(".songs-list-row__by-line")
                .map((index, element) => $(element).text())
                .get();
            return songNames;
        }
        catch (error) {
            console.error("Error scraping playlist:", error);
            throw error;
        }
    });
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
