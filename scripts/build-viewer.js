require('esbuild').buildSync({ entryPoints: ['src/viewer.js'], bundle: true, minify: true, format: 'iife', outfile: 'public/js/viewer.bundle.js', target: 'es2019' });
console.log('viewer.bundle.js listo');
