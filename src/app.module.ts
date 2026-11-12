import { Module } from '@nestjs/common';
import { ApiFallbackController } from './api-fallback.controller';
import { AuthController } from './auth.controller';
import { InspectionsController } from './inspections.controller';
import { InspectionStore } from './inspection.store';

@Module({
  controllers: [AuthController, InspectionsController, ApiFallbackController],
  providers: [InspectionStore],
})
export class AppModule {}