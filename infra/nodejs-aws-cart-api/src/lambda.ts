import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import serverless = require('serverless-http');
import {AppModule} from "./app.module";

let server: any;

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: false
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
