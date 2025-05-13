<template>
  <div class="qa-container">
    <div class="top-bar">
      <button class="back-button" @click="goBack">← Back to Modes</button>
      <h1 class="heading">Quality Assurance Mode</h1>
    </div>
    
    <div class="main-content">
      <!-- Navigation Controls -->
      <div class="navigation-controls">
        <div class="control-group">
          <label>BKB List Type:</label>
          <select v-model="selectedListType" @change="onListTypeChange">
            <option value="">Select a list type</option>
            <option v-for="listType in listTypes" :key="listType" :value="listType">
              {{ listType }}
            </option>
          </select>
        </div>

        <div class="control-group" v-if="selectedListType">
          <label>Gender:</label>
          <select v-model="selectedGender" @change="onGenderChange">
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div class="control-group" v-if="selectedGender">
          <label>Participant:</label>
          <select v-model="selectedParticipant" @change="onParticipantChange">
            <option value="">Select participant</option>
            <option v-for="participant in participants" :key="participant" :value="participant">
              {{ participant }}
            </option>
          </select>
        </div>

        <div class="control-group" v-if="selectedParticipant">
          <label>Session:</label>
          <select v-model="selectedSession" @change="loadSession">
            <option value="">Select session</option>
            <option v-for="session in sessions" :key="session" :value="session">
              {{ session }}
            </option>
          </select>
        </div>
      </div>

      <!-- Waveform Container (Adopt TranscriptionMode structure) -->
      <div class="waveform-wrapper" :class="{ 'hidden': !currentSession }">
        <!-- Use ref similar to TranscriptionMode -->
        <div ref="waveformRef" id="waveform" class="waveform-container"></div>
      </div>

      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div>{{ loadingMessage }}</div>
      </div>

      <!-- Empty state message when no session is loaded -->
      <div v-if="!currentSession && !isLoading" class="placeholder-message">
        <h2>No Session Loaded</h2>
        <p>Select a list type, gender, participant, and session to begin.</p>
        <p>You can review and edit timestamps, adjust quality controls, and save changes.</p>
      </div>

      <!-- Session Data (Adopt TranscriptionMode structure) -->
      <div v-if="currentSession" class="session-data transcription-container">
        <!-- Toolbar (Keep Existing QAMode Toolbar) -->
        <div class="toolbar">
          <button @click="playPause" class="toolbar-btn">
            {{ isPlaying ? 'Pause' : 'Play' }}
          </button>
          <button @click="zoomIn" class="toolbar-btn">Zoom In</button>
          <button @click="zoomOut" class="toolbar-btn">Zoom Out</button>
          <!-- Modify Save Button -->
          <button @click="saveChanges" class="toolbar-btn save-btn" :disabled="!hasChanges">
            Save Changes
          </button>
        </div>

        <!-- Time Controls Display (From TranscriptionMode) -->
        <div class="time-controls">
           <div class="slider-group">
             <div class="input-group">
               <label>Region Start (ms)</label>
               <input
                 type="number"
                 :value="Math.round(timeRange.start*1000)"
                 readonly
               />
             </div>
             <div class="input-group">
               <label>Region End (ms)</label>
               <input
                 type="number"
                 :value="Math.round(timeRange.end*1000)"
                 readonly
               />
             </div>
           </div>
         </div>

        <!-- Word Editor Area (Adopt TranscriptionMode structure) -->
        <div class="content-wrapper">
          <div class="words-list">
            <!-- Add button before first word -->
            <template v-if="currentSession.words.length > 0">
              <div class="add-word-button-container">
                  <button @click="openAddWordModal(0)" class="add-word-button">+</button>
              </div>
            </template>
            <!-- Or if list is empty -->
            <template v-else>
               <div class="add-word-button-container">
                  <button @click="openAddWordModal(0)" class="add-word-button">Add First Word</button>
              </div>
            </template>

            <template v-for="(word, index) in currentSession.words" :key="word.id || index">
              <div
                :class="[
                  'word-item',
                  {
                    'selected': selectedWordIndex === index,
                    'qc-pass': word.qc,
                    'qc-fail': !word.qc,
                    'timestamp-overlap': word.hasOverlap,
                    'marked': word.mark
                  }
                ]"
                @click="selectWord(index)"
              >
                <!-- Add Mark Checkbox (Optional, can add later) -->
                 <div class="mark-checkbox-container">
                   <input
                     type="checkbox"
                     class="mark-checkbox"
                     :checked="word.mark"
                     @change="toggleMark(index)"
                     title="Mark for review later"
                   />
                 </div>
                <div class="word-text">
                  <div class="word-content">
                    {{ word.word }}
                    <span v-if="word.edited" class="edited-badge">(edited)</span>
                  </div>
                  <div class="metadata">
                    <span class="timestamps">
                      {{ formatTime(word.start_time) }} - {{ formatTime(word.end_time) }}
                       ({{ formatDuration(calculateDuration(word)) }})
                    </span>
                    <!-- Use QC status from QAMode -->
                    <span
                      :class="['qc-status', word.qc ? 'pass' : 'fail']"
                    >
                      {{ word.qc ? '✔ Pass' : '✗ Fail' }}
                    </span>
                  </div>
                </div>

                <!-- Add Overlap Tooltip (Optional, can add later) -->
                 <div v-if="word.hasOverlap" class="overlap-tooltip">
                   Warning: Timestamp overlaps with another word
                 </div>

                <div class="word-actions">
                  <button class="action-btn edit-btn" @click.stop="selectWord(index)">Edit</button>
                  <button class="action-btn remove-btn" @click.stop="deleteWord(index)">Remove</button>
                </div>
              </div>

              <!-- Add button between words -->
              <div class="add-word-button-container">
                <button @click="openAddWordModal(index + 1)" class="add-word-button">+</button>
              </div>
            </template>
          </div>

          <!-- Static Edit Panel (From TranscriptionMode) -->
          <div class="static-panel edit-panel">
            <h3>{{ editPanelTitle }}</h3>
            <form v-if="selectedWordIndex !== null || selectedSuggestedWordIndex !== null" @submit.prevent="handleEditFormSubmit">
              <div class="form-group">
                <label>Word:</label>
                <input v-model="editForm.word" required />
              </div>
              <div class="form-group">
                <label>Start (ms):</label>
                <input v-model.number="editForm.start_time" type="number" required @change="markAsChanged(); updateSelectionRegion()" />
                 <small v-if="originalSession && originalSession.words[selectedWordIndex]" class="original-value">
                   Original: {{ originalSession.words[selectedWordIndex].start_time }}ms
                 </small>
              </div>
              <div class="form-group">
                <label>End (ms):</label>
                <input v-model.number="editForm.end_time" type="number" required @change="markAsChanged(); updateSelectionRegion()" />
                 <small v-if="originalSession && originalSession.words[selectedWordIndex]" class="original-value">
                   Original: {{ originalSession.words[selectedWordIndex].end_time }}ms
                 </small>
              </div>
               <div class="form-group qc-field">
                 <label>Quality:</label>
                 <select v-model="editForm.qc" @change="markAsChanged">
                   <option :value="true">Pass</option>
                   <option :value="false">Fail</option>
                 </select>
               </div>
              <div class="modal-actions">
                <button type="submit" class="save-button">💾 Apply Edit</button>
                <button type="button" @click="resetWordChanges" class="cancel-button" :disabled="!wordHasChanges">✖ Reset</button>
                 <button type="button" @click="playCurrentRegion" class="play-region">▶️ Play Selection</button>
              </div>
            </form>
             <div v-else>
               <p>Select a word from the list to edit its details, or add a new word.</p>
             </div>
          </div>
        </div>

        <!-- Suggested Words Section -->
        <div v-if="suggestedWordsForDisplay.length > 0" class="suggested-words-container">
          <h3 class="suggested-words-title">Suggested Words</h3>
          <div class="words-list">
            <template v-for="(sWord, sIndex) in suggestedWordsForDisplay" :key="sWord.id">
              <div
                :class="[
                  'word-item',
                  {
                    'selected': selectedSuggestedWordIndex === sIndex,
                    'qc-pass': sWord.qc,
                    'qc-fail': !sWord.qc,
                    'marked': sWord.mark
                  }
                ]"
                @click="selectSuggestedWord(sIndex)"
              >
                <div class="mark-checkbox-container">
                   <input
                     type="checkbox"
                     class="mark-checkbox"
                     :checked="sWord.mark"
                     @change.stop="toggleSuggestedWordMark(sIndex)"
                     title="Mark for review later"
                   />
                 </div>
                <div class="word-text">
                  <div class="word-content">
                    {{ sWord.word }}
                    <span v-if="sWord.edited" class="edited-badge">(edited)</span>
                  </div>
                </div>
                <div class="word-details">
                  <span>{{ formatDuration(sWord.start_time) }}s - {{ formatDuration(sWord.end_time) }}s ({{ formatDuration(sWord.end_time - sWord.start_time) }}s)</span>
                  <span :class="sWord.qc ? 'qc-status-pass' : 'qc-status-fail'">
                    {{ sWord.qc ? '✓ Pass' : '✗ Fail' }}
                  </span>
                </div>
                <div class="word-actions">
                  <button v-if="selectedSuggestedWordIndex !== sIndex" @click.stop="selectSuggestedWord(sIndex)" class="action-btn edit-btn">Edit</button>
                  <button @click.stop="deleteSuggestedWord(sIndex)" class="action-btn remove-btn">Remove</button>
                </div>
                <div v-if="selectedSuggestedWordIndex === sIndex" class="currently-editing-badge">Currently Editing</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Add Word Modal (From TranscriptionMode) -->
       <div v-if="showAddWordModal" class="modal-overlay">
         <div class="modal-content">
           <h3>Add New Word</h3>
           <form @submit.prevent="handleAddWordSubmit">
             <div class="form-group">
               <label>Word:</label>
               <input v-model="addWordForm.word" required />
             </div>
             <div class="form-group">
               <label>Start (ms):</label>
               <input v-model.number="addWordForm.start_time" type="number" required />
             </div>
             <div class="form-group">
               <label>End (ms):</label>
               <input v-model.number="addWordForm.end_time" type="number" required />
             </div>
             <div class="modal-actions">
               <button type="submit" class="save-button">Add Word</button>
               <button type="button" @click="showAddWordModal = false" class="cancel-button">Cancel</button>
             </div>
           </form>
         </div>
       </div>

    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, reactive, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import fileSystemService from '../services/fileSystemService'

