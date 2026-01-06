import AdmZip from 'adm-zip';
import path from 'path';
import { fileURLToPath } from 'url';
import { processHtml, processCss } from './editFiles.js'

// Настройка путей для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Формируем путь к архиву
const inputZipPath = path.join(__dirname, 'test.zip');
const outputZipPath = path.join(__dirname, 'result.zip');

function getTargetFolder(ext) {
    if (ext === '.css') return 'css/';
    if (['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif'].includes(ext)) return 'img/';
    if (['.js'].includes(ext)) return 'js/';
    if (['.woff', '.woff2', '.ttf'].includes(ext)) return 'fonts/';
    return '';
}

function startSorting() {
    try {
        const oldZip = new AdmZip(inputZipPath);
        const newZip = new AdmZip();
        const oldFiles = oldZip.getEntries();

        oldFiles.forEach(entry => {
            if (entry.isDirectory) return;

            const fileName = entry.entryName;
            const ext = path.extname(fileName).toLowerCase();  // это расширение файла (.css/.jpg/.js)
            const folder = getTargetFolder(ext);
            let content = entry.getData();

            // Если это HTML файл — правим в нем пути
            if (ext === '.html') {
                const updatedHtml = processHtml(content.toString()); // Конвертируем байты в строку и правим
                content = Buffer.from(updatedHtml); // Конвертируем строку обратно в байты (буфер)
            }
            else if (ext === '.css') {
                const updatedCss = processCss(content.toString());
                content = Buffer.from(updatedCss); 
                newZip.addFile(`css/${fileName}`, content);
            } 
            else if (['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif'].includes(ext)) {
                newZip.addFile(`img/${fileName}`, entry.getData());
            } 
            else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
                newZip.addFile(`fonts/${fileName}`, entry.getData());
            } 
            else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
                newZip.addFile(`video/${fileName}`, entry.getData());
            } 
            else if (ext === '.js') {
                newZip.addFile(`js/${fileName}`, entry.getData());
            }

            newZip.addFile(folder + fileName, content);
        });

        newZip.writeZip(outputZipPath);
        console.log('🚀 Готово! Пути в HTML обновлены.');
    } catch (e) {
        console.error("Ошибка:", e.message);
    }
}

startSorting();