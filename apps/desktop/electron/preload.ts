import { contextBridge, ipcRenderer } from 'electron';

const apiBase = ipcRenderer.sendSync('get-api-base') as string;

contextBridge.exposeInMainWorld('desktop', {
  apiBase: apiBase || 'http://localhost:3000',
});
