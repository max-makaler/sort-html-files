import * as cheerio from 'cheerio';
import path from 'path';

export function processHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);

    // Вспомогательная функция, чтобы не писать 10 раз if/startsWith
    const updateAttr = (selector, attr, folder) => {
        $(selector).each((i, el) => {
            const val = $(el).attr(attr);
            // Если путь есть, он локальный (не http) и еще не начинается с нужной папки
            if (val && !val.startsWith('http') && !val.startsWith('data:') && !val.startsWith(folder)) {
                // Берем только имя файла и добавляем новую папку
                const fileName = path.basename(val);
                $(el).attr(attr, folder + fileName);
            }
        });
    };

    // 1. Стили
    updateAttr('link[rel="stylesheet"]', 'href', 'css/');

    // 2. Скрипты
    updateAttr('script[src]', 'src', 'js/');

    // 3. Картинки
    updateAttr('img[src]', 'src', 'img/');

    // 4. Видео (тег video и вложенные source)
    updateAttr('video', 'src', 'video/');
    updateAttr('video source', 'src', 'video/');

    // 5. Шрифты (если вдруг на них есть прямые ссылки в <a>)
    $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        const ext = path.extname(href).toLowerCase();
        if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
            updateAttr(el, 'href', 'fonts/');
        }
    });

    return $.html();
}


export function processCss(cssContent) {
    // Регулярное выражение ищет url("...") или url(...)
    // Оно "захватывает" только имя файла
    return cssContent.replace(/url\(['"]?([^'")]*)['"]?\)/g, (match, filePath) => {
        // Если это внешняя ссылка (http), не трогаем её
        if (filePath.startsWith('http') || filePath.startsWith('data:')) {
            return match;
        }

        const fileName = path.basename(filePath); // Оставляем только имя файла (например, image.png)
        const ext = path.extname(fileName).toLowerCase();

        // Определяем, куда перенаправить путь
        if (['.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(ext)) {
            return `url('../img/${fileName}')`;
        } 
        if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
            return `url('../fonts/${fileName}')`;
        }

        return match; // Если не узнали расширение, оставляем как было
    });
}