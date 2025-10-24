const { app } = require('electron');
console.log('Electron app loaded:', app !== undefined);
console.log('App version:', app.getVersion());
app.quit();
