from album_scrape import Album
from apple_trending_ng import Trending

print("What do you want from Apple Music?")
print("1. Scrape an Album - (Album)")
print("2. Scrape Top 100 NG - (Trending)")

response = input("Enter your choice (Album/Trending): ")

if response == "Album":
    album_url = input("Enter album URL: ")
    Album(album_url)
elif response == "Trending":
    Trending()
else:
    print("Invalid choice.")
