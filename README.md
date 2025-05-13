# BKB App

This is a Vue.js application for audio transcription and editing, with a .NET backend.

## Getting Started

### Prerequisites
- Node.js (v16+)
- .NET 9.0 SDK
- npm (v8+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/verbal-fluency.git
   cd verbal-fluency
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install Electron builder plugin:
   ```bash
   npm install vue-cli-plugin-electron-builder@13.0.0 --save-dev
   ```

4. Install backend dependencies:
   ```bash
   cd server
   dotnet restore
   cd ..
   ```

### Running the Application

#### Development Mode (Separate Frontend and Backend)

1. Backend Setup

```bash
# Navigate to the server directory
cd server

# Set your OpenAI API key as an environment variable
# Replace YOUR_API_KEY with your actual OpenAI API key
export OPENAI_API_KEY="YOUR_API_KEY"  # For Unix/Linux/macOS
# OR
set OPENAI_API_KEY=YOUR_API_KEY  # For Windows Command Prompt
# OR
$env:OPENAI_API_KEY="YOUR_API_KEY"  # For Windows PowerShell

# Build the application
dotnet build

# Run the application
dotnet run
```

The backend server will start at `http://localhost:5149`.

2. In a new terminal, start the frontend:
   ```bash
   npm run serve
   ```

3. Access the app at `http://localhost:8080`

#### Electron Mode (Desktop Application)

1. Install Electron dependencies:
   ```bash
   npm install
   ```

2. Run the Electron app in development mode:
   ```bash
   npm run electron:serve
   ```

3. The Electron app will launch automatically

### Configuration

- Backend URL: Set in `src/App.vue` (default: `http://localhost:5149`)
- API Endpoints: Configured in `server/Controller/FileController.cs`

## Features

- Upload audio files in various formats (mp3, mp4, mpeg, mpga, m4a, wav, webm)
- Automatic transcription with word-level timestamps
- Interactive waveform visualization
- Edit word text and timestamps
- Add or remove words
- Mark words for review
- Quality check (QC) for each word
- Timestamp overlap detection
- Download edited transcription as JSON

## Troubleshooting

- **Electron build issues**: Make sure you have all required dependencies installed:
  ```bash
  npm install
  ```

### CORS Issues

If you encounter CORS errors in the browser console:
1. Ensure the backend is running
2. Check that the frontend's request URL matches one of the allowed origins in the backend's CORS policy
3. The backend must be running on port 5149

### API Key Issues

If transcription fails, verify that you've correctly set the OPENAI_API_KEY environment variable with a valid key.