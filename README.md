# ASCII Visualization Tool

A real-time ASCII art renderer that converts 3D scenes and images into various ASCII/shader effects using WebGL.

## Features

- 🎨 **8 Different Shader Styles**: Standard, Dense, Minimal, Blocks, Standard-Dots, Melding Dots, ASCII Characters minimal (8 levels), ASCII Characters normal (16 levels)
- 🖼️ **Image Upload**: Import PNG/JPG images with transparency support
- 📸 **Export Options**: Screenshot (viewport & original size), Video recording (WebM)
- 🎛️ **Interactive Controls**: Cell size, blur, min/max size, color mode, invert, background color
- 🔄 **Auto-rotating 3D preview** (torus knot)
- 📊 **Real-time dimension display**

## Getting Started (No Coding Experience Required)

### Step 1: Download the Code

1. Go to https://github.com/harrydown/shader-tool-v2
2. Click the green **"Code"** button
3. Select **"Download ZIP"**
4. Extract the ZIP file to a folder on your computer

### Step 2: Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS version** (recommended)
3. Run the installer and follow the instructions
4. Restart your computer after installation

### Step 3: Install Dependencies

**On Windows:**
1. Open the extracted folder
2. Hold **Shift** and **right-click** in the folder
3. Select **"Open PowerShell window here"** or **"Open command window here"**
4. Type: `npm install` and press Enter
5. Wait for installation to complete (may take a few minutes)

**On Mac:**
1. Open **Terminal** (Applications > Utilities)
2. Type `cd ` (with a space after cd)
3. Drag the extracted folder into the Terminal window and press Enter
4. Type: `npm install` and press Enter
5. Wait for installation to complete

### Step 4: Run the Application

In the same terminal/command window, type:
```bash
npm run dev
```

Wait a few seconds, then open your web browser and go to:
```
http://localhost:3000
```

### Step 5: Stop the Application

Press **Ctrl+C** (or **Cmd+C** on Mac) in the terminal window to stop the server.

## How to Use

### Controls Panel (Left Side)

- **Style**: Choose from 8 different rendering styles
- **Cell Size**: Adjust the size of each ASCII character cell (4-32px)
- **Blur**: Control edge softness for dot styles (0.5-3.0)
- **Min/Max Size**: Adjust dot size range for dot styles
- **Color Mode**: Toggle color on/off
- **Invert**: Reverse dark/light areas
- **Background Color**: Click to choose scene background color

### Upload an Image

1. Click **"Choose File"** in the Image Upload section
2. Select a PNG or JPG image
3. Toggle "Show Image" to switch between 3D model and your image
4. Use "Clear Image" to remove it

### Export Your Work

- **Screenshot (Viewport)**: Captures what you see on screen
- **Screenshot (Original Size)**: Captures at uploaded image's original resolution
- **Start/Stop Recording**: Creates a video (WebM format)

## Troubleshooting

**"npm: command not found" error:**
- Node.js is not installed - reinstall Node.js and restart your computer

**Page won't load at localhost:3000:**
- Make sure the terminal shows "Ready" before opening the browser
- Try http://127.0.0.1:3000 instead

**Changes not appearing:**
- Refresh your browser (Ctrl+R or Cmd+R)

## Shader Styles

See [SHADER_STYLES.md](SHADER_STYLES.md) for detailed documentation of all shader styles.

## Built With

- Next.js 16.1.6, React 19.2.3, Three.js 0.182.0
- Custom GLSL shaders for ASCII effects

## License

MIT
