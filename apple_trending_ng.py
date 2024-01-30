import requests
from bs4 import BeautifulSoup

url = 'https://music.apple.com/us/playlist/top-100-nigeria/pl.2fc68f6d68004ae993dadfe99de83877'

response = requests.get(url)

if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all meta tags with property starting with 'music:song'
    song_meta_tags = soup.find_all('meta', {'property': 'music:song'})

    # Extract and print 
    for meta_tag in song_meta_tags:
        content_value = meta_tag.get('content')
        print(content_value)

        # Fetch more details using each URL
        song_response = requests.get(content_value)
        if song_response.status_code == 200:
            # Specify encoding and clean up the text
            song_soup = BeautifulSoup(song_response.content, 'html.parser', from_encoding='utf-8')
            
            # Replace 'p' with the correct tag and class for the information you want to extract
            info = song_soup.find('p', class_="song-header-page__song-header-subtitle svelte-kyya5i")
            
            if info:
                # Clean up the text by removing unwanted characters
                cleaned_info = info.text.strip().replace('Â', '').replace('â', '')
                print(cleaned_info)
            else:
                print("Information not found on the song page.")
else:
    print(f"Failed to retrieve the page. Status code: {response.status_code}")
