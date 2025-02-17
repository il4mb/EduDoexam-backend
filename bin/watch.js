// Using ES6 import:
import { TscWatchClient } from 'tsc-watch/client.js';
import { tsAddJsExtension } from 'ts-add-js-extension';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const watch = new TscWatchClient();

watch.on('started', () => {
    console.log('Compilation started');
});

watch.on('first_success', () => {
    console.log('First success!');
});

watch.on('success', () => {
    // Your code goes here...
    console.log('Success!');
    console.log(path.resolve(__dirname, "..", "dist"))
    tsAddJsExtension({
        dir: path.resolve(__dirname, "..", "dist"),
        showChanges: false,
        config: {
            dir: path.resolve(__dirname, "..", "dist"),
            showProgress: false,
        }
    });
});

watch.on('compile_errors', () => {
    // Your code goes here...
});

watch.start(
    '--onSuccess', 'node tsc-alias',
    '--project', '.', );

try {
    // do something...
} catch (e) {
    watch.kill(); // Fatal error, kill the compiler instance.
}