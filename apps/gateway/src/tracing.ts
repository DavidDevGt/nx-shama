import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const initializeTracing = () => {
  const sdk = new NodeSDK({
    serviceName: 'shama-gateway',
    traceExporter: new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  console.log('🚀 OpenTelemetry tracing initialized');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('✅ Tracing terminated'))
      .catch((error) => console.error('❌ Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
};