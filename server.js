import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

// Импорт логики инструментов
import { sorting } from './tools/zip-tool/main.js';
import { transformCode } from './tools/m1-nl/processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ 
    logger: true,
    bodyLimit: 52428800 // 50MB
});

// Регистрируем multipart глобально
fastify.register(multipart, {
    limits: { fileSize: 52428800 }
});

// --- TOOL 1: ZIP-TOOL (Сортировка архивов) ---
fastify.register(async function (instance) {
    // Статика для zip-tool лежит в public/zip-tool
    instance.register(fastifyStatic, {
        root: path.join(__dirname, 'public/zip-tool'),
        prefix: '/', 
    });

    instance.post('/upload', async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Файл не найден' });

        try {
            const inputBuffer = await data.toBuffer();
            const resultBuffer = sorting(inputBuffer);

            return reply
                .header('Content-Type', 'application/zip')
                .header('Content-Disposition', 'attachment; filename=organized_site.zip')
                .send(resultBuffer);
        } catch (err) {
            return reply.code(500).send({ error: 'Ошибка обработки' });
        }
    });
}, { prefix: '/zip-tool' });


// --- TOOL 2: M1-NL (PHP Реплейсер) ---
fastify.register(async function (instance) {
    // Статика для m1-nl лежит в public/m1-nl
    instance.register(fastifyStatic, {
        root: path.join(__dirname, 'public/m1-nl'),
        prefix: '/',
        decorateReply: false // Важно, так как static уже зарегистрирован выше
    });

    // Маршрут для трансформации текста
    instance.post('/transform', async (request, reply) => {
        const { code } = request.body; // Получаем текст из textarea
        
        if (!code) {
            return reply.code(400).send({ error: 'Код пуст' });
        }

        try {
            const transformed = transformCode(code);
            return { success: true, result: transformed };
        } catch (err) {
            return reply.code(500).send({ error: 'Ошибка при трансформации кода' });
        }
    });
}, { prefix: '/m1-nl' });


fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
    if (err) throw err;
    console.log('🚀 Hub started!');
    console.log('📦 Zip-Tool: http://localhost:3000/zip-tool/');
    console.log('📝 M1-NL:    http://localhost:3000/m1-nl/');
});