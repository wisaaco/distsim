export interface ServiceSpec {
  type: string;
  exposes: { port: number; protocol: string; role: string }[];
  consumes: { protocol: string; role: string }[];
}

export const SERVICE_SPECS: Record<string, ServiceSpec> = {
  nginx: {
    type: 'nginx',
    exposes: [{ port: 80, protocol: 'http', role: 'http_server' }],
    consumes: [{ protocol: 'http', role: 'http_server' }],
  },
  postgresql: {
    type: 'postgresql',
    exposes: [{ port: 5432, protocol: 'postgresql', role: 'primary' }],
    consumes: [{ protocol: 'postgresql', role: 'primary' }],
  },
  redis: {
    type: 'redis',
    exposes: [{ port: 6379, protocol: 'redis', role: 'server' }],
    consumes: [],
  },
  kafka: {
    type: 'kafka',
    exposes: [{ port: 9092, protocol: 'kafka', role: 'broker' }],
    consumes: [],
  },
  custom_go: {
    type: 'custom_go',
    exposes: [{ port: 8080, protocol: 'http', role: 'http_server' }],
    consumes: [
      { protocol: 'postgresql', role: 'primary' },
      { protocol: 'mysql', role: 'primary' },
      { protocol: 'mongodb', role: 'primary' },
      { protocol: 'redis', role: 'server' },
      { protocol: 'memcached', role: 'server' },
      { protocol: 'kafka', role: 'broker' },
      { protocol: 'amqp', role: 'broker' },
      { protocol: 'nats', role: 'broker' },
      { protocol: 'http', role: 'http_server' },
    ],
  },
  custom_node: {
    type: 'custom_node',
    exposes: [{ port: 8080, protocol: 'http', role: 'http_server' }],
    consumes: [
      { protocol: 'postgresql', role: 'primary' },
      { protocol: 'mysql', role: 'primary' },
      { protocol: 'mongodb', role: 'primary' },
      { protocol: 'redis', role: 'server' },
      { protocol: 'memcached', role: 'server' },
      { protocol: 'kafka', role: 'broker' },
      { protocol: 'amqp', role: 'broker' },
      { protocol: 'nats', role: 'broker' },
      { protocol: 'http', role: 'http_server' },
    ],
  },
  custom_python: {
    type: 'custom_python',
    exposes: [{ port: 8080, protocol: 'http', role: 'http_server' }],
    consumes: [
      { protocol: 'postgresql', role: 'primary' },
      { protocol: 'mysql', role: 'primary' },
      { protocol: 'mongodb', role: 'primary' },
      { protocol: 'redis', role: 'server' },
      { protocol: 'memcached', role: 'server' },
      { protocol: 'kafka', role: 'broker' },
      { protocol: 'amqp', role: 'broker' },
      { protocol: 'nats', role: 'broker' },
      { protocol: 'http', role: 'http_server' },
    ],
  },
  mongodb: {
    type: 'mongodb',
    exposes: [{ port: 27017, protocol: 'mongodb', role: 'primary' }],
    consumes: [],
  },
  mysql: {
    type: 'mysql',
    exposes: [{ port: 3306, protocol: 'mysql', role: 'primary' }],
    consumes: [],
  },
  rabbitmq: {
    type: 'rabbitmq',
    exposes: [{ port: 5672, protocol: 'amqp', role: 'broker' }],
    consumes: [],
  },
  memcached: {
    type: 'memcached',
    exposes: [{ port: 11211, protocol: 'memcached', role: 'server' }],
    consumes: [],
  },
  haproxy: {
    type: 'haproxy',
    exposes: [{ port: 80, protocol: 'http', role: 'http_server' }],
    consumes: [{ protocol: 'http', role: 'http_server' }],
  },
  minio: {
    type: 'minio',
    exposes: [{ port: 9000, protocol: 'http', role: 's3' }],
    consumes: [],
  },
  etcd: {
    type: 'etcd',
    exposes: [{ port: 2379, protocol: 'http', role: 'kv' }],
    consumes: [],
  },
  consul: {
    type: 'consul',
    exposes: [{ port: 8500, protocol: 'http', role: 'discovery' }],
    consumes: [],
  },
  vault: {
    type: 'vault',
    exposes: [{ port: 8200, protocol: 'http', role: 'secrets' }],
    consumes: [],
  },
  nats: {
    type: 'nats',
    exposes: [{ port: 4222, protocol: 'nats', role: 'broker' }],
    consumes: [],
  },
  elasticsearch: {
    type: 'elasticsearch',
    exposes: [{ port: 9200, protocol: 'http', role: 'search' }],
    consumes: [],
  },
  prometheus: {
    type: 'prometheus',
    exposes: [{ port: 9090, protocol: 'http', role: 'metrics' }],
    consumes: [{ protocol: 'http', role: 'http_server' }],
  },
  grafana: {
    type: 'grafana',
    exposes: [{ port: 3000, protocol: 'http', role: 'dashboard' }],
    consumes: [{ protocol: 'http', role: 'metrics' }],
  },
  jaeger: {
    type: 'jaeger',
    exposes: [{ port: 16686, protocol: 'http', role: 'tracing' }],
    consumes: [],
  },
};

export function canConnect(
  fromServiceType: string,
  toServiceType: string
): { valid: boolean; error?: string } {
  const fromSpec = SERVICE_SPECS[fromServiceType];
  const toSpec = SERVICE_SPECS[toServiceType];

  if (!fromSpec) {
    return { valid: false, error: `Unknown service type: ${fromServiceType}` };
  }
  if (!toSpec) {
    return { valid: false, error: `Unknown service type: ${toServiceType}` };
  }

  // Check if fromSpec's consumes match any of toSpec's exposes by protocol
  const canConsume = fromSpec.consumes.some((need) =>
    toSpec.exposes.some((offer) => offer.protocol === need.protocol)
  );

  if (canConsume) {
    return { valid: true };
  }

  // Also check the reverse: toSpec consumes from fromSpec exposes
  const canConsumeReverse = toSpec.consumes.some((need) =>
    fromSpec.exposes.some((offer) => offer.protocol === need.protocol)
  );

  if (canConsumeReverse) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `${fromServiceType} cannot connect to ${toServiceType}: no compatible protocol`,
  };
}

/**
 * Given two machines (by their service types), check if any service
 * on the source machine can connect to any service on the target machine.
 */
export function canMachinesConnect(
  sourceServices: string[],
  targetServices: string[]
): { valid: boolean; error?: string } {
  if (sourceServices.length === 0 || targetServices.length === 0) {
    return { valid: true }; // Allow connections between machines without services
  }

  for (const from of sourceServices) {
    for (const to of targetServices) {
      const result = canConnect(from, to);
      if (result.valid) {
        return { valid: true };
      }
    }
  }

  return {
    valid: false,
    error: 'No compatible services between these machines',
  };
}
