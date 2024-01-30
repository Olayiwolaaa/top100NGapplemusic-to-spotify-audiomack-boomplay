import requests
from bs4 import BeautifulSoup

def Album():
    url = 'https://music.apple.com/us/album/unruly/1700358054'

    response = requests.get(url)

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        og_title_tag = soup.find('meta', {'property': 'og:title'})

        if og_title_tag:
            Album = og_title_tag.get('content')
        # Find all meta tags with the specified property value
        meta_tags = soup.find_all('meta', {'property': 'music:song:preview_url:secure_url'})
        print(f"Each Track url of {Album}")
        if meta_tags:
            # Extract and print the content attribute for each meta tag
            for meta_tag in meta_tags:
                preview_url = meta_tag.get('content')
                print(preview_url)
        
Album()