const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let content = fs.readFileSync(podfilePath, 'utf-8');

      if (!content.includes('use_modular_headers!')) {
        // Prepend use_modular_headers! globally to the Podfile
        content = `use_modular_headers!\n\n${content}`;
        fs.writeFileSync(podfilePath, content, 'utf-8');
        console.log('✅ Added use_modular_headers! to Podfile');
      }
      return config;
    }
  ]);
};
