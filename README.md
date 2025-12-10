# Portal Net - Advanced File Organization

## Overview
Portal Net is a powerful file organization system that automatically sorts files into categorized folders.

## Folder Logic Explanation

### How It Works:
1. **Source Folder**: This is where Portal Net watches for new files (default: your Downloads folder)
2. **Main Destination Folder**: This is where all organized subfolders will be created
3. **Automatic Sorting**: When new files appear in the source folder, they are automatically moved to the appropriate subfolder

### Folder Structure Example:
```
Main Destination Folder (e.g., "E:\Portal Net Files")
├── Images/              (for .jpg, .png, .gif, etc.)
├── Documents/           (for .pdf, .docx, .txt, etc.)
├── Videos/              (for .mp4, .avi, .mkv, etc.)
├── Music/               (for .mp3, .wav, .flac, etc.)
├── Archives/            (for .zip, .rar, .7z, etc.)
├── Spreadsheets/        (for .xls, .xlsx, .csv)
└── Presentations/       (for .ppt, .pptx)
```

### What Happens:
- Files are **MOVED** (not copied) from source to destination
- If a subfolder doesn't exist, it will be created automatically
- Files that don't match any category stay in the source folder
- The application remembers your folder settings and theme preference between restarts

## Features

### Automatic File Sorting
- Watches source folder in real-time
- Automatically moves files to appropriate subfolders
- Handles cross-device file moves (copy + delete)

### Pre-defined File Categories
- Images: .jpg, .jpeg, .png, .gif, .bmp, .webp
- Documents: .pdf, .doc, .docx, .txt, .rtf
- Videos: .mp4, .avi, .mkv, .mov, .wmv
- Music: .mp3, .wav, .flac, .aac, .ogg
- Archives: .zip, .rar, .7z, .tar, .gz
- Spreadsheets: .xls, .xlsx, .csv
- Presentations: .ppt, .pptx

### User Interface Features
- **Dark/Light Theme Switching**: Choose your preferred interface theme
- Error display for troubleshooting
- Statistics tracking (files sorted today/total)
- Compact, user-friendly interface
- Default Downloads folder selection

### Advanced Features
- System tray integration with logo.jpg icon
- Auto-startup on system boot
- Configuration persistence (including theme preference and folder settings)
- Real-time status updates
- Default folder override prevention (respects existing configurations)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the application:
```bash
npm start
```

## Usage

1. Select your source folder (default: Downloads)
2. Select your main destination folder
3. Choose your preferred theme (Dark/Light)
4. Choose which file categories to organize (checkboxes)
5. Click "Start Automatic Sorting"
6. Files will be automatically sorted as they appear

## Building for Production

To create an installer with auto-startup option:
```bash
npm run build
node installer.js
```

## Technical Details

- Built with Electron 28+
- Uses chokidar for file watching
- Configuration stored with electron-store
- Statistics saved in localStorage
- Cross-platform compatible
- Theme preferences persisted

## Troubleshooting

- If files aren't moving, check the error messages in the UI
- Ensure you have write permissions for both folders
- Check that the destination folder has enough free space
- Verify that files match the supported extensions
- Theme changes require application restart to take full effect
- Application icon uses logo.jpg for both main window and system tray
- Configuration properly handles theme, folder paths, and sortExistingFiles settings