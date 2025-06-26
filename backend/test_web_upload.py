#!/usr/bin/env python
"""
Script to test the web document upload functionality
"""

import os
import sys
import asyncio
import json
import requests
from dotenv import load_dotenv

async def test_web_upload():
    """Test the web document upload API endpoint"""
    load_dotenv()
    
    # Get API URL from environment or use default
    API_URL = os.getenv("API_URL", "http://localhost:8000")
    
    print(f"Testing web document upload to {API_URL}")
    
    # Prompt for library ID
    library_id = input("Enter library ID to upload to: ")
    
    # Prompt for URL to upload
    url = input("Enter URL to upload (default: https://lilianweng.github.io/posts/2023-06-23-agent/): ")
    
    if not url:
        url = "https://lilianweng.github.io/posts/2023-06-23-agent/"
    
    # Prompt for CSS selectors
    css_selectors = input("Enter CSS selectors (comma-separated, leave empty for default): ")
    
    selectors = None
    if css_selectors:
        selectors = [s.strip() for s in css_selectors.split(',')]
    
    # Prepare request data
    request_data = {
        "url": url
    }
    
    if selectors:
        request_data["css_selectors"] = selectors
    
    # Make the request
    try:
        print(f"Uploading web document from {url} to library {library_id}...")
        
        response = requests.post(
            f"{API_URL}/api/upload-web/{library_id}",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            print("Upload successful!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Upload failed with status code {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error during upload: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_web_upload()) 