import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const {
      email,
      password,
      role: roleName,
    } = createUserDto;

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const role = await this.prisma.roles.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new ConflictException(
        `Invalid role. Available roles: 'admin', 'staff', 'customer'`,
      );
    }

    delete createUserDto.role;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await this.prisma.users.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: { connect: { id: role.id } },
      },
      include: { role: true },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role_id: true, // fixed: roleId → role_id
        role: true,
        created_at: true, // fixed: createdAt → created_at
        updated_at: true, // fixed: updatedAt → updated_at
      },
    });
  }

  async findByRole(roleName: string, user_id: string) {
    let where = {};
    if (user_id) {
      const user = await this.prisma.users.findFirst({
        where: {
          id: user_id,
        },
      });
      where = { region_id: user.region_id };
    }
    return this.prisma.users.findMany({
      where: { role: { name: roleName }, ...where },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role_id: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findallroles() {
    return this.prisma.roles.findMany({
      select: { id: true, name: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role_id: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // ensure user exists

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role) {
      const role = await this.prisma.roles.findUnique({
        where: { name: updateUserDto.role },
      });

      if (!role) {
        throw new ConflictException(
          `Invalid role. Available roles: 'admin', 'staff', 'customer'`,
        );
      }

      updateData.role_id = role.id; // fixed: roleId → role_id
      delete updateData.role;
    }

    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id); // ensure user exists

    await this.prisma.users.delete({ where: { id } }); // fixed: user → users

    return { message: `User with ID ${id} deleted successfully` };
  }
}
