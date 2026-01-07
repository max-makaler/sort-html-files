import * as cheerio from 'cheerio';
import path from 'path';

export function processHtml(htmlContent) {
    const phpBlocks = [];
    
    // 1. Прячем PHP блоки
    // Регулярка ищет и <?php ... ?> и <?= ... ?> включая многострочные
    let protectedHtml = htmlContent.replace(/<\?[\s\S]*?\?>/g, (match) => {
        const id = `__PHP_BLOCK_${phpBlocks.length}__`;
        phpBlocks.push(match);
        return id;
    });

    // 2. Загружаем в Cheerio (теперь тут нет PHP, только безопасные строки)
    const $ = cheerio.load(protectedHtml, { decodeEntities: false });

    const updateAttr = (selector, attr, folder) => {
        $(selector).each((i, el) => {
            const val = $(el).attr(attr);
            if (val) {
                // Если в пути есть наш плейсхолдер, не трогаем его
                if (val.includes('__PHP_BLOCK_')) return;

                if (!val.startsWith('http') && !val.startsWith('data:') && !val.startsWith(folder)) {
                    const fileName = path.basename(val);
                    $(el).attr(attr, folder + fileName);
                }
            }
        });
    };

    updateAttr('link[rel="stylesheet"]', 'href', 'css/');
    updateAttr('script[src]', 'src', 'js/');
    updateAttr('img[src]', 'src', 'img/');
    updateAttr('video', 'src', 'video/');
    updateAttr('video source', 'src', 'video/');

    $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('__PHP_BLOCK_')) {
            const ext = path.extname(href).toLowerCase();
            if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
                const fileName = path.basename(href);
                $(el).attr('href', 'fonts/' + fileName);
            }
        }
    });

    // Получаем HTML обратно в виде строки
    let resultHtml = $.html();

    // 3. Возвращаем PHP блоки на место
    phpBlocks.forEach((code, index) => {
        resultHtml = resultHtml.replace(`__PHP_BLOCK_${index}__`, code);
    });

    return resultHtml;
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