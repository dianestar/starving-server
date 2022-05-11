import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UserEntity } from './entities/user.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PassportModule } from '@nestjs/passport'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Repository } from 'typeorm'
import { UserRegisterInputDto } from './dtos/user.register.dto'

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>

describe('AuthService', () => {
  let service: AuthService
  let userRepository: MockRepository<UserEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({
          session: false,
          defaultStrategy: 'jwt',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET_KEY'),
            signOptions: { expiresIn: '1y' },
          }),
        }),
      ],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JwtService),
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    userRepository = module.get(getRepositoryToken(UserEntity))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('checked fields', () => {
    it('should fail check email exist', async () => {
      userRepository.findOne.mockResolvedValue({
        email: 'mad@gmail.com',
      })
      const result = await service.checkEmailExist({
        email: 'mad@gmail.com',
      })
      expect(result).toMatchObject({
        access: false,
        message: 'Already to this email',
      })
    })

    it('should available email', async () => {
      userRepository.findOne.mockResolvedValue(undefined)
      const result = await service.checkEmailExist({
        email: 'mad@gmail.com',
      })
      expect(result).toMatchObject({
        access: true,
        message: 'Available this email',
      })
    })

    it('should fail check nickname exist', async () => {
      userRepository.findOne.mockResolvedValue({
        nickname: 'mad',
      })
      const result = await service.checkNicknameExist({
        nickname: 'mad',
      })
      expect(result).toMatchObject({
        access: false,
        message: 'Already to this nickname',
      })
    })

    it('should available nickname', async () => {
      userRepository.findOne.mockResolvedValue(undefined)
      const result = await service.checkNicknameExist({
        nickname: 'mad',
      })
      expect(result).toMatchObject({
        access: true,
        message: 'Available this nickname',
      })
    })
  })

  describe('register user account', () => {
    const mockValueArgs: UserRegisterInputDto = {
      email: 'mad@gmail.com',
      password: 'qweqwe123123',
      nickname: 'mad',
      social: null,
      avatarImage: null,
    }

    it('should fail if email already exists', async () => {
      userRepository.findOne.mockResolvedValue({
        email: 'mad@gmail.com',
      })
      const result = await service.register(mockValueArgs)
      expect(result).toMatchObject({
        access: false,
        message: 'Already to this user email',
      })
    })

    it('should register user account', async () => {
      userRepository.findOne.mockResolvedValue(undefined)
      userRepository.create.mockReturnValue(mockValueArgs)
      const result = await service.register(mockValueArgs)
      expect(userRepository.create).toBeCalledTimes(1)
      expect(userRepository.create).toHaveBeenCalled()
      expect(userRepository.create).toHaveBeenCalledWith(mockValueArgs)
      expect(userRepository.save).toBeCalledTimes(1)
      expect(userRepository.save).toHaveBeenCalledWith(mockValueArgs)
      expect(userRepository.save).toBeCalledTimes(1)
      expect(result).toMatchObject({
        access: true,
        success: 'Success register user account',
      })
    })
  })
})
