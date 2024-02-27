import sockets from "@src/sockets";

require('dotenv').config();

import logger from 'jet-logger';

import server from './server';
import * as http from 'http';
import * as WebSocket from 'ws';
import ChainService from "./services/ChainService";
import BuildQueueService from "@src/services/BuildQueueService";
import CleaningService from "@src/services/CleaningService";

//if(process.env.SPAM_FAUCET) ChainService.spamFaucet();
BuildQueueService.setup();
//CleaningService.setup();

const httpServer = http.createServer(server);
const wss = new WebSocket.Server({ server:httpServer});

wss.on('connection', (ws: WebSocket) => sockets(ws));

httpServer.listen(process.env.WS_PORT || 4001, () => logger.info(`WS LIVE: ${process.env.WS_PORT || 4001}`));
server.listen(process.env.HTTP_PORT || 4000, () => logger.info(`HTTP LIVE: ${process.env.HTTP_PORT || 4000}`));
