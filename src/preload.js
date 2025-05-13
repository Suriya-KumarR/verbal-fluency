const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')
const { app } = require('@electron/remote')

// Helper function to resolve paths relative to the app root
function resolveAppPath(relativePath) {
  // In development, use the current working directory
  // In production, use the app's resource path
  const basePath = process.env.NODE_ENV === 'development' 
    ? process.cwd()
    : path.dirname(app.getAppPath())
  
  return path.join(basePath, relativePath)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readDir: async (relativePath) => {
    return new Promise((resolve, reject) => {
      const fullPath = resolveAppPath(relativePath)
      console.log('Reading directory:', fullPath)
      
      // Check if directory exists first
      fs.access(fullPath, fs.constants.F_OK, (accessErr) => {
        if (accessErr) {
          console.error(`Directory does not exist: ${fullPath}`, accessErr)
          resolve([]) // Return empty array instead of rejecting
          return
        }
        
        // Try to read with file types first
        fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
          if (err) {
            // If that fails, try the basic version
            fs.readdir(fullPath, (basicErr, basicFiles) => {
              if (basicErr) {
                console.error('Error reading directory:', basicErr)
                resolve([]) // Return empty array instead of rejecting
                return
              }
              
              // For each file, check if it's a directory
              const results = [];
              let completed = 0;
              
              if (basicFiles.length === 0) {
                console.log(`Found 0 items in ${fullPath}`)
                resolve([]);
                return;
              }
              
              basicFiles.forEach(filename => {
                const filePath = path.join(fullPath, filename);
                fs.stat(filePath, (statErr, stats) => {
                  completed++;
                  
                  if (!statErr) {
                    results.push({
                      name: filename,
                      isDirectory: function() { return stats.isDirectory(); }
                    });
                  }
                  
                  if (completed === basicFiles.length) {
                    console.log(`Found ${results.length} items in ${fullPath}`)
                    resolve(results);
                  }
                });
              });
            });
            return;
          }
          
          // Successfully read with file types
          console.log(`Found ${files.length} items in ${fullPath}`)
          resolve(files.map(file => ({
            name: file.name,
            isDirectory: function() { return file.isDirectory(); }
          })));
        });
      });
    });
  },
  
  readFile: async (relativePath) => {
    return new Promise((resolve, reject) => {
      const fullPath = resolveAppPath(relativePath)
      console.log('Reading file:', fullPath)
      
      // Check if file exists first
      fs.access(fullPath, fs.constants.F_OK, (accessErr) => {
        if (accessErr) {
          console.error(`File does not exist: ${fullPath}`, accessErr)
          resolve(null) // Return null instead of rejecting
          return
        }
        
        fs.readFile(fullPath, 'utf-8', (err, data) => {
          if (err) {
            console.error('Error reading file:', err)
            resolve(null) // Return null instead of rejecting
            return
          }
          
          resolve(data)
        })
      })
    })
  },
  
  readBinaryFile: async (relativePath) => {
    return new Promise((resolve, reject) => {
      const fullPath = resolveAppPath(relativePath)
      console.log('Reading binary file:', fullPath)
      
      // Check if file exists first
      fs.access(fullPath, fs.constants.F_OK, (accessErr) => {
        if (accessErr) {
          console.error(`File does not exist: ${fullPath}`, accessErr)
          resolve(null) // Return null instead of rejecting
          return
        }
        
        fs.readFile(fullPath, (err, data) => {
          if (err) {
            console.error('Error reading binary file:', err)
            resolve(null) // Return null instead of rejecting
            return
          }
          
          resolve(data)
        })
      })
    })
  },
  
  // Path operations - now just joins paths but doesn't resolve them
  joinPath: (...parts) => {
    const result = path.join(...parts)
    console.log('Joining paths:', parts, '→', result)
    return result
  },
  
  // App info
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path')
      .then(path => {
        console.log('App path:', path)
        return path
      })
      .catch(err => {
        console.error('Error getting app path:', err)
        return process.cwd()
      })
  },
  
  writeFile: async (relativePath, content) => {
    return new Promise((resolve, reject) => {
      const fullPath = resolveAppPath(relativePath)
      console.log('Writing file:', fullPath)
      
      fs.writeFile(fullPath, content, 'utf-8', (err) => {
        if (err) {
          console.error('Error writing file:', err)
          resolve(false)
          return
        }
        
        console.log('File written successfully:', fullPath)
        resolve(true)
      })
    })
  },

  loadSessionFile: (listType, gender, participant, sessionFilename) =>
    ipcRenderer.invoke('load-session-file', listType, gender, participant, sessionFilename),

  getAudioFile: (listType, gender, participant, audioFilename) =>
    ipcRenderer.invoke('get-audio-file', listType, gender, participant, audioFilename),

  saveSessionFile: async (listType, gender, participant, sessionFilename, data) => {
    console.log('[Preload] saveSessionFile called.');
    console.log('[Preload] Params:', { listType, gender, participant, sessionFilename });
    // console.log('[Preload] Data (first 200 chars):', JSON.stringify(data).substring(0,200));
    try {
        console.log("[Preload] Invoking 'save-session-file' IPC handler...");
        // The result will now be an object: { success: boolean, filePath?: string, content?: string, error?: string }
        const result = await ipcRenderer.invoke('save-session-file', listType, gender, participant, sessionFilename, data);
        console.log("[Preload] IPC handler 'save-session-file' returned:", result);
        return result;
    } catch (error) {
        console.error('[Preload] Error invoking save-session-file via IPC:', error);
        // Return a consistent error object structure
        return { success: false, error: error.message };
    }
  }
})

console.log('Preload script loaded and electronAPI exposed.'); 