import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { sorting } from './main.js';

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

// Группируем всё под префиксом /zip-tool
fastify.register(async function (instance) {
    
    // Статика теперь будет доступна по пути /zip-tool/
    instance.register(fastifyStatic, {
        root: path.join(__dirname, 'public'),
        prefix: '/', // Относительно префикса группы
    });

    // Маршрут для обработки: POST /zip-tool/upload
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


fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
    if (err) throw err;
    console.log('🚀 Тулза доступна по адресу: http://localhost:3000/zip-tool/');
});