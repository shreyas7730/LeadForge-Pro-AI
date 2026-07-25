/**
 * ExportService — STUB for Phase 2.
 * Full CSV/XLSX/JSON streaming arrives in Phase 6.
 */

import type { Business, ExportFormat } from '@/types/domain';
import { rowsToCsv } from '@/utils/csv';
import { generateUUID } from '@/utils/id';
import { getDatabase } from '@/database';
import { logger } from '@/services/logger-service';
import { AppError } from '@/utils/errors';

export const exportService = {
  /**
   * Minimal CSV export for infrastructure testing.
   * Excel/JSON streaming ships in Phase 6.
   */
  async exportRows(
    rows: Business[],
    columns: string[],
    format: ExportFormat = 'csv'
  ): Promise<{ jobId: string; blob: Blob; fileName: string }> {
    if (format !== 'csv') {
      throw new AppError(
        'UNKNOWN',
        `Export format "${format}" is not available until Phase 6`,
        { recoverable: false }
      );
    }

    const jobId = generateUUID();
    const data = rows.map((b) => {
      const record: Record<string, unknown> = {
        id: b.id,
        companyName: b.companyName,
        category: b.category ?? '',
        phone: b.phone ?? '',
        emails: b.emails.join('; '),
        website: b.website ?? '',
        address: b.address ?? '',
        city: b.city ?? '',
        state: b.state ?? '',
        country: b.country ?? '',
        keyword: b.keyword,
        location: b.location,
        status: b.status,
      };
      return record;
    });

    const csv = rowsToCsv(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const fileName = `LeadForge_${new Date().toISOString().slice(0, 10)}_${rows.length}.csv`;

    await getDatabase().exportHistory.put({
      id: jobId,
      format: 'csv',
      columns,
      rowCount: rows.length,
      fileName,
      sizeBytes: blob.size,
      createdAt: Date.now(),
      status: 'completed',
    });

    logger.info('CSV export completed', {
      category: 'export',
      context: { jobId, rows: rows.length },
    });

    return { jobId, blob, fileName };
  },
};
