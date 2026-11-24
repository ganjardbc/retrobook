import { Body, Controller, Get, INestApplication, NotFoundException, Post } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { IsString, MinLength } from 'class-validator'
import request from 'supertest'
import { AppException } from './app-exception'
import { configureApp } from './configure-app'
import { validateEnv } from '../config/env.validation'

class CreateDto {
  @IsString() @MinLength(8, { message: 'Password minimal 8 karakter' }) password!: string
}

@Controller('t')
class TestController {
  @Get('conflict') conflict() {
    throw new AppException(409, 'EMAIL_TAKEN', 'Email sudah dipakai')
  }
  @Get('missing') missing() {
    throw new NotFoundException()
  }
  @Get('boom') boom() {
    throw new Error('secret db detail')
  }
  @Post('create') create(@Body() dto: CreateDto) {
    return dto
  }
}

describe('format error dan validasi global', () => {
  let app: INestApplication
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [TestController] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
  })
  afterAll(() => app.close())

  it('AppException membawa kode sendiri', async () => {
    const res = await request(app.getHttpServer()).get('/api/t/conflict')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      statusCode: 409,
      message: 'Email sudah dipakai',
      code: 'EMAIL_TAKEN',
    })
  })

  it('HttpException bawaan dipetakan ke kode default', async () => {
    const res = await request(app.getHttpServer()).get('/api/t/missing')
    expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' })
  })

  it('error tak terduga: 500 tanpa membocorkan detail', async () => {
    const res = await request(app.getHttpServer()).get('/api/t/boom')
    expect(res.status).toBe(500)
    expect(res.body.code).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(res.body)).not.toContain('secret')
  })

  it('validasi DTO gagal: 400 VALIDATION_FAILED dengan array pesan', async () => {
    const res = await request(app.getHttpServer()).post('/api/t/create').send({ password: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      statusCode: 400,
      message: ['Password minimal 8 karakter'],
      code: 'VALIDATION_FAILED',
    })
  })

  it('field di luar DTO ditolak', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/t/create')
      .send({ password: 'abcdefgh', role: 'ADMIN' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_FAILED')
  })
})

describe('validateEnv', () => {
  it('menolak env tanpa JWT_SECRET', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/tidak valid/)
  })
  it('memberi default port dan mengonversi angka', () => {
    const env = validateEnv({ DATABASE_URL: 'mysql://x', JWT_SECRET: 'abcdefgh', API_PORT: '4000' })
    expect(env.API_PORT).toBe(4000)
    expect(env.JWT_ACCESS_TTL).toBe('15m')
  })
})
