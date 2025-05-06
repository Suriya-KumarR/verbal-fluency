const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
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
        }
      }
    }
  }
})
