<template>
  <div class="modes-container">
    <div class="top-bar">
      <h1 class="heading">BKB Transcription Tool</h1>
    </div>
    
    <div class="main-content">
      <h2 class="subtitle">Select a Mode</h2>
      
      <div class="modes-grid">
        <div class="mode-card" @click="navigateTo('transcription')">
          <h3>Transcription Mode</h3>
          <p>Upload audio files and create new transcriptions with timestamps.</p>
          <button class="mode-button">Enter Mode</button>
        </div>
        
        <div class="mode-card" @click="navigateTo('qa')">
          <h3>Quality Assurance Mode</h3>
          <p>Review and edit existing transcriptions for accuracy and quality.</p>
          <button class="mode-button">Enter Mode</button>
        </div>
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.top-bar {
  background-color: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.heading {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 30px;
  color: #555;
  font-size: 20px;
  font-weight: 500;
}

.modes-grid {
  display: flex;
  gap: 30px;
  justify-content: center;
  max-width: 1000px;
  width: 100%;
}

.mode-card {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex: 1;
  max-width: 400px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.mode-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.mode-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #3986A8;
  font-size: 20px;
}

.mode-card p {
  color: #666;
  line-height: 1.5;
  margin-bottom: 25px;
  flex-grow: 1;
}

.mode-button {
  background-color: #3986A8;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  align-self: flex-start;
}

.mode-button:hover {
  background-color: #2c6b8a;
}
</style> 