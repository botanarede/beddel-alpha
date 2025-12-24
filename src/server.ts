/**
 * Beddel Protocol - Server Entry Point
 * 
 * Use: import { createBeddelHandler } from 'beddel/server'
 * 
 * This module provides the server-side handler factory for Next.js API routes.
 * Contains Node.js dependencies - DO NOT import in client code.
 */

export { createBeddelHandler, type BeddelHandlerOptions } from './server/handler';
