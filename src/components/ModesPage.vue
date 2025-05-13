<template>
  <div class="modes-container">
    <h1 class="modes-title">Audio Transcription Tool</h1>
    <div class="modes-selection">
      <div class="mode-card" @click="navigateTo('transcription')">
        <div class="mode-icon">🎙️</div>
        <h2>Transcription Mode</h2>
        <p>Upload, transcribe, and edit audio files with precision timing controls.</p>
      </div>
      
      <div class="mode-card" @click="navigateTo('qa')">
        <div class="mode-icon">✓</div>
        <h2>Quality Assurance Mode</h2>
        <p>Review and validate transcriptions for accuracy and completeness.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'

export default {
  name: 'ModesPage',
  setup() {
    const router = useRouter()
    
    const navigateTo = (mode) => {
      router.push({ name: mode })
    }
    
    return {
      navigateTo
    }
  }
}
</script>

<style scoped>
.modes-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  font-family: var(--font-stack);
}

.modes-title {
  text-align: center;
  color: var(--primary-color);
  margin-bottom: 3rem;
  font-size: 2.5rem;
}

.modes-selection {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.mode-card {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  width: 300px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.mode-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.mode-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.mode-card h2 {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.mode-card p {
  color: #666;
  line-height: 1.5;
}
</style> 