export default {
  name: 'QAMode',
  setup() {
    const router = useRouter()
    const wavesurfer = ref(null)
    const waveformRef = ref(null)
    const isLoading = ref(false)
    const loadingMessage = ref('')
    
    // Navigation state
    const listTypes = ref([])
    const selectedListType = ref('')
    const selectedGender = ref('')
    const selectedParticipant = ref('')
    const selectedSession = ref('')
    const participants = ref([])
    const sessions = ref([])
    
    // Waveform state
    const isPlaying = ref(false)
    const zoom = ref(50)
    const timeRange = ref({ start: 0, end: 0 })
    
    // Content state
    const currentSession = ref(null)
    const selectedWordIndex = ref(null)
    const selectedSuggestedWordIndex = ref(null)
    const currentRegion = ref(null)
    const originalSession = ref(null)
    const hasChanges = ref(false)
    const wordHasChanges = ref(false)

    // Editing State (From TranscriptionMode)
    const editForm = reactive({
        word: '',
        start_time: 0,
        end_time: 0,
        qc: true,
        edited: false,
        insertIndex: 0
    })

    // New: Computed property for suggested words, ensuring necessary properties for UI
    const suggestedWordsForDisplay = computed(() => {
      if (currentSession.value && Array.isArray(currentSession.value.suggested_words)) {
        return currentSession.value.suggested_words.map((sw, index) => ({
          ...sw,
          id: sw.id || `suggested-${Date.now()}-${index}`,
          qc: typeof sw.qc === 'boolean' ? sw.qc : true,
          mark: typeof sw.mark === 'boolean' ? sw.mark : false,
          edited: sw.edited || false,
          // Ensure start_time and end_time are numbers for calculations
          start_time: Number(sw.start_time) || 0,
          end_time: Number(sw.end_time) || 0,
        }));
      }
      return [];
    });

    // Add Word Modal State (ensure these are defined)
    const showAddWordModal = ref(false);
    const addWordForm = reactive({
      word: '',
      start_time: 0,
      end_time: 0,
      qc: true,
      mark: false,
      insertIndex: 0
    });

    // Navigation methods
    const goBack = () => {
      if (hasChanges.value) {
        const shouldProceed = confirm('You have unsaved changes. Are you sure you want to leave this page?')
        if (!shouldProceed) return
      }
      router.push({ name: 'modes' })
    }

    const loadListTypes = async () => {
      isLoading.value = true
      loadingMessage.value = 'Loading list types...'
      
      const types = await fileSystemService.getListTypes()
      listTypes.value = types
      
      isLoading.value = false
    }

    const onListTypeChange = async () => {
      if (!selectedListType.value) return
      
      selectedGender.value = ''
      selectedParticipant.value = ''
      selectedSession.value = ''
      participants.value = []
      sessions.value = []
      currentSession.value = null
    }

    const onGenderChange = async () => {
      if (!selectedGender.value) return
      
      isLoading.value = true
      loadingMessage.value = 'Loading participants...'
      
      selectedParticipant.value = ''
      selectedSession.value = ''
      sessions.value = []
      currentSession.value = null
      
      const participantsList = await fileSystemService.getParticipants(
        selectedListType.value, 
        selectedGender.value
      )
      participants.value = participantsList
      
      isLoading.value = false
    }

    const onParticipantChange = async () => {
      if (!selectedParticipant.value) return
      
      isLoading.value = true
      loadingMessage.value = 'Loading sessions...'
      
      selectedSession.value = ''
      currentSession.value = null
      
      const sessionsList = await fileSystemService.getSessions(
        selectedListType.value, 
        selectedGender.value, 
        selectedParticipant.value
      )
      sessions.value = sessionsList
      
      isLoading.value = false
    }

    // WaveSurfer initialization
    const initWaveSurfer = () => {
      console.log('Initializing WaveSurfer...')
      
      if (wavesurfer.value) {
        wavesurfer.value.destroy()
        wavesurfer.value = null
      }
      
      if (!waveformRef.value) {
          console.error('Waveform container ref not found')
          setTimeout(initWaveSurfer, 100);
          return;
      }
      
      try {
        wavesurfer.value = WaveSurfer.create({
          container: waveformRef.value,
          waveColor: '#4A76A8',
          progressColor: '#7FB3D5',
          cursorColor: '#3498DB',
          height: 100,
          normalize: true,
          plugins: [
            RegionsPlugin.create({
              dragSelection: true,
              slop: 5
            })
          ]
        })
        
        console.log('WaveSurfer initialized successfully')
        
        wavesurfer.value.on('ready', () => {
          console.log('WaveSurfer is ready')
          zoom.value = wavesurfer.value.options.minPxPerSec;
          createWordRegions()
        })
        
        wavesurfer.value.on('play', () => {
          isPlaying.value = true
        })
        
        wavesurfer.value.on('pause', () => {
          isPlaying.value = false
        })
        
        wavesurfer.value.on('finish', () => {
          isPlaying.value = false
        })

        wavesurfer.value.on('region-created', (region) => {
            console.log('Region created:', region.id);
             if (region.id !== 'selection' && currentRegion.value) {
                 console.log("Removing old selection region");
                 currentRegion.value.remove();
             }
             region.id = 'selection';
             currentRegion.value = region;
             timeRange.value = { start: region.start, end: region.end };

             region.on('update-end', () => {
                 console.log('Selection region updated');
                 timeRange.value = { start: region.start, end: region.end };
                 if (selectedWordIndex.value !== null && editForm.word) {
                     editForm.start_time = Math.round(region.start * 1000);
                     editForm.end_time = Math.round(region.end * 1000);
                     markAsChanged();
                 }
             });
             region.on('click', (e) => {
                e.stopPropagation();
                wavesurfer.value.play(region.start, region.end);
             });
        });

        wavesurfer.value.on('region-updated', (region) => {
            if (region.id === 'selection') {
                timeRange.value = { start: region.start, end: region.end };
            }
        });

         wavesurfer.value.on('region-removed', (region) => {
             if (region.id === 'selection' && currentRegion.value === region) {
                 currentRegion.value = null;
                 timeRange.value = { start: 0, end: 0 };
             }
         });

      } catch (error) {
        console.error('Error initializing WaveSurfer:', error)
        alert('Failed to initialize audio waveform: ' + error.message)
      }
    }
    
    // Create regions for all words in the session
    const createWordRegions = () => {
      if (!wavesurfer.value || !wavesurfer.value.regions || !currentSession.value) {
        console.warn('Cannot create regions - WaveSurfer not ready or no session loaded')
        return
      }
      
      try {
        // Clear only non-selection regions first
        Object.values(wavesurfer.value.regions.list).forEach(reg => {
            if (reg.id !== 'selection') {
                reg.remove();
            }
        });
        
        currentSession.value.words.forEach((word, index) => {
          const start = word.start_time / 1000 // Convert ms to seconds
          const end = word.end_time / 1000
          
          wavesurfer.value.regions.add({
            id: `word_${index}`,
            start: start,
            end: end,
            color: word.qc ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
            drag: false,
            resize: false,
            attributes: {
                type: 'word-region'
            }
          })
        })
        
        console.log('Created background regions for all words')
      } catch (error) {
        console.error('Error creating word regions:', error)
      }
    }
    
    // Clear all regions
    const clearAllRegions = () => {
      if (!wavesurfer.value || !wavesurfer.value.regions) return
      
      try {
        Object.keys(wavesurfer.value.regions.list).forEach(id => {
          wavesurfer.value.regions.list[id].remove()
        })
      } catch (error) {
        console.error('Error clearing regions:', error)
      }
    }
    
    // Load a session
    const loadSession = async () => {
      if (!selectedSession.value) return
      
      if (hasChanges.value) {
        const confirmDiscard = confirm("You have unsaved changes. Are you sure you want to load a new session? Your changes will be lost.")
        if (!confirmDiscard) {
          // Reset the session dropdown to the previously selected session if possible, or clear it
          // This logic might need adjustment based on how you store the "previous" selectedSession
          selectedSession.value = currentSession.value ? currentSession.value.fileName || '' : '';
          return;
        }
      }
      
      isLoading.value = true
      loadingMessage.value = 'Loading session data...'
      selectedWordIndex.value = null
      selectedSuggestedWordIndex.value = null

      try {
        // Reset state
        currentSession.value = null
        if (wavesurfer.value) {
          clearAllRegions()
          wavesurfer.value.empty()
        } else {
            initWaveSurfer()
        }
        
        // Load session data
        const sessionData = await fileSystemService.loadSession(
          selectedListType.value,
          selectedGender.value,
          selectedParticipant.value,
          selectedSession.value
        )
        
        if (!sessionData) {
          alert('Failed to load session data.')
          isLoading.value = false
          return
        }
        
        // Add unique IDs if missing (useful for v-for key) and default mark/overlap
        sessionData.words = sessionData.words.map((word, index) => ({
            ...word,
            id: word.id || `word-${Date.now()}-${index}`,
            qc: typeof word.qc === 'boolean' ? word.qc : true,
            mark: typeof word.mark === 'boolean' ? word.mark : false,
            hasOverlap: false
        }))
        
        originalSession.value = JSON.parse(JSON.stringify(sessionData))
        currentSession.value = sessionData
        hasChanges.value = false
        
        // Load audio data
        loadingMessage.value = 'Loading audio data...'
        
        const audioFileName = selectedSession.value.replace('.json', '.wav')
        
        const audioData = await fileSystemService.getAudioFile(
          selectedListType.value, 
          selectedGender.value,
          selectedParticipant.value, 
          audioFileName
        )
        
        if (!audioData) {
          alert('Failed to load audio file.')
          isLoading.value = false
          return
        }
        
        if (wavesurfer.value) {
          const blob = new Blob([audioData])
          await wavesurfer.value.loadBlob(blob)
          console.log('Audio loaded into WaveSurfer')
        } else {
          console.error('WaveSurfer not initialized')
          alert('Audio waveform could not be initialized.')
        }

        // Initial overlap check after loading
        await nextTick()
        checkTimestampOverlaps()

      } catch (error) {
        console.error('Error loading session:', error)
        alert('Error loading session: ' + error.message)
        currentSession.value = null
        originalSession.value = null
        selectedWordIndex.value = null
        selectedSuggestedWordIndex.value = null
        if (wavesurfer.value) wavesurfer.value.empty()
      } finally {
        isLoading.value = false
      }
    }
    
    // Select a word for editing
    const selectWord = (index) => {
      if (!currentSession.value || !currentSession.value.words[index]) return;
      selectedWordIndex.value = index;
      selectedSuggestedWordIndex.value = null;
      const word = currentSession.value.words[index];
      editForm.word = word.word;
      editForm.start_time = word.start_time;
      editForm.end_time = word.end_time;
      editForm.qc = typeof word.qc === 'boolean' ? word.qc : true;
      editForm.edited = word.edited || false;
      wordHasChanges.value = false;
      scrollToEditForm();
    }
    
    // New: Select a suggested word
    const selectSuggestedWord = (index) => {
      if (!currentSession.value || !currentSession.value.suggested_words || !currentSession.value.suggested_words[index]) return;
      selectedSuggestedWordIndex.value = index;
      selectedWordIndex.value = null;
      const word = currentSession.value.suggested_words[index];
      editForm.word = word.word;
      editForm.start_time = word.start_time;
      editForm.end_time = word.end_time;
      editForm.qc = typeof word.qc === 'boolean' ? word.qc : true;
      wordHasChanges.value = false;
      scrollToEditForm();
    }
    
    // Update the selection region for the currently selected word
    const updateSelectionRegion = (start, end) => {
      if (!wavesurfer.value || !wavesurfer.value.regions) return
      
      const startTime = start / 1000
      const endTime = end / 1000
      
      if (currentRegion.value) {
        if (Math.abs(currentRegion.value.start - startTime) > 0.001 || Math.abs(currentRegion.value.end - endTime) > 0.001) {
          console.log(`Updating selection region to ${startTime} - ${endTime}`)
          currentRegion.value.un('update-end')
          currentRegion.value.update({ start: startTime, end: endTime })
          currentRegion.value.on('update-end', () => {
            timeRange.value = { start: currentRegion.value.start, end: currentRegion.value.end }
            if (selectedWordIndex.value !== null && editForm.word) {
              editForm.start_time = Math.round(currentRegion.value.start * 1000)
              editForm.end_time = Math.round(currentRegion.value.end * 1000)
              markAsChanged()
            }
          })
          timeRange.value = { start: startTime, end: endTime }
        }
      } else {
        console.log(`Creating selection region ${startTime} - ${endTime}`)
        wavesurfer.value.regions.add({
          start: startTime,
          end: endTime,
          color: 'rgba(0, 100, 255, 0.2)',
          drag: true,
          resize: true
        })
      }
      
      wavesurfer.value.seekTo(startTime / wavesurfer.value.getDuration())
    }
    
    // Play/pause audio
    const playPause = () => {
      if (wavesurfer.value) wavesurfer.value.playPause()
    }
    
    // Play the current selection only
    const playCurrentRegion = () => {
      if (currentRegion.value) {
        wavesurfer.value.play(currentRegion.value.start, currentRegion.value.end)
      } else if (selectedWordIndex.value !== null) {
        const word = currentSession.value.words[selectedWordIndex.value]
        wavesurfer.value.play(word.start_time / 1000, word.end_time / 1000)
      }
    }
    
    // Zoom controls
    const zoomIn = () => {
      if (wavesurfer.value) wavesurfer.value.zoom(wavesurfer.value.options.minPxPerSec + 10)
    }
    
    const zoomOut = () => {
      if (wavesurfer.value) wavesurfer.value.zoom(wavesurfer.value.options.minPxPerSec - 10)
    }
    
    // Mark session as changed
    const markAsChanged = () => {
      if (!currentSession.value) return;
      
      hasChanges.value = true;
      if (selectedWordIndex.value !== null && editForm.word) {
          wordHasChanges.value = true;
      }
    }
    
    // Reset word changes
    const resetWordChanges = () => {
      let originalWord;
      if (selectedWordIndex.value !== null && currentSession.value && currentSession.value.words[selectedWordIndex.value]) {
        originalWord = currentSession.value.words[selectedWordIndex.value];
      } else if (selectedSuggestedWordIndex.value !== null && currentSession.value && currentSession.value.suggested_words && currentSession.value.suggested_words[selectedSuggestedWordIndex.value]) {
        originalWord = currentSession.value.suggested_words[selectedSuggestedWordIndex.value];
      }
      
      if (originalWord) {
        editForm.word = originalWord.word;
        editForm.start_time = originalWord.start_time;
        editForm.end_time = originalWord.end_time;
        editForm.qc = typeof originalWord.qc === 'boolean' ? originalWord.qc : true;
        wordHasChanges.value = false;
      }
    }
    
    // Save changes
    const saveChanges = async () => {
      if (!currentSession.value || !selectedSession.value) {
        alert('No session loaded to save.');
        return;
      }
      console.log('[QAMode] Attempting to save changes for session:', selectedSession.value);
      // console.log('[QAMode] Data to save (raw currentSession):', JSON.parse(JSON.stringify(currentSession.value)));


      isLoading.value = true;
      loadingMessage.value = 'Saving changes...';

      try {
        const sessionDataToSave = JSON.parse(JSON.stringify(currentSession.value));
        sessionDataToSave.words = sessionDataToSave.words.map(word => {
          const processedWord = { ...word };
          if (processedWord.mark !== true) { // More explicit check
            delete processedWord.mark;
          }
          delete processedWord.hasOverlap;
          // Be careful with deleting ID if it's expected by other parts of your system
          // If ID is purely for Vue's :key and not part of the data model, then it's fine.
          // delete processedWord.id; 
          return processedWord;
        });
        
        // Optionally remove any top-level temporary properties from sessionDataToSave if needed
        // delete sessionDataToSave.fileName; // If fileName is just for UI selection

        console.log('[QAMode] Processed data for saving (sessionDataToSave - first 200 chars):', JSON.stringify(sessionDataToSave).substring(0,200));
        console.log(`[QAMode] Calling fileSystemService.saveSession with params:
          ListType: ${selectedListType.value}
          Gender: ${selectedGender.value}
          Participant: ${selectedParticipant.value}
          Filename: ${selectedSession.value}`);

        // The response will now be an object: { success: boolean, filePath?: string, content?: string, error?: string }
        const response = await fileSystemService.saveSession(
          selectedListType.value,
          selectedGender.value,
          selectedParticipant.value,
          selectedSession.value, 
          sessionDataToSave      
        );

        console.log('[QAMode] fileSystemService.saveSession returned:', response);

        if (response && response.success) {
          alert('Changes saved successfully!');
          console.log(`[QAMode] Save reported as successful.`);
          console.log(`[QAMode] File was saved to (according to main process): ${response.filePath}`);
          
          if (response.content) {
            console.log(`[QAMode] Content of the saved file (${response.filePath}):`);
            console.log(response.content);
          } else if (response.readError) {
            console.warn(`[QAMode] File saved, but could not read it back. Read error: ${response.readError}`);
          } else {
            console.warn(`[QAMode] File saved, but no content was returned for viewing in console.`);
          }
          
          hasChanges.value = false;
          wordHasChanges.value = false;
          
          // Update originalSession to reflect the saved state, using the processed data
          // This ensures "Reset Word Changes" works correctly against the newly saved state.
          originalSession.value = JSON.parse(JSON.stringify(sessionDataToSave));
          
          // Update currentSession to match exactly what was saved (e.g., 'mark' property removed if false)
          // This keeps the reactive state consistent with the persisted data.
          currentSession.value.words = sessionDataToSave.words.map((savedWord, idx) => ({
            ...savedWord,
            id: currentSession.value.words[idx].id, // Preserve UI id
            hasOverlap: currentSession.value.words[idx].hasOverlap, // Preserve UI overlap status
            // Ensure 'mark' and 'qc' are booleans for UI
            mark: typeof savedWord.mark === 'boolean' ? savedWord.mark : false,
            qc: typeof savedWord.qc === 'boolean' ? savedWord.qc : true,
          }));


          if (wavesurfer.value && wavesurfer.value.isReady) {
            createWordRegions(); 
            if (selectedWordIndex.value !== null && currentSession.value.words[selectedWordIndex.value]) {
              const sw = currentSession.value.words[selectedWordIndex.value];
              updateSelectionRegion(sw.start_time / 1000, sw.end_time / 1000);
            }
          }
        } else {
          alert(`Failed to save changes. ${response && response.error ? response.error : 'Unknown error. Check console.'}`);
          console.error('[QAMode] Save failed. Response from service:', response);
        }
      } catch (error) {
        console.error('Error saving changes:', error);
        alert('An error occurred while saving changes: ' + error.message);
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
      }
    };
    
    // Formatting methods
    const formatTime = (milliseconds) => {
      return `${(milliseconds / 1000).toFixed(3)}s`
    }
    
    const formatDuration = (milliseconds) => {
      return `${(milliseconds / 1000).toFixed(3)}s`
    }
    
    const calculateDuration = (word) => {
      return word.end_time - word.start_time
    }
    
    // Overlap checking
    const checkTimestampOverlaps = () => {
      if (!currentSession.value || !currentSession.value.words) return
      console.log("Checking for timestamp overlaps...")
      let changed = false
      const words = currentSession.value.words
      const sortedWords = [...words].sort((a, b) => a.start_time - b.start_time)

      for (let i = 0; i < sortedWords.length; i++) {
        let currentOverlap = false
        if (i + 1 < sortedWords.length) {
          if (sortedWords[i].end_time > sortedWords[i + 1].start_time) {
            currentOverlap = true
          }
        }
        const originalWordIndex = words.findIndex(w => w.id === sortedWords[i].id || words.indexOf(w) === words.indexOf(sortedWords[i]))
        if (originalWordIndex !== -1 && words[originalWordIndex].hasOverlap !== currentOverlap) {
          words[originalWordIndex].hasOverlap = currentOverlap
          changed = true
        }

        if (i > 0) {
          if (sortedWords[i-1].end_time > sortedWords[i].start_time) {
            const originalWordIndexPrev = words.findIndex(w => w.id === sortedWords[i-1].id || words.indexOf(w) === words.indexOf(sortedWords[i-1]))
            if (originalWordIndexPrev !== -1 && !words[originalWordIndexPrev].hasOverlap) {
              words[originalWordIndexPrev].hasOverlap = true
              changed = true
            }
          }
        }
      }
      if (changed) {
        console.log("Overlap status updated.")
      } else {
        console.log("No overlap changes detected.")
      }
    }
    
    // Add/Delete/Mark logic
    const openAddWordModal = (index) => {
      addWordForm.insertIndex = index;
      addWordForm.word = '';
      // Attempt to prefill start/end times based on surrounding words or current region
      if (index > 0 && currentSession.value.words[index - 1]) {
        addWordForm.start_time = currentSession.value.words[index - 1].end_time;
      } else if (wavesurfer.value && wavesurfer.value.getDuration() > 0) {
        // Default to current region start if no preceding word
        const regions = wavesurfer.value.plugins[0].regions;
        if (regions && regions.length > 0 && regions[0].start) {
             addWordForm.start_time = parseFloat(regions[0].start.toFixed(3)) * 1000;
        } else {
            addWordForm.start_time = 0;
        }
      } else {
        addWordForm.start_time = 0;
      }

      if (currentSession.value.words[index]) {
        addWordForm.end_time = currentSession.value.words[index].start_time;
      } else if (wavesurfer.value && wavesurfer.value.getDuration() > 0) {
         const regions = wavesurfer.value.plugins[0].regions;
         if (regions && regions.length > 0 && regions[0].end) {
            addWordForm.end_time = parseFloat(regions[0].end.toFixed(3)) * 1000;
         } else {
            addWordForm.end_time = addWordForm.start_time + 500; // Default 500ms duration
         }
      } else {
        addWordForm.end_time = addWordForm.start_time + 500; // Default 500ms duration
      }
      
      addWordForm.qc = true;
      addWordForm.mark = false;
      showAddWordModal.value = true;
    }

    const handleAddWordSubmit = () => {
      if (addWordForm.word.trim() === '') {
        alert('Word cannot be empty.');
        return;
      }
      const newStartTime = Number(addWordForm.start_time);
      const newEndTime = Number(addWordForm.end_time);

      if (isNaN(newStartTime) || isNaN(newEndTime) || newStartTime < 0 || newEndTime < 0 || newStartTime >= newEndTime) {
        alert('Invalid start or end time. End time must be greater than start time, and both must be non-negative.');
        return;
      }

      const newWord = {
        id: `word-${Date.now()}-${Math.random()}`, // Ensure unique ID
        word: addWordForm.word,
        start_time: newStartTime,
        end_time: newEndTime,
        qc: addWordForm.qc,
        mark: addWordForm.mark,
        edited: true, // Mark as edited since it's new
      };

      currentSession.value.words.splice(addWordForm.insertIndex, 0, newWord);
      hasChanges.value = true;
      showAddWordModal.value = false;
      checkTimestampOverlaps();
      createWordRegions();
      // Optionally select the newly added word
      // selectWord(addWordForm.insertIndex);
    }

    const deleteWord = (index) => {
      if (confirm(`Are you sure you want to delete "${currentSession.value.words[index].word}"?`)) {
        const updatedWords = [...currentSession.value.words]
        updatedWords.splice(index, 1)
        currentSession.value.words = updatedWords

        if (selectedWordIndex.value === index) {
          selectedWordIndex.value = null
          editForm.word = ''
          if (currentRegion.value) currentRegion.value.remove()
        } else if (selectedWordIndex.value > index) {
          selectedWordIndex.value--
        }

        markAsChanged()
        checkTimestampOverlaps()
        createWordRegions()
      }
    }

    const toggleMark = (index) => {
      if (currentSession.value && currentSession.value.words[index]) {
        const word = currentSession.value.words[index];
        word.mark = !word.mark;
        word.edited = true; // Marking/unmarking is an edit
        hasChanges.value = true;
        // No need to call markAsChanged() if directly mutating and hasChanges is set
      }
    };

    // New: Toggle mark for suggested word
    const toggleSuggestedWordMark = (index) => {
      if (currentSession.value && currentSession.value.suggested_words && currentSession.value.suggested_words[index]) {
        const word = currentSession.value.suggested_words[index];
        word.mark = !word.mark;
        word.edited = true;
        hasChanges.value = true;
      }
    };

    // New: Delete suggested word
    const deleteSuggestedWord = (index) => {
      if (currentSession.value && currentSession.value.suggested_words) {
        if (confirm(`Are you sure you want to remove the suggested word "${currentSession.value.suggested_words[index].word}"?`)) {
          currentSession.value.suggested_words.splice(index, 1);
          hasChanges.value = true;
          if (selectedSuggestedWordIndex.value === index) {
            selectedSuggestedWordIndex.value = null; // Clear selection if deleted
          } else if (selectedSuggestedWordIndex.value > index) {
            selectedSuggestedWordIndex.value--; // Adjust index if an earlier item was deleted
          }
        }
      }
    };

    const editPanelTitle = computed(() => {
      if (selectedWordIndex.value !== null || selectedSuggestedWordIndex.value !== null) {
        return 'Edit Word';
      }
      return 'Select a Word to Edit';
    });

    const scrollToEditForm = () => {
      // Implement scroll logic to focus on the edit form
    }

    // Define the applyWordEdit function that's used in your template
    const applyWordEdit = () => {
      if (!editForm.word.trim()) {
        alert('Word text cannot be empty.');
        return;
      }
      
      // Validate timestamps
      const newStartTime = Number(editForm.start_time);
      const newEndTime = Number(editForm.end_time);
      
      if (isNaN(newStartTime) || isNaN(newEndTime) || newStartTime < 0 || newEndTime <= newStartTime) {
        alert('Invalid timestamps. End time must be greater than start time, and both must be non-negative.');
        return;
      }
      
      // Apply the edit to the selected word
      if (selectedWordIndex.value !== null && currentSession.value && currentSession.value.words[selectedWordIndex.value]) {
        const word = currentSession.value.words[selectedWordIndex.value];
        word.word = editForm.word;
        word.start_time = newStartTime;
        word.end_time = newEndTime;
        word.qc = editForm.qc;
        word.edited = true;
        
        // Update UI state
        hasChanges.value = true;
        wordHasChanges.value = false;
        
        // Update visualizations
        checkTimestampOverlaps();
        updateSelectionRegion(selectedWordIndex.value);
      }
    };
    
    // Alternative approach: create a wrapper function if applyWordEdit is giving issues
    const handleEditFormSubmit = () => {
      applyWordEdit();
    };

    // Lifecycle hooks
    onMounted(() => {
      loadListTypes()
      nextTick(() => {
          if (!wavesurfer.value) {
              initWaveSurfer()
          }
      })
    })
    
    onBeforeUnmount(() => {
      if (wavesurfer.value) {
        wavesurfer.value.destroy()
      }
    })

    watch(() => currentSession.value?.words, (newWords, oldWords) => {
        if (newWords && newWords !== oldWords) {
            nextTick(() => {
                checkTimestampOverlaps()
            })
        }
    }, { deep: true })

    return {
      wavesurfer,
      isLoading,
      loadingMessage,
      listTypes,
      selectedListType,
      selectedGender,
      selectedParticipant,
      selectedSession,
      participants,
      sessions,
      currentSession,
      selectedWordIndex,
      selectedSuggestedWordIndex,
      isPlaying,
      hasChanges,
      wordHasChanges,
      originalSession,
      goBack,
      onListTypeChange,
      onGenderChange,
      onParticipantChange,
      loadSession,
      playPause,
      zoomIn,
      zoomOut,
      saveChanges,
      formatTime,
      formatDuration,
      calculateDuration,
      waveformRef,
      timeRange,
      editForm,
      showAddWordModal,
      addWordForm,
      selectWord,
      selectSuggestedWord,
      applyWordEdit,
      resetWordChanges,
      playCurrentRegion,
      openAddWordModal,
      handleAddWordSubmit,
      deleteWord,
      deleteSuggestedWord,
      toggleMark,
      toggleSuggestedWordMark,
      checkTimestampOverlaps,
      updateSelectionRegion,
      createWordRegions,
      clearAllRegions,
      markAsChanged,
      editPanelTitle,
      suggestedWordsForDisplay,
      scrollToEditForm,
      handleEditFormSubmit,
    }
  }
}
</script>

