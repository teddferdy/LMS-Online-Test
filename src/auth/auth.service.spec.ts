import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

function applySelect<T extends Record<string, unknown>>(
  user: T,
  select?: Record<string, boolean>,
): Partial<T> {
  if (!select) return user;
  return Object.fromEntries(
    Object.keys(select)
      .filter((key) => select[key] && key in user)
      .map((key) => [key, user[key]]),
  ) as Partial<T>;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  const guruUser = {
    id: 'guru-1',
    name: 'Pak Guru',
    email: 'guru@les.com',
    password: 'hashed-password',
    role: Role.GURU,
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
    service = new AuthService(prisma as never, jwtService as never);
  });

  describe('register', () => {
    it('mendaftarkan user baru dengan password ter-hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async (args) =>
        applySelect(
          {
            id: 'user-2',
            name: args.data.name,
            email: args.data.email,
            password: args.data.password,
            role: args.data.role,
            createdAt: new Date(),
          },
          args.select,
        ),
      );

      const result = await service.register({
        name: 'Murid Baru',
        email: 'murid@les.com',
        password: 'rahasia123',
        role: Role.MURID,
      });

      expect(result.message).toBe('Registrasi berhasil');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.role).toBe(Role.MURID);

      const createdData = prisma.user.create.mock.calls[0][0].data;
      expect(createdData.password).not.toBe('rahasia123');
      await expect(
        bcrypt.compare('rahasia123', createdData.password),
      ).resolves.toBe(true);
    });

    it('melempar ConflictException saat email sudah terdaftar', async () => {
      prisma.user.findUnique.mockResolvedValue(guruUser);

      await expect(
        service.register({
          name: 'Duplikat',
          email: 'guru@les.com',
          password: 'rahasia123',
          role: Role.GURU,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('mengembalikan accessToken dan user tanpa password saat kredensial valid', async () => {
      const hashed = await bcrypt.hash('rahasia123', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...guruUser,
        password: hashed,
      });

      const result = await service.login({
        email: 'guru@les.com',
        password: 'rahasia123',
      });

      expect(result.accessToken).toBe('jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: guruUser.id,
        email: guruUser.email,
        role: Role.GURU,
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('melempar UnauthorizedException saat email tidak ditemukan', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@les.com', password: 'rahasia123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('melempar UnauthorizedException saat password salah', async () => {
      const hashed = await bcrypt.hash('rahasia123', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...guruUser,
        password: hashed,
      });

      await expect(
        service.login({ email: 'guru@les.com', password: 'password-salah' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('mengembalikan profil user tanpa password', async () => {
      prisma.user.findUnique.mockImplementation(async (args) =>
        applySelect(guruUser, args.select),
      );

      const result = await service.me('guru-1');

      expect(result).toEqual(
        expect.objectContaining({ id: 'guru-1', email: 'guru@les.com' }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('melempar UnauthorizedException saat user tidak ditemukan', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('tidak-ada')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
