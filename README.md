# Readme
## Installation

To install all the required packages, simply use the following command:
```bash
npm i 
```

## Setting Up Input Videos
1. Create a directory named **input_directory**.
2. Place your input videos inside this directory.

**Note:** Ensure that the videos are in .mp4 format

In order to specify which video to process, you need to modify the value of the **"inputFile"** constant in the **"index.js"** file.

```bash
const inputFile = "filename.mp4"
```

## Dowloading Videos from Youtube
1. Visit [ssyoutube.com](https://ssyoutube.com/en164qB/youtube-video-downloader)
2. Paste the URL of the YouTube video you wish to download.
3. Download the video in low quality. This is important as larger videos would require splitting into smaller chunks (less than 4 minutes each).

If the video playback starts instead of initiating the download, click on the three dots in the video player, and then select the download option.
