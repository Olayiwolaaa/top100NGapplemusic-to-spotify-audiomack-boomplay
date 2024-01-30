import requests
from bs4 import BeautifulSoup

def Album(album_url):
    response = requests.get(album_url)

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        og_title_tag = soup.find('meta', {'property': 'og:title'})

        if og_title_tag:
            album_title = og_title_tag.get('content')
            print(f"Each Track URL of {album_title}")

        # Find all meta tags with the specified property value
        meta_tags = soup.find_all('meta', {'property': 'music:song:preview_url:secure_url'})
        if meta_tags:
            # Extract and print the content attribute for each meta tag
            for meta_tag in meta_tags:
                preview_url = meta_tag.get('content')
                print(preview_url)
        else:
            print("No track URLs found on the album page.")
    else:
        print(f"Failed to retrieve the page. Status code: {response.status_code}")
