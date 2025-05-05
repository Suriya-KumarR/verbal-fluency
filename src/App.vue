<!-- App.vue -->
<template>
  <div class="app-container">
    <div class="top-bar">
      <h1 class="heading">BKB Task</h1>
    </div>

    <div class="main-content">
      <div class="controls">
        <div class="upload-instructions">
          <p>
            Choose an audio file in one of these formats: 
            <span class="format-list">
              mp3, mp4, mpeg, mpga, m4a, wav, or webm
            </span>. Use the audio waveform to replay sections and edit transcriptions 
            with their corresponding timestamps as needed.
          </p>
        </div>

        <div class="file-input-section">
          <div class="file-input-container">
            <input 
              type="file" 
              id="fileInput" 
              @change="handleFileChange" 
              class="file-input"
              accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
            />
            <label for="fileInput" class="custom-file-upload">
              Choose File
            </label>
            <span class="file-name">
              {{ file ? file.name : 'No file selected' }}
            </span>
          </div>
          <button class="primary-button" @click="uploadFile">
            Upload & Transcribe
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>

      <div ref="waveformRef" class="waveform-container"></div>

      <div v-if="transcription" class="time-controls">
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

      <div v-if="transcription" class="transcription-container">
        <div class="content-wrapper">
          <div class="words-list">
            <template v-for="(word, index) in transcription.words" :key="index">
              <div v-if="index === 0" class="add-word-button-container">
                <button @click="openAddWordModal(0)" class="add-word-button">+</button>
              </div>
              
              <div 
                :class="[
                  'word-item',
                  { 
                    editable: editableWords.includes(word),
                    selected: currentWord?.word === word.word,
                    'qc-pass': word.qc,
                    'qc-fail': !word.qc,
                    'timestamp-overlap': word.hasOverlap,
                    'marked': word.mark
                  }
                ]"
              >
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
                      {{ word.start_time }}ms - {{ word.end_time }}ms
                    </span>
                    <span 
                      :class="['qc-status', word.qc ? 'pass' : 'fail']"
                    >
                      {{ word.qc ? '✔ Correct' : '✗ Incorrect' }}
                    </span>
                  </div>
                </div>
                
                <div v-if="word.hasOverlap" class="overlap-tooltip">
                  Warning: Timestamp overlaps with another word
                </div>
                
                <div class="word-actions">
                  <button
                    v-if="editableWords.includes(word)"
                    @click="openEditModal(word)"
                    class="edit-button"
                  >
                    Edit
                  </button>
                  <button 
                    @click="deleteWord(index)" 
                    class="delete-button"
                    title="Delete word"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div class="add-word-button-container">
                <button @click="openAddWordModal(index + 1)" class="add-word-button">+</button>
              </div>
            </template>
          </div>

          <!-- Edit Panel -->
          <div class="static-panel edit-panel">
            <h3>Edit Response</h3>
            <form v-if="currentWord" @submit.prevent="handleEditSubmit">
              <div class="form-group">
                <label>Word:</label>
                <input
                  v-model="editForm.word"
                  required
                />
              </div>
              <div class="form-group">
                <label>Start (ms):</label>
                <input
                  v-model="editForm.start"
                  type="number"
                  step="0.001"
                  required
                />
                <small v-if="currentWord.original_start_time !== undefined" class="original-value">
                  Original: {{ currentWord.original_start_time }}ms
                </small>
              </div>

              <div class="form-group">
                <label>End (ms):</label>
                <input
                  v-model="editForm.end"
                  type="number"
                  step="0.001"
                  required
                />
                <small v-if="currentWord.original_end_time !== undefined" class="original-value">
                  Original: {{ currentWord.original_end_time }}ms
                </small>
              </div>

              <div class="modal-actions">
                <button type="submit" class="save-button">
                  💾 Save
                </button>
                <button
                  type="button"
                  @click="currentWord = null"
                  class="cancel-button"
                >
                  ✖ Cancel
                </button>
              </div>
            </form>
            <p v-else class="placeholder-text">No words chosen to edit</p>
          </div>

          <!-- QC Panel -->
          <div class="static-panel qc-panel">
            <h3>Quality Check Result</h3>
            <template v-if="currentWord">
              <p>{{ currentWord.qc_word || 'No QC feedback available for this word' }}</p>
              <button 
                @click="currentWord = null" 
                class="cancel-button"
              >
                Close
              </button>
            </template>
            <p v-else class="placeholder-text">
              Select a word to view quality check results
            </p>
          </div>
        </div>
        
        <!-- Moved toolbar to the bottom -->
        <div class="toolbar bottom-toolbar">
          <button class="secondary-button" @click="saveEdits">
            Save All Changes
          </button>
          <button class="secondary-button" @click="downloadJSON">
            Download JSON
          </button>
        </div>
      </div>

      <!-- Add Word Modal -->
      <div v-if="showAddWordModal" class="modal-backdrop">
        <div class="modal">
          <h3>Add New Word</h3>
          <form @submit.prevent="handleAddWordSubmit">
            <div class="form-group">
              <label>Word:</label>
              <input v-model="addWordForm.word" required />
            </div>
            <div class="form-group">
              <label>Start Time (ms):</label>
              <input v-model="addWordForm.start" type="number" required />
            </div>
            <div class="form-group">
              <label>End Time (ms):</label>
              <input v-model="addWordForm.end" type="number" required />
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
import { ref, reactive, watch, onBeforeUnmount } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

