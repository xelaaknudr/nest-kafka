import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

export interface DatabaseModuleOptions {
  schema?: string;
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions = {}): DynamicModule {
    const { schema = 'public' } = options;

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
            type: 'postgres',
            host: configService.getOrThrow<string>('POSTGRES_HOST'),
            port: configService.getOrThrow<number>('POSTGRES_PORT'),
            database: configService.getOrThrow<string>('POSTGRES_DB'),
            username: configService.getOrThrow<string>('POSTGRES_USER'),
            password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
            schema,
            autoLoadEntities: true,
            synchronize: false,
            logging: true,
          }),
          inject: [ConfigService],
        }),
      ],
      exports: [TypeOrmModule],
    };
  }

  static forFeature(entities: EntityClassOrSchema[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(entities)],
      exports: [TypeOrmModule],
    };
  }
}
