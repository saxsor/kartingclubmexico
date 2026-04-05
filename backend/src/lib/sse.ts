import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(slug: string, clientId: string, res: Response): void {
    if (!this.clients.has(slug)) {
      this.clients.set(slug, []);
    }
    this.clients.get(slug)!.push({ id: clientId, res });
  }

  removeClient(slug: string, clientId: string): void {
    const clients = this.clients.get(slug);
    if (!clients) return;
    const filtered = clients.filter((c) => c.id !== clientId);
    if (filtered.length === 0) {
      this.clients.delete(slug);
    } else {
      this.clients.set(slug, filtered);
    }
  }

  emit(slug: string, eventName: string, data: unknown): void {
    const clients = this.clients.get(slug);
    if (!clients || clients.length === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    const dead: string[] = [];
    for (const client of clients) {
      try {
        client.res.write(payload);
      } catch {
        dead.push(client.id);
      }
    }

    for (const id of dead) {
      this.removeClient(slug, id);
    }
  }

  getClientCount(slug: string): number {
    return this.clients.get(slug)?.length ?? 0;
  }
}

export const sseManager = new SSEManager();
