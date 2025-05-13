import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { exec } from 'child_process'
import { initialize } from '@electron/remote/main'
import { protocol } from 'electron'
import fs from 'fs'

let mainWindow
let backendProcess

function startBackend() {
  // Kill any existing process on port 5170
  try {
    exec('lsof -ti:5170 | xargs kill -9', (error) => {
      if (error) {
        console.log('No process was running on port 5170');
      } else {
        console.log('Killed process on port 5170');
      }
    });
  } catch (error) {
    console.error('Error killing process:', error);
  }

  // Wait a moment to ensure the port is released
  setTimeout(() => {
    backendProcess = exec('dotnet run', {
      cwd: path.join(__dirname, '../server')
    })

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`)
    })

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`)
    })
  }, 1000);
}

function createWindow() {
  // Determine the preload path correctly based on environment
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, '../src/preload.js')
  
  console.log('Preload script path:', preloadPath)
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // The settings below are important for security
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true, // Enable remote module for path resolution
      preload: preloadPath
    }
  })

  // Initialize remote module
  initialize()
  require('@electron/remote/main').enable(mainWindow.webContents)

  // Load the index.html file
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(`file://${__dirname}/index.html`)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  startBackend()
  createWindow()
  
  // Handle IPC calls
  ipcMain.handle('app-root-path', () => {
    return process.env.NODE_ENV === 'development' 
      ? process.cwd() 
      : path.dirname(app.getAppPath())
  })

  // Base path for storage - adjust if necessary
  const STORAGE_BASE_PATH = path.join(app.getPath('userData'), 'file_storage', 'BKB_Transcriptions')
  console.log('[Background] userData path:', app.getPath('userData'))
  console.log('[Background] Full STORAGE_BASE_PATH for transcriptions:', STORAGE_BASE_PATH)

  const AUDIO_BASE_PATH = path.join(app.getPath('userData'), 'file_storage', 'BKB_Audio') // Assuming audio is here
  console.log('[Background] Full AUDIO_BASE_PATH for audio:', AUDIO_BASE_PATH)

  // --- Ensure this handler exists and is correct ---
  ipcMain.handle('save-session-file', async (event, listType, gender, participant, sessionFilename, data) => {
    console.log('[Background] Received save-session-file request.')
    console.log('[Background] Params:', { listType, gender, participant, sessionFilename })
    // Log only a portion of data if it's too large for console
    // console.log('[Background] Data (first 200 chars):', JSON.stringify(data).substring(0, 200))

    if (!listType || !gender || !participant || !sessionFilename || data === undefined) {
      console.error('[Background] Save Session File: Missing parameters. Aborting save.')
      return { success: false, filePath: null, error: 'Missing parameters' }
    }
    const filePath = path.join(STORAGE_BASE_PATH, listType, gender, participant, sessionFilename)
    console.log(`[Background] ABSOLUTE FILE PATH for saving: ${filePath}`)

    try {
      console.log('[Background] Ensuring directory exists:', path.dirname(filePath))
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      console.log('[Background] Directory ensured/created.')

      const jsonString = JSON.stringify(data, null, 2)
      // console.log('[Background] Writing JSON string to file (first 200 chars):', jsonString.substring(0,200))
      
      await fs.promises.writeFile(filePath, jsonString, 'utf8')
      
      console.log(`[Background] Successfully saved session file to: ${filePath}`)

      // --- ADD THIS: Read the file content after saving ---
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8')
        console.log(`[Background] Successfully read back saved file content.`)
        return { success: true, filePath: filePath, content: fileContent }
      } catch (readError) {
        console.error(`[Background] Error reading back saved file ${filePath}:`, readError)
        // Still return success for write, but indicate readback issue or return partial success
        return { success: true, filePath: filePath, content: null, readError: readError.message }
      }
      // --- END ADDITION ---

    } catch (error) {
      console.error(`[Background] CRITICAL ERROR saving session file ${filePath}:`, error)
      return { success: false, filePath: filePath, error: error.message }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
}) 