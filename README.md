# Verbal Fluency Task

This application provides a tool for transcribing and editing audio files with word-level timestamps. It consists of a Vue.js frontend and a .NET Core backend.

## Project Structure

- `verbal-fluency/` - Vue.js frontend
- `server/` - .NET Core backend API

## Frontend Setup

```bash
# Navigate to the frontend directory
cd verbal-fluency

# Install dependencies
npm install

# Compile and hot-reload for development
npm run serve

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint
```

## Backend Setup

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

### CORS Issues

If you encounter CORS errors in the browser console:
1. Ensure the backend is running
2. Check that the frontend's request URL matches one of the allowed origins in the backend's CORS policy
3. The backend must be running on port 5149

### API Key Issues

If transcription fails, verify that you've correctly set the OPENAI_API_KEY environment variable with a valid key.