<style>
.qa-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.top-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border: none;
  background-color: var(--primary-color);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-right: 20px;
}

.heading {
  margin: 0;
  color: var(--primary-color);
}

.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
}

.navigation-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.control-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.control-group label {
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.control-group select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.session-data {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.toolbar-btn {
  padding: 8px 15px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
  margin-left: auto;
}

.save-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.waveform-wrapper {
  width: 100%;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin: 15px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.waveform-wrapper.hidden {
  display: none;
}

.waveform-container {
  width: 100%;
  height: 100px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(57, 134, 168, 0.3);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.placeholder-message {
  padding: 50px;
  text-align: center;
  color: #666;
}

.placeholder-message h2 {
  color: var(--primary-color);
  margin-bottom: 15px;
}

.placeholder-message p {
  margin: 10px 0;
  font-size: 18px;
}

.transcription-container {
  margin-top: 15px;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.words-list {
  flex: 1;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background-color: #f9f9f9;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 6px;
  background-color: white;
  border: 1px solid #eee;
  border-left: 4px solid transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  position: relative;
}

.word-item:hover {
  background-color: #f0f0f0;
}

.word-item.selected {
  background-color: #e3f2fd;
  border-left-color: #2196f3;
}

.word-text {
  flex-grow: 1;
  margin-right: 10px;
}

.word-content {
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 1.05em;
}

.edited-badge {
    font-size: 0.7em;
    color: #888;
    margin-left: 5px;
    font-style: italic;
}

.metadata {
    font-size: 0.85em;
    color: #666;
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.timestamps {
  /* Style as needed */
}

.qc-status {
    font-weight: bold;
}
.qc-status.pass {
    color: #2e7d32;
}
.qc-status.fail {
    color: #c62828;
}

.word-item.qc-pass {
  border-left-color: #2e7d32;
  /* background-color: #e8f5e9; */
}

.word-item.qc-fail {
  border-left-color: #c62828;
   /* background-color: #ffebee; */
}

.word-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.word-actions button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 1.1em;
  color: #555;
  transition: color 0.2s ease;
}
.word-actions button:hover {
  color: #000;
}
.edit-button::before { content: '✏️'; }
.delete-button::before { content: '🗑️'; }
.delete-button:hover { color: #d32f2f; }

.add-word-button-container {
  text-align: center;
  margin: 5px 0;
}
.add-word-button {
  background-color: #e0e0e0;
  border: none;
  color: #555;
  font-weight: bold;
  font-size: 1.2em;
  cursor: pointer;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  line-height: 26px;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.add-word-button:hover {
  background-color: #bdbdbd;
  color: #000;
}

.static-panel {
  width: 350px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
  height: fit-content;
}

.edit-panel h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--primary-color);
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 0.9em;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.original-value {
    display: block;
    color: #666;
    font-size: 0.8em;
    margin-top: 4px;
    font-style: italic;
}

.qc-field {
    display: flex;
    align-items: center;
    gap: 10px;
}
.qc-field label {
    margin-bottom: 0;
    flex-shrink: 0;
}
.qc-field select {
    width: auto;
    flex-grow: 1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px 30px;
  border-radius: 8px;
  min-width: 350px;
  max-width: 500px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--primary-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.modal-actions button,
.edit-panel .modal-actions button {
  padding: 8px 18px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.save-button {
  background-color: var(--primary-color);
  color: white;
}
.save-button:hover {
  background-color: #2c7aaf;
}

.cancel-button, .reset-changes {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
}
.cancel-button:hover, .reset-changes:hover {
  background-color: #e0e0e0;
}
.reset-changes:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}

.play-region {
    background-color: #4CAF50;
    color: white;
}
.play-region:hover {
    background-color: #45a049;
}

.time-controls {
    background-color: #f8f9fa;
    padding: 8px 15px;
    border-radius: 4px;
    margin: 10px 0;
    border: 1px solid #e0e0e0;
}
.slider-group {
    display: flex;
    gap: 20px;
    align-items: center;
}
.input-group {
    display: flex;
    align-items: center;
    gap: 5px;
}
.input-group label {
    font-size: 0.85em;
    color: #555;
}
.input-group input {
    font-size: 0.85em;
    padding: 3px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
    width: 80px;
    background-color: #fff;
}

.word-item.timestamp-overlap {
  border: 1px solid #ffcc00;
  border-left-width: 4px;
  position: relative;
}

.overlap-tooltip {
  visibility: hidden;
  width: 200px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 10px;
  position: absolute;
  z-index: 10;
  bottom: 110%;
  left: 50%;
  margin-left: -100px;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 0.8em;
}

.overlap-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #555 transparent transparent transparent;
}

.word-item.timestamp-overlap:hover .overlap-tooltip {
  visibility: visible;
  opacity: 1;
}

.mark-checkbox-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
}

.mark-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #aaa;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.mark-checkbox:checked {
  background-color: #3986A8;
  border-color: #3986A8;
}

.mark-checkbox:checked::after {
  content: "✓";
  color: white;
  font-size: 12px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.mark-checkbox:hover {
  border-color: #3986A8;
}

.word-item.marked {
   /* Add a subtle indicator, e.g., slightly different background or top border */
   /* background-color: #f0f8ff; */
   border-top: 2px solid #3986A8;
   margin-top: -2px;
}

/* Styles for the Suggested Words Section - completely hidden and non-scrollable */
.suggested-words-container {
  display: none !important; /* Force invisibility */
  height: 0;
  width: 0;
  overflow: hidden !important; /* Prevent any overflow/scrolling */
  overflow-y: hidden !important; /* Explicitly prevent vertical scrolling */
  overflow-x: hidden !important; /* Explicitly prevent horizontal scrolling */
  margin: 0;
  padding: 0;
  border: none;
  visibility: hidden;
  opacity: 0;
  position: absolute;
  pointer-events: none;
  max-height: 0 !important; /* Ensure no vertical space */
  max-width: 0 !important; /* Ensure no horizontal space */
}

/* Also hide any child elements that might cause scrolling */
.suggested-words-container * {
  display: none !important;
  overflow: hidden !important;
}

.suggested-words-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2em;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

/* Simplify action buttons to match TranscriptionMode */
.action-btn {
  background: none;
  border: none;
  color: #3986A8;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: 5px;
  font-size: 0.9em;
  transition: color 0.2s;
  font-weight: normal;
  text-decoration: none;
}

.action-btn.edit-btn:hover {
  text-decoration: underline;
}

.action-btn.remove-btn {
  color: #d9534f;
}

.action-btn.remove-btn:hover {
  text-decoration: underline;
}

.currently-editing-badge {
  /* ... existing styles ... */
}

.word-item {
  /* ... existing styles ... */
}

.word-item.selected {
  /* ... existing styles ... */
}

/* ... other existing styles ... */
</style> 