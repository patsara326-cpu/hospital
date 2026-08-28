import "server-only";

import { SpanStatusCode, trace } from "@opentelemetry/api";

type OperationMetrics = {
  rowCount?: number;
  responseBytes?: number;
};

const tracer = trace.getTracer("hospital-data-access");

export async function observeServerOperation<T>(
  operation: string,
  task: () => PromiseLike<T>,
  metrics: (result: T) => OperationMetrics = () => ({}),
): Promise<T> {
  return tracer.startActiveSpan(operation, async (span) => {
    const startedAt = performance.now();
    try {
      const result = await task();
      const summary = metrics(result);
      const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
      span.setAttributes({
        "app.operation": operation,
        "app.duration_ms": durationMs,
        ...(summary.rowCount === undefined ? {} : { "app.row_count": summary.rowCount }),
        ...(summary.responseBytes === undefined ? {} : { "app.response_bytes": summary.responseBytes }),
      });
      console.info(JSON.stringify({ type: "performance", operation, duration_ms: durationMs, ...snakeCaseMetrics(summary) }));
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error instanceof Error ? error : new Error("Unknown server operation error"));
      throw error;
    } finally {
      span.end();
    }
  });
}

function snakeCaseMetrics(metrics: OperationMetrics) {
  return {
    ...(metrics.rowCount === undefined ? {} : { row_count: metrics.rowCount }),
    ...(metrics.responseBytes === undefined ? {} : { response_bytes: metrics.responseBytes }),
  };
}

export function queryMetrics<T extends { data: unknown[] | null }>(result: T) {
  const data = result.data ?? [];
  return {
    rowCount: data.length,
    responseBytes: Buffer.byteLength(JSON.stringify(data), "utf8"),
  };
}