//const API_URL = "https://audio-transcription-editor-13c6d97d2e6b.herokuapp.com"
const API_URL = "http://localhost:5149"
//const API_URL = "http://verbal-fluency-asp-net.onrender.com"
//const API_URL =  "https://1bcf-71-95-36-38.ngrok-free.app"
export default {
  setup() {
    const file = ref(null)
    const transcription = ref(null)
    const waveformRef = ref(null)
    const wavesurfer = ref(null)
    const playing = ref(false)
    const editableWords = ref([])
    const currentWord = ref(null)
    const timeRange = reactive({ start: 0, end: 0 })
    const duration = ref(0)
    const loadingMessage = ref('')
    const isLoading = ref(false)
    const editForm = reactive({
      word: '',
      start: 0,
      end: 0
    })
    const showAddWordModal = ref(false)
    const addWordForm = reactive({
      word: '',
      start: 0,
      end: 0,
      insertIndex: 0
    })

    const handleFileChange = (e) => {
      file.value = e.target.files[0]
    }

    const uploadFile = async () => {
      if (!file.value) {
        alert('Please upload a file!');
        return;
      }

      isLoading.value = true;
      loadingMessage.value = 'Transcribing audio...';

      try {
        const formData = new FormData();
        formData.append('file', file.value); // Must match backend parameter name

        const response = await fetch(`${API_URL}/api/file/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // For CORS with credentials
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.detail || errorData.title || `HTTP error! status: ${response.status}`
          );
        }

        const data = await response.json();
        
        // Ensure each word has a mark property
        if (data.words) {
          data.words.forEach(word => {
            if (word.mark === undefined) {
              word.mark = false;
            }
          });
        }
        
        transcription.value = data;
        
        loadingMessage.value = 'Audio transcribed successfully!';
        initializeWaveform(URL.createObjectURL(file.value));

      } catch (error) {
        console.error('Upload error:', {
          error,
          fileInfo: {
            name: file.value.name,
            type: file.value.type,
            size: file.value.size
          }
        });
        
        alert(`Upload failed: ${error.message}`);
      } finally {
        setTimeout(() => {
          isLoading.value = false;
        }, 1000);
      }
    }

    const initializeWaveform = (audioUrl) => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }

  wavesurfer.value = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#4a4a4a',
    progressColor: '#2196F3',
    cursorColor: 'red',
    backend: 'WebAudio',
    height: 100,
    plugins: [RegionsPlugin.create()],
    interact: false,
  })

  const wsRegions = wavesurfer.value.registerPlugin(RegionsPlugin.create())
  let activeRegion = null

  wavesurfer.value.load(audioUrl)

  wavesurfer.value.on('ready', () => {
    duration.value = wavesurfer.value.getDuration()
    timeRange.start = 0
    timeRange.end = duration.value

    // Create main region
    wsRegions.addRegion({
      id: 'main-region',
      start: 0,
      end: duration.value,
      content: 'Selected Region',
      color: 'rgba(255, 0, 0, 0.1)',
      drag: true,
      resize: true,
      minLength: 0.1,
      handleStyle: {
        left: { backgroundColor: 'red', width: '8px' },
        right: { backgroundColor: 'red', width: '8px' },
      },
    })

wsRegions.on('region-in', (region) => {
      activeRegion = region
    })

    wsRegions.on('region-out', (region) => {
      if (activeRegion === region) {
        wavesurfer.value.pause()
        playing.value = false
        activeRegion = null
      }
    })

    wsRegions.on('region-clicked', (region, e) => {
      e.stopPropagation()
      activeRegion = region
      
      if (playing.value) {
        wavesurfer.value.pause()
        playing.value = false
      } else {
        wavesurfer.value.play(region.start, region.end)
        playing.value = true
      }
    })

    // Update time range when region changes
    wsRegions.on('region-updated', (updatedRegion) => {
      if (updatedRegion.id === 'main-region') {
        timeRange.start = updatedRegion.start
        timeRange.end = updatedRegion.end
      }
    })
  })

  // Handle audio finish
  wavesurfer.value.on('finish', () => {
    playing.value = false
    activeRegion = null
  })
}

watch([timeRange, transcription], ([newRange, newTranscription]) => {
  if (newTranscription) {
    editableWords.value = newTranscription.words.filter(word => 
      (word.start_time/1000 < newRange.end) && 
      (word.end_time/1000 > newRange.start)
    )
  }
}, { immediate: true, deep: true })

const togglePlay = () => {
  if (!wavesurfer.value) return
  
  const region = wavesurfer.value.regions.list['main-region']
  if (!region) return

  if (playing.value) {
    wavesurfer.value.pause()
    playing.value = false
  } else {
    wavesurfer.value.play(region.start, region.end)
    playing.value = true
  }
}

    const openEditModal = (word) => {
      currentWord.value = null
      setTimeout(() => {
        currentWord.value = word
        editForm.word = word.word
        editForm.start = word.start_time
        editForm.end = word.end_time
      }, 10)
    }

    const handleEditSubmit = () => {
      // Store original timestamps if this is the first edit
      if (currentWord.value.original_start_time === undefined) {
        currentWord.value.original_start_time = currentWord.value.start_time
        currentWord.value.original_end_time = currentWord.value.end_time
      }

      const updatedWord = {
        ...currentWord.value,
        word: editForm.word,
        start_time: Math.round(parseFloat(editForm.start)),
        end_time: Math.round(parseFloat(editForm.end)),
        edited: true,
        original_start_time: currentWord.value.original_start_time,
        original_end_time: currentWord.value.original_end_time
      }

      const index = transcription.value.words.findIndex(w => w === currentWord.value)
      const updatedWords = [...transcription.value.words]
      updatedWords[index] = updatedWord
      transcription.value.words = updatedWords
      
      // Check for timestamp overlaps
      checkTimestampOverlaps()
      
      currentWord.value = null
    }

    // Updated function to check for timestamp overlaps with more precise definition
    const checkTimestampOverlaps = () => {
      if (!transcription.value || !transcription.value.words) return
      
      // Create a temporary array to store overlap states
      const overlaps = new Array(transcription.value.words.length).fill(false)
      
      // Check each word against all others
      for (let i = 0; i < transcription.value.words.length; i++) {
        const word1 = transcription.value.words[i]
        
        for (let j = 0; j < transcription.value.words.length; j++) {
          if (i === j) continue // Skip comparing with self
          
          const word2 = transcription.value.words[j]
          
          // Check for overlap - only if one word's end time is strictly greater than another's start time
          // Example: word1 (0-200ms) and word2 (200-400ms) is NOT an overlap
          // But word1 (0-201ms) and word2 (200-400ms) IS an overlap
          if ((word1.start_time < word2.end_time && word1.end_time > word2.start_time) ||
              (word2.start_time < word1.end_time && word2.end_time > word1.start_time)) {
            overlaps[i] = true
            break // No need to check further for this word
          }
        }
      }
      
      // Now update all words at once to avoid recursive reactivity issues
      for (let i = 0; i < transcription.value.words.length; i++) {
        transcription.value.words[i].hasOverlap = overlaps[i]
      }
    }

    const saveEdits = async () => {
      try {
        // Check for overlaps before saving
        checkTimestampOverlaps()
        
        const payload = {
          filename: file.value.name,
          duration: transcription.value.duration,
          words: transcription.value.words.map(word => {
            // Create a new object without the hasOverlap property but keep mark
            // eslint-disable-next-line no-unused-vars
            const { hasOverlap, ...wordWithoutOverlap } = word;
            
            // Ensure mark property exists (default to false if not present)
            if (wordWithoutOverlap.mark === undefined) {
              wordWithoutOverlap.mark = false;
            }
            
            return wordWithoutOverlap;
          })
        };

        const response = await fetch(`${API_URL}/api/file/save/${file.value.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          alert('Changes saved successfully');
        } else {
          alert('Error saving changes');
        }
      } catch (error) {
        alert('Error saving changes');
      }
    }

    const downloadJSON = async () => {
      try {
        // Create a clean copy of the transcription data without hasOverlap but with mark
        const cleanData = {
          filename: transcription.value.filename,
          duration: transcription.value.duration,
          words: transcription.value.words.map(word => {
            // Create a new object without hasOverlap
            // eslint-disable-next-line no-unused-vars
            const { hasOverlap, ...cleanWord } = word;
            
            // Ensure mark property exists
            if (cleanWord.mark === undefined) {
              cleanWord.mark = false;
            }
            
            return cleanWord;
          })
        };
        
        // Create a Blob with the JSON data
        const blob = new Blob([JSON.stringify(cleanData, null, 2)], {
          type: 'application/json'
        });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.value.name}_transcription.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading JSON:', error);
        alert('Error downloading JSON');
      }
    }

    const openAddWordModal = (index) => {
      // Calculate suggested timestamps based on surrounding words
      let suggestedStart = 0
      let suggestedEnd = 0
      
      if (transcription.value.words.length === 0) {
        // If no words exist, start at 0
        suggestedStart = 0
        suggestedEnd = 1000 // Default 1 second
      } else if (index === 0) {
        // If inserting before the first word
        suggestedStart = Math.max(0, transcription.value.words[0].start_time - 1000)
        suggestedEnd = transcription.value.words[0].start_time
      } else if (index >= transcription.value.words.length) {
        // If inserting after the last word
        const lastWord = transcription.value.words[transcription.value.words.length - 1]
        suggestedStart = lastWord.end_time
        suggestedEnd = lastWord.end_time + 1000
      } else {
        // If inserting between words
        const prevWord = transcription.value.words[index - 1]
        const nextWord = transcription.value.words[index]
        suggestedStart = prevWord.end_time
        suggestedEnd = nextWord.start_time
      }
      
      addWordForm.start = suggestedStart
      addWordForm.end = suggestedEnd
      addWordForm.word = ''
      addWordForm.insertIndex = index
      showAddWordModal.value = true
    }

    const handleAddWordSubmit = () => {
      const newWord = {
        word: addWordForm.word,
        start_time: Math.round(parseFloat(addWordForm.start)),
        end_time: Math.round(parseFloat(addWordForm.end)),
        edited: true,
        qc: false,
        qc_word: "Could not obtain QC",
        mark: false
      }
      
      // Add the new word to the array
      const updatedWords = [...transcription.value.words, newWord]
      
      // Sort words by start_time
      updatedWords.sort((a, b) => a.start_time - b.start_time)
      
      // Update the transcription
      transcription.value.words = updatedWords
      
      // Check for overlaps
      checkTimestampOverlaps()
      
      // Close the modal
      showAddWordModal.value = false
    }

    const deleteWord = (index) => {
      if (confirm('Are you sure you want to delete this word?')) {
        const updatedWords = [...transcription.value.words]
        updatedWords.splice(index, 1)
        transcription.value.words = updatedWords
        
        // Check for overlaps after deletion
        checkTimestampOverlaps()
      }
    }

    const toggleMark = (index) => {
      const updatedWords = [...transcription.value.words]
      updatedWords[index].mark = !updatedWords[index].mark
      transcription.value.words = updatedWords
      
      // Check for overlaps
      checkTimestampOverlaps()
    }

    onBeforeUnmount(() => {
      if (wavesurfer.value) {
        wavesurfer.value.destroy()
      }
    })

    // Add watch to check for overlaps when transcription changes
    watch(transcription, (newTranscription) => {
      if (newTranscription) {
        // Use setTimeout to break the reactivity chain
        setTimeout(() => {
          checkTimestampOverlaps()
        }, 0)
      }
    }, { deep: false }) // Change to false to prevent deep reactivity

    return {
      file,
      transcription,
      waveformRef,
      playing,
      editableWords,
      currentWord,
      timeRange,
      duration,
      loadingMessage,
      isLoading,
      editForm,
      showAddWordModal,
      addWordForm,
      handleFileChange,
      uploadFile,
      togglePlay,
      openEditModal,
      handleEditSubmit,
      saveEdits,
      downloadJSON,
      checkTimestampOverlaps,
      openAddWordModal,
      handleAddWordSubmit,
      deleteWord,
      toggleMark
    }
  }
}
</script>

<style scoped>
/* Add styles for original timestamp display */
.original-value {
  display: block;
  color: #666;
  font-size: 0.8em;
  margin-top: 2px;
  font-style: italic;
}

/* Styling for the mark checkbox */
.mark-checkbox-container {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
}

.mark-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
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
  font-size: 14px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.mark-checkbox:hover {
  border-color: #3986A8;
}

/* Add a subtle indicator for marked words */
.word-item.marked {
  border-top: 2px solid #3986A8;
}
</style>
