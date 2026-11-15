import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { BlobGateway } from './blob.gateway';
import { CloudMediaController } from './cloud-media.controller';
import { CloudMediaService } from './cloud-media.service';
import { CloudinaryGateway } from './cloudinary.gateway';
import { CloudPhotosService } from './cloud-photos.service';
@Global()
@Module({
  imports: [AuthModule],
  controllers: [CloudMediaController],
  providers: [
    BlobGateway,
    CloudinaryGateway,
    CloudMediaService,
    CloudPhotosService,
  ],
  exports: [CloudMediaService, CloudPhotosService],
})
export class CloudMediaModule {}
