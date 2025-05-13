// File system service for accessing files through Electron

// Ensure window.electronAPI is available or handle potential errors
const api = window.electronAPI;

if (!api) {
  console.error("Electron API not found! File system operations will fail.");
  // Optionally, provide mock functions or throw an error in a non-Electron context
}

const fileSystemService = {
  // Get paths to transcript and audio directories
  getDirectoryPaths() {
    // Use a relative path structure that works in both dev and production
    // This assumes the file_storage folder is at the application root
    return {
      transcriptionsPath: 'file_storage/BKB_Transcriptions',
      audioPath: 'file_storage/BKB_Audio'
    }
  },

  // List all list types (e.g., BKB_4lists_44100)
  async getListTypes() {
    if (!api) return [];
    try {
      const { transcriptionsPath } = this.getDirectoryPaths()
      if (!transcriptionsPath) {
        console.error('No transcriptions path available')
        return []
      }

      console.log('Reading directory:', transcriptionsPath)
      const entries = await api.readDir(transcriptionsPath)
      console.log('Directory entries:', entries)
      
      if (!entries || !Array.isArray(entries)) {
        console.error('Invalid entries returned', entries)
        return []
      }

      return entries
        .filter(entry => entry.isDirectory())
        .map(dir => dir.name)
    } catch (error) {
      console.error('Error getting list types:', error)
      return []
    }
  },

  // List participants for a given list type and gender
  async getParticipants(listType, gender) {
    if (!api || !listType || !gender) return [];
    try {
      const { transcriptionsPath } = await this.getDirectoryPaths()
      if (!transcriptionsPath) {
        console.error('No transcriptions path available')
        return []
      }
      
      const participantsPath = api.joinPath(transcriptionsPath, listType, gender)
      console.log('Looking for participants in:', participantsPath)
      
      const entries = await api.readDir(participantsPath)
      console.log('Participant entries:', entries)
      
      // If we get an array of strings or objects without isDirectory, handle it
      if (entries && Array.isArray(entries)) {
        // Check if the first entry has isDirectory method
        if (entries.length > 0 && typeof entries[0].isDirectory === 'function') {
          // Use isDirectory method if available
          const dirs = entries
            .filter(entry => entry.isDirectory())
            .map(dir => dir.name)
          
          console.log('Found participant directories (with isDirectory):', dirs)
          return dirs
        } else {
          // Otherwise, use the entries directly and filter out files with .json extension
          const dirs = entries
            .filter(entry => {
              // If entry is an object with name property
              if (typeof entry === 'object' && entry.name) {
                return !entry.name.endsWith('.json')
              }
              // If entry is a string
              if (typeof entry === 'string') {
                return !entry.endsWith('.json')
              }
              return false
            })
            .map(entry => typeof entry === 'object' && entry.name ? entry.name : entry)
          
          console.log('Found participant directories (without isDirectory):', dirs)
          return dirs
        }
      }
      
      console.error('Invalid entries returned', entries)
      return []
    } catch (error) {
      console.error('Error getting participants:', error)
      return []
    }
  },

  // List sessions for a given participant
  async getSessions(listType, gender, participant) {
    if (!api || !listType || !gender || !participant) return [];
    try {
      const { transcriptionsPath } = await this.getDirectoryPaths()
      if (!transcriptionsPath) return []
      
      const sessionsPath = api.joinPath(transcriptionsPath, listType, gender, participant)
      console.log('Looking for sessions in:', sessionsPath)
      
      const files = await api.readDir(sessionsPath)
      console.log('Session entries:', files)
      
      if (!files || !Array.isArray(files)) return []
      
      // Handle different formats of file entries
      const jsonFiles = files
        .filter(file => {
          // If we have a proper file object with isDirectory method
          if (file && typeof file.isDirectory === 'function') {
            return !file.isDirectory() && file.name.endsWith('.json')
          }
          // If we just have a name string or an object with name property
          const name = typeof file === 'string' ? file : (file && file.name);
          return name && name.endsWith('.json')
        })
        .map(file => typeof file === 'string' ? file : file.name)
      
      console.log('Found JSON files:', jsonFiles)
      return jsonFiles
    } catch (error) {
      console.error('Error getting sessions:', error)
      return []
    }
  },

  // Load a specific session
  async loadSession(listType, gender, participant, sessionFile) {
    if (!api || !listType || !gender || !participant || !sessionFile) return null;
    try {
      const { transcriptionsPath } = await this.getDirectoryPaths()
      if (!transcriptionsPath) return null
      
      const sessionPath = api.joinPath(
        transcriptionsPath, 
        listType, 
        gender, 
        participant, 
        sessionFile
      )
      
      console.log('Loading session from:', sessionPath)
      const data = await api.readFile(sessionPath)
      if (!data) return null
      
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  },

  // Get the audio file for a session
  async getAudioFile(listType, gender, participant, audioFileName) {
    if (!api || !listType || !gender || !participant || !audioFileName) return null;
    try {
      const { audioPath } = this.getDirectoryPaths()
      if (!audioPath) return null
      
      // Remove the "BKB_" prefix from the participant ID
      const modifiedParticipant = participant.replace('BKB_', '')
      
      const audioFilePath = api.joinPath(
        audioPath,
        listType,
        gender,
        modifiedParticipant,
        audioFileName
      )
      
      console.log('Loading audio from:', audioFilePath)
      return await api.readBinaryFile(audioFilePath)
    } catch (error) {
      console.error('Error loading audio file:', error)
      return null
    }
  },

  // Save a session
  async saveSession(listType, gender, participant, sessionFilename, sessionData) {
    console.log('[FSService] saveSession called.');
    console.log('[FSService] Params:', { listType, gender, participant, sessionFilename });
    // console.log('[FSService] Data (first 200 chars):', JSON.stringify(sessionData).substring(0,200));

    if (!api || !listType || !gender || !participant || !sessionFilename || !sessionData) {
        console.error("[FSService] Missing parameters for saveSession. Aborting.");
        return { success: false, error: "Missing parameters" }; 
    }
    try {
      console.log('[FSService] Calling api.saveSessionFile...');
      const response = await api.saveSessionFile(
        listType,
        gender,
        participant,
        sessionFilename,
        sessionData
      );
      console.log('[FSService] api.saveSessionFile returned:', response);
      return response;
    } catch (error) {
      console.error('[FSService] Error calling api.saveSessionFile:', error);
      return { success: false, error: error.message }; 
    }
  },

  // Get genders for a given list type
  async getGenders(listType) {
    if (!api || !listType) return [];
    try {
      return await api.getGenders(listType);
    } catch (error) {
      console.error('Error getting genders:', error);
      return [];
    }
  },
}

export default fileSystemService 