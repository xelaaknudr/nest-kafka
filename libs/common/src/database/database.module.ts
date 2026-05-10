import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';

@Module({})
export class DatabaseModule {
    static register(envPrefix: string = 'MONGODB'): DynamicModule {
        return {
            module: DatabaseModule,
            imports: [
                MongooseModule.forRootAsync({
                    imports: [ConfigModule],
                    useFactory: (configService: ConfigService) => {
                        const uri = configService.get<string>(`${envPrefix}_URI`);
                        if (uri) {
                            return { uri };
                        }

                        const host = configService.get<string>(`${envPrefix}_HOST`);
                        const port = configService.get<string>(`${envPrefix}_PORT`);
                        const dbName = configService.get<string>(`${envPrefix}_DATABASE`);

                        return {
                            uri: `mongodb://${host}:${port}/${dbName}`,
                        };
                    },
                    inject: [ConfigService],
                }),
            ],
            exports: [MongooseModule]
        };
    }
}
