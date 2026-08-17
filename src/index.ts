import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const config = loadConfig();

void serveStdio(() => buildServer(config));
console.error(`x-mcp-server running over stdio in ${config.mode} mode`);
