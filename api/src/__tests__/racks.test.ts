import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { getDb } from '../db/connection';

beforeEach(() => {
  getDb().exec('DELETE FROM cables');
  getDb().exec('DELETE FROM components');
  getDb().exec('DELETE FROM racks');
});

describe('Racks API', () => {
  it('GET /api/racks returns empty array initially', async () => {
    const res = await request(app).get('/api/racks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/racks creates a rack', async () => {
    const res = await request(app).post('/api/racks').send({
      name: 'Keller-Rack',
      width: '19"',
      height_u: 12,
      color: '#1c2230',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Keller-Rack');
    expect(res.body.id).toBeDefined();
    expect(res.body.width).toBe('19"');
    expect(res.body.height_u).toBe(12);
  });

  it('GET /api/racks/:id returns a rack', async () => {
    const create = await request(app).post('/api/racks').send({
      name: 'Test', width: '19"', height_u: 6, color: '#000',
    });
    const res = await request(app).get(`/api/racks/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test');
  });

  it('GET /api/racks/:id returns 404 for missing rack', async () => {
    const res = await request(app).get('/api/racks/99999');
    expect(res.status).toBe(404);
  });

  it('PUT /api/racks/:id updates a rack', async () => {
    const create = await request(app).post('/api/racks').send({
      name: 'Test', width: '19"', height_u: 6, color: '#000',
    });
    const id = create.body.id;
    const res = await request(app).put(`/api/racks/${id}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('DELETE /api/racks/:id removes a rack', async () => {
    const create = await request(app).post('/api/racks').send({
      name: 'Del', width: '19"', height_u: 6, color: '#000',
    });
    const id = create.body.id;
    const del = await request(app).delete(`/api/racks/${id}`);
    expect(del.status).toBe(204);
    const res = await request(app).get('/api/racks');
    expect(res.body).toHaveLength(0);
  });

  it('POST /api/racks returns 400 for missing name', async () => {
    const res = await request(app).post('/api/racks').send({ width: '19"', height_u: 12 });
    expect(res.status).toBe(400);
  });

  it('PUT /api/racks/:id returns 404 for missing rack', async () => {
    const res = await request(app).put('/api/racks/99999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('PUT /api/racks/:id returns 400 for invalid body', async () => {
    const create = await request(app).post('/api/racks').send({ name: 'T', width: '19"', height_u: 6, color: '#000' });
    const res = await request(app).put(`/api/racks/${create.body.id}`).send({ height_u: 999 });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/racks/:id returns 404 for missing rack', async () => {
    const res = await request(app).delete('/api/racks/99999');
    expect(res.status).toBe(404);
  });
});
