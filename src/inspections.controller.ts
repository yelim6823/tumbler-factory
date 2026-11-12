import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Inspection } from './inspection.types';
import { InspectionStore } from './inspection.store';

const productIds = new Set(['P-SILVER', 'P-WHITE', 'P-BLACK']);

interface CreateInspectionBody {
  product_id?: unknown;
  inspected_at?: unknown;
  revision?: unknown;
  weight_g?: unknown;
  memo?: unknown;
}

interface UpdateInspectionBody {
  product_id?: unknown;
  inspected_at?: unknown;
  weight_g?: unknown;
}

@Controller('api/inspections')
export class InspectionsController {
  constructor(private readonly store: InspectionStore) {}

  @Post()
  create(@Body() body: CreateInspectionBody): Inspection {
    if (typeof body?.product_id !== 'string' || !productIds.has(body.product_id)) {
      throw new BadRequestException('제품을 확인하세요.');
    }
    if (!this.isInspectionDate(body.inspected_at)) {
      throw new BadRequestException('검사일시를 확인하세요.');
    }
    if (body.revision !== 'Rev.A' && body.revision !== 'Rev.B') {
      throw new BadRequestException('검사기준을 확인하세요.');
    }
    if (body.memo !== undefined && typeof body.memo !== 'string') {
      throw new BadRequestException('메모를 확인하세요.');
    }

    const inspection: Inspection = {
      inspection_id: `INSP-${this.koreanDate()}-${randomBytes(4).toString('hex')}`,
      product_id: body.product_id,
      inspected_at: body.inspected_at,
      revision: body.revision,
      weight_g: this.readWeight(body.weight_g),
      memo: typeof body.memo === 'string' ? body.memo : '',
      decision: null,
      content_version: 0,
      images: [],
    };

    this.store.save(inspection);
    return inspection;
  }

  @Get(':inspectionId')
  getOne(@Param('inspectionId') inspectionId: string): Inspection {
    const inspection = this.store.find(inspectionId);
    if (!inspection) throw new NotFoundException('검사를 찾을 수 없습니다.');
    return inspection;
  }

  @Patch(':inspectionId')
  update(
    @Param('inspectionId') inspectionId: string,
    @Body() body: UpdateInspectionBody,
  ): Inspection {
    const inspection = this.store.find(inspectionId);
    if (!inspection) throw new NotFoundException('검사를 찾을 수 없습니다.');

    if (body.product_id !== undefined) {
      if (typeof body.product_id !== 'string' || !productIds.has(body.product_id)) {
        throw new BadRequestException('제품을 확인하세요.');
      }
      inspection.product_id = body.product_id;
    }
    if (body.inspected_at !== undefined) {
      if (!this.isInspectionDate(body.inspected_at)) {
        throw new BadRequestException('검사일시를 확인하세요.');
      }
      inspection.inspected_at = body.inspected_at;
    }
    if (body.weight_g !== undefined) {
      inspection.weight_g = this.readWeight(body.weight_g);
    }

    inspection.content_version += 1;
    this.store.save(inspection);
    return inspection;
  }

  private isInspectionDate(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  }

  private readWeight(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException('중량을 확인하세요.');
    }
    return value;
  }

  private koreanDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}${values.month}${values.day}`;
  }
}