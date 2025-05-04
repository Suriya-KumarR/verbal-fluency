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
        <div class="toolbar">
          <button class="secondary-button" @click="saveEdits">
            Save All Changes
          </button>
          <button class="secondary-button" @click="downloadJSON">
            Download JSON
          </button>
        </div>

        <div class="content-wrapper">
          <div class="words-list">
            <div 
              v-for="(word, index) in transcription.words"
              :key="index"
              :class="[
                'word-item',
                { 
                  editable: editableWords.includes(word),
                  selected: currentWord?.word === word.word,
                  'qc-pass': word.qc,
                  'qc-fail': !word.qc
                }
              ]"
            >
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
              
              <button
                v-if="editableWords.includes(word)"
                @click="openEditModal(word)"
                class="edit-button"
              >
                Edit
              </button>
            </div>
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
              </div>

              <div class="form-group">
                <label>End (ms):</label>
                <input
                  v-model="editForm.end"
                  type="number"
                  step="0.001"
                  required
                />
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
      const updatedWord = {
        ...currentWord.value,
        word: editForm.word,
        start_time: Math.round(parseFloat(editForm.start) ),
        end_time: Math.round(parseFloat(editForm.end) ),
        edited: true,
      }

      const index = transcription.value.words.findIndex(w => w === currentWord.value)
      const updatedWords = [...transcription.value.words]
      updatedWords[index] = updatedWord
      transcription.value.words = updatedWords
      currentWord.value = null
    }


    const saveEdits = async () => {
      try {
        const payload = {
          filename: file.value.name,
          duration: transcription.value.duration,
          words: transcription.value.words.map(word => ({
            word: word.word,
            start_time: word.start_time,  
            end_time: word.end_time,      
            edited: word.edited,
            qc: word.qc,
            qc_word: word.qc_word
          }))
        };

        const response = await fetch(`${API_URL}/api/file/update-json/${file.value.name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });


    if (!response.ok) {
      throw new Error('Failed to save edits');
    }
    
    // Verify update by fetching fresh data
    const verifyResponse = await fetch(`${API_URL}/api/file/get-json/${file.value.name}`);
    transcription.value = await verifyResponse.json();
    
    alert('Edits saved and verified!');
  } catch (error) {
    alert(`Save failed: ${error.message}`);
  }
}

    const downloadJSON = async () => {
      try {
        const response = await fetch(`${API_URL}/api/file/download/${file.value.name}`)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${file.value.name}_transcription.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } catch (error) {
        alert('Error downloading JSON')
      }
    }

    onBeforeUnmount(() => {
      if (wavesurfer.value) {
        wavesurfer.value.destroy()
      }
    })

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
      handleFileChange,
      uploadFile,
      togglePlay,
      openEditModal,
      handleEditSubmit,
      saveEdits,
      downloadJSON
    }
  }
}
</script>
