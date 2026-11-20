# Full Size Images for IG v0.3.0

[![es](https://img.shields.io/badge/lang-es-yellow.svg)](https://github.com/fedeholc/full-size-insta-extension/blob/master/README.es.md)

**Google Chrome extension to display IG images at full size.**

## Installa from the Chrome Web Store

- Download and install the extension from [here](https://chrome.google.com/webstore/detail/instagram-full-size-photo/eanpijghoobafibemccmoleollpjhcgg).

## Install manually

1. Clone the repository or download the ZIP file with the code (Code > Download ZIP, from the main page of the repository) and then unzip the downloaded ZIP file.
2. On Chrome, go to chrome://extensions/.
3. Enable "Developer Mode".
4. Click on "Load Unpacked".
5. Select the folder that contains the extension code.
6. Click on the extensions icon and then on the icon with the extension pin to make it visible in the toolbar.
7. Done! The extension is installed and ready to use.

## How to use it

Once installed, when you enter the Instagram website, each image will have a magnifying glass icon in the upper right corner. Clicking on the icon will open the image in full size. Clicking on the image (or pressing `Esc`) will take you back to the previous screen.

If the post is a carousel, you can move through its images with the left and right arrow keys, or with the on-screen arrows shown in the full size viewer. A counter in the corner shows which photo you are viewing.

### Profile gallery

When you open a user's profile (for example `https://www.instagram.com/rafabadia64/`), a **View as full size gallery** button appears at the bottom of the screen. Clicking it opens a full size gallery with all the user's photos, in order: the viewer goes through every image of each carousel and then continues with the next post. Use the left and right arrow keys (or the on-screen arrows) to move through the gallery, and `Esc` to close it.

More photos are loaded automatically as you approach the end of the gallery. To avoid waits when you reach a carousel, the extension preloads the next carousels in the background (and caches their images) before you get there. If Instagram does not expose the complete data of a profile, the gallery uses the photos available on the profile grid and keeps loading more of them by scrolling the profile in the background (the scroll position is restored when you close the gallery). When a carousel appears only with its cover photo in the grid, the extension opens the post in the background (hidden behind the viewer) to get the rest of its images.

When you are viewing a single photo or a carousel on its own (with the magnifying glass) and reach its last image, a **Continue in gallery mode** button appears. It switches to the author's full gallery starting from the image you were viewing, instead of starting over from the beginning.

It works only with photos (both from the main feed and from each user's profile), but not with videos or reels.

## License

- [![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/) This project is under the GPL v3 License - see the file [LICENSE.md](LICENSE.md) for more details.

## Author

👤 **Federico Holc** [@fedeholc](https://github.com/fedeholc)
