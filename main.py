from album_scrape import Album
from apple_trending_ng import Trending

print("What do you want from Apple")
print("Scrape an Album - (Album)")
print("Scrape Top 100 NG-- (Trending)")

response = input(">> ")
if response == "Album":
    Album()
elif response == "Trending":
    Trending()