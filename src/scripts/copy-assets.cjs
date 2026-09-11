const fs = require('fs');
const path = require('path');

const projectPath = path.resolve(__dirname, '../..');
const sourcePath = path.join(projectPath, 'src');
const outputPath = path.join(projectPath, 'dist');

function copy(source, destination) {
    if (fs.statSync(source).isDirectory()) {
        fs.mkdirSync(destination, { recursive: true });
        fs.readdirSync(source).forEach(name => {
            copy(path.join(source, name), path.join(destination, name));
        });
        return;
    }

    fs.copyFileSync(source, destination);
}

fs.mkdirSync(outputPath, { recursive: true });
['public', 'resources', 'config.json'].forEach(name => {
    copy(path.join(sourcePath, name), path.join(outputPath, name));
});
copy(path.join(sourcePath, '.dist'), outputPath);
console.log('Configuração e recursos copiados para dist.');
