import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';
import { AppModule } from './app.module';

let server: ReturnType<typeof serverless> | null = null;

async function bootstrap() {
  const expressApp = express(); // now `express` is a default import and callable
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: false,
  });

  await app.init();

  return serverless(expressApp);
}

export const handler = async (event: any, context: any) => {
  if (!server) {
    server = await bootstrap();
  }
  return server(event, context);
};
