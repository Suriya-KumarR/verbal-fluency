const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: false,
      preload: 'src/preload.js',
      builderOptions: {
        appId: 'com.example.verbal-fluency',
        productName: 'Verbal Fluency',
        win: {
          target: 'nsis'
        },
        mac: {
          target: 'dmg'
        },
        linux: {
          target: 'AppImage'
        },
        extraResources: [
          {
            from: 'file_storage',
            to: 'file_storage',
            filter: ['**/*']
          }
        ]
      }
    }
  }
})
