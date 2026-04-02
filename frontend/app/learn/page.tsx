'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = {
  id: string;
  title: string;
  content: React.ReactNode;
};

function SideNav({ sections, activeId, onSelect }: { sections: Section[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="sticky top-14 h-[calc(100vh-4.5rem)] w-56 space-y-0.5 overflow-y-auto pr-4 pt-2">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
            activeId === s.id
              ? 'bg-[#141414] text-white'
              : 'text-[#525252] hover:text-[#a1a1a1]'
          }`}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-[#1f1f1f] bg-[#141414] p-4 font-mono text-xs leading-relaxed text-[#a1a1a1]">
      {children}
    </pre>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-8 text-xl font-semibold tracking-tight text-white">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 text-base font-semibold text-[#fafafa]">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-[#a1a1a1]">{children}</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[#1f1f1f]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#1f1f1f] bg-[#141414]">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-[#a1a1a1]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#1f1f1f]/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-[#525252]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'tip' | 'warning'; children: React.ReactNode }) {
  const styles = {
    info: 'border-[#3b82f6]/20 bg-[#3b82f6]/5 text-[#a1a1a1]',
    tip: 'border-[#22c55e]/20 bg-[#22c55e]/5 text-[#a1a1a1]',
    warning: 'border-[#eab308]/20 bg-[#eab308]/5 text-[#a1a1a1]',
  };
  const dotColors = {
    info: 'bg-[#3b82f6]',
    tip: 'bg-[#22c55e]',
    warning: 'bg-[#eab308]',
  };

  return (
    <div className={`my-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${styles[type]}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[type]}`} />
      <div>{children}</div>
    </div>
  );
}

function TryItCta({ text }: { text: string }) {
  return (
    <div className="my-6 rounded-lg border border-[#1f1f1f] bg-[#141414] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#a1a1a1]">{text}</p>
        <Link
          href="/labs?create=true"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#22c55e] px-3.5 py-2 text-xs font-medium text-black transition-colors hover:bg-[#16a34a]"
        >
          Create a Lab
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'overview',
    title: 'What is Distributed Systems?',
    content: (
      <>
        <H2>What is a Distributed System?</H2>
        <P>
          Imagine you run a restaurant. When you have 10 customers, one chef handles everything. But when 10,000 customers show up,
          you need multiple kitchens, multiple chefs, a system to route orders to the right kitchen, and a way to handle it when
          one kitchen catches fire. That is a distributed system -- multiple computers working together to serve users, with all
          the complexity of coordination, failure, and scale.
        </P>
        <P>
          A distributed system is any application where the work is split across multiple machines connected by a network.
          Your web browser talking to a server is a distributed system. Netflix streaming video from thousands of servers
          across the world is a distributed system. The difference is scale and complexity.
        </P>
        <H3>Why Not Just One Big Server?</H3>
        <Table
          headers={['Problem', 'One Server', 'Distributed System']}
          rows={[
            ['Traffic', 'Max ~50K req/s', 'Millions of req/s (add more servers)'],
            ['Failure', 'Server dies = everything is down', 'One server dies = others take over'],
            ['Data size', 'Limited by one disk (~10TB)', 'Spread across 1000s of disks (petabytes)'],
            ['Geography', 'One location, 200ms latency for far users', 'Servers in every region, <50ms everywhere'],
            ['Upgrades', 'Downtime for every deploy', 'Rolling updates, zero downtime'],
          ]}
        />
        <Callout type="info">
          Every tech company with more than ~100,000 users runs a distributed system. There is no alternative at scale.
        </Callout>
      </>
    ),
  },
  {
    id: 'layers',
    title: 'The 6 Layers',
    content: (
      <>
        <H2>Every Company Has the Same 6 Layers</H2>
        <P>
          No matter the company -- Netflix, Uber, Stripe, or a 10-person startup -- they all converge on the same architecture.
          The tools differ, the scale differs, but the layers are identical.
        </P>
        <Code>{`User (browser/mobile)
  |
  v
LAYER 1: TRAFFIC ENTRY
  CDN -> Load Balancer -> API Gateway
  Route traffic, terminate TLS, rate limit
  |
  v
LAYER 2: ORCHESTRATION
  Kubernetes / Nomad / ECS
  "Run 5 copies, restart if any die"
  |
  v
LAYER 3: SERVICE MESH
  Envoy / Istio / direct HTTP
  Service-to-service: discovery, retry, circuit breaker
  |
  |------------------+
  v                  v
LAYER 4: DATA      LAYER 5: MESSAGING
  PostgreSQL,        Kafka, RabbitMQ, SQS
  Redis, Cassandra   Async events between services
  |                  |
  +------------------+
  v
LAYER 6: OBSERVABILITY
  Prometheus, Grafana, Jaeger, ELK
  Metrics, logs, distributed traces`}</Code>
        <Table
          headers={['Layer', 'What It Does', 'Without It']}
          rows={[
            ['1. Traffic Entry', 'Routes every user request to the right service, terminates TLS, rate limits', 'Services exposed to internet, no DDoS protection, no load balancing'],
            ['2. Orchestration', 'Runs containers on machines, auto-scales, self-heals', 'Humans SSH into machines at 3am to restart crashed processes'],
            ['3. Service Mesh', 'Service-to-service communication with retries, circuit breakers, mTLS', 'One slow service cascades failure to everything'],
            ['4. Data', 'Stores data, replicates for safety, shards for scale', 'Single database, single point of failure'],
            ['5. Messaging', 'Async communication -- events/tasks that decouple services', 'Every call is synchronous, traffic spikes overwhelm everything'],
            ['6. Observability', 'See inside 500 services -- what is broken, where, why', 'Blind -- grep logs on random machines hoping to find the bug'],
          ]}
        />
        <TryItCta text="Build all 6 layers yourself. Start with a Small Company template." />
      </>
    ),
  },
  {
    id: 'layer1',
    title: 'Layer 1: Traffic Entry',
    content: (
      <>
        <H2>Layer 1: Traffic Entry</H2>
        <P>
          Every request hits this layer first. Think of it as the hotel front desk -- checks your ID (auth),
          looks up your reservation (routing), and sends you to the right floor (load balancing).
        </P>
        <H3>Three Concerns</H3>
        <Table
          headers={['Concern', 'What It Does', 'Tools']}
          rows={[
            ['Reverse Proxy', 'Sits in front of servers, hides them from the internet, handles TLS', 'Nginx, HAProxy'],
            ['Load Balancer', 'Distributes traffic across N copies of a service', 'AWS ALB/NLB, Nginx, Envoy'],
            ['API Gateway', 'Routes by path, authenticates, rate limits, transforms requests', 'Kong, Envoy, AWS API Gateway'],
          ]}
        />
        <H3>Real Request Path</H3>
        <Code>{`User -> DNS (Route53)
     -> CDN (Cloudflare, 300+ edge locations)
     -> Cloud Load Balancer (AWS ALB)
     -> API Gateway (Kong/Envoy)
     -> Your Service`}</Code>
        <H3>Who Uses What</H3>
        <Table
          headers={['Tool', 'Throughput', 'Used By']}
          rows={[
            ['Nginx', '~50K req/s per core', 'Airbnb, Dropbox, WordPress'],
            ['HAProxy', '~200K req/s', 'GitHub, Reddit, Stack Overflow'],
            ['Envoy', '~25K req/s (but does more per request)', 'Uber, Stripe, Airbnb, Slack'],
            ['AWS ALB', 'Auto-scales to millions', 'Netflix, Stripe'],
            ['Cloudflare', '60M+ req/s globally', 'Discord, Canva, DoorDash'],
          ]}
        />
        <Callout type="tip">
          Try it in the lab: create a small company template, open terminal on app-server, install nginx,
          edit /etc/nginx/sites-enabled/default to proxy_pass to another machine.
        </Callout>
      </>
    ),
  },
  {
    id: 'layer2',
    title: 'Layer 2: Orchestration',
    content: (
      <>
        <H2>Layer 2: Orchestration (Kubernetes)</H2>
        <P>
          You have 500 services. Each needs 3-10 copies running across 100 machines.
          Orchestration decides WHERE each copy runs, HOW MANY, and WHAT TO DO when things die.
        </P>
        <H3>Kubernetes Concepts</H3>
        <Table
          headers={['Concept', 'What It Is']}
          rows={[
            ['Pod', 'Smallest unit -- one or more containers sharing network. Gets its own IP. Disposable.'],
            ['Deployment', '"Run 5 copies of checkout-service. If one dies, replace it. On update, roll out one-by-one."'],
            ['Service', 'Stable DNS name for a set of pods. Pods come and go, Service stays.'],
            ['StatefulSet', 'For databases -- pods get stable names (postgres-0, postgres-1), persistent disk, ordered startup.'],
            ['Namespace', 'Isolation between teams. team-a cant see team-bs pods.'],
            ['HPA', 'Auto-scaler: CPU > 80%? Add more pods. CPU < 30%? Remove some.'],
            ['Ingress', 'HTTP routing from outside the cluster to services inside.'],
          ]}
        />
        <H3>Scale Reference</H3>
        <Table
          headers={['Company', 'Containers', 'Machines']}
          rows={[
            ['Google (Borg)', 'Billions', 'Millions'],
            ['Meta (Twine)', 'Millions', '100,000+'],
            ['Netflix', '100,000+', '10,000+'],
            ['Spotify', '10,000+', '~2,000'],
          ]}
        />
        <Callout type="info">
          92% of companies using containers use Kubernetes. It is the industry standard.
        </Callout>
      </>
    ),
  },
  {
    id: 'layer3',
    title: 'Layer 3: Service Mesh',
    content: (
      <>
        <H2>Layer 3: Service Mesh</H2>
        <P>
          When service A calls service B, a lot can go wrong: B might be down, slow, or overloaded.
          A service mesh handles discovery, retries, circuit breaking, encryption, and tracing -- automatically.
        </P>
        <H3>Three Approaches</H3>
        <Table
          headers={['Approach', 'How', 'Pro', 'Con', 'Used By']}
          rows={[
            ['Direct calls', 'Basic HTTP client + timeout', 'Zero overhead', 'No retries, no tracing', 'Small teams < 20 services'],
            ['Library-based', 'Retry/circuit-breaker code in a library', 'No extra infra', 'One library per language', 'Netflix (Hystrix)'],
            ['Sidecar mesh', 'Proxy container alongside every service', 'Language-agnostic, zero code changes', '+5-10ms latency, +50-100MB RAM', 'Uber, Stripe (Istio/Envoy)'],
          ]}
        />
        <H3>Key Patterns</H3>
        <Table
          headers={['Pattern', 'What It Does']}
          rows={[
            ['Circuit Breaker', '5 failures in 10s -> stop calling for 30s -> try 1 request -> if OK, resume'],
            ['Retry + Backoff', 'Fail -> wait 100ms -> fail -> wait 200ms -> fail -> wait 400ms -> give up'],
            ['Bulkhead', 'Service A gets max 100 connections to B. Prevents A from consuming all of Bs capacity.'],
            ['Timeout', 'Every call has a deadline (e.g., 500ms). Never wait forever.'],
          ]}
        />
        <Callout type="tip">
          Try it in the lab: inject 500ms network delay on a machine using the Chaos panel.
          Watch how requests slow down. Then configure a timeout in your service code.
        </Callout>
        <TryItCta text="Test circuit breakers and retries. Create a lab and use the chaos panel." />
      </>
    ),
  },
  {
    id: 'layer4',
    title: 'Layer 4: Data',
    content: (
      <>
        <H2>Layer 4: Data (The Hardest Layer)</H2>
        <P>
          Storing data across multiple machines is the hardest problem in distributed systems.
          The CAP theorem says you can only have 2 of 3: Consistency, Availability, Partition tolerance.
        </P>
        <H3>Database Categories</H3>
        <Table
          headers={['Category', 'Best For', 'Consistency', 'Example', 'Used By']}
          rows={[
            ['Relational (SQL)', 'Transactions, complex queries', 'Strong (CP)', 'PostgreSQL, MySQL', 'Stripe, Meta, Instagram'],
            ['Wide-Column', 'Massive write throughput', 'Tunable (AP)', 'Cassandra, ScyllaDB', 'Netflix, Discord, Apple'],
            ['Key-Value / Cache', 'Sub-millisecond reads', 'Varies', 'Redis, DynamoDB', 'Twitter, Amazon'],
            ['NewSQL', 'Distributed SQL', 'Strong (CP)', 'CockroachDB, Spanner', 'Google, DoorDash'],
          ]}
        />
        <H3>Replication Strategies</H3>
        <Code>{`Single-Leader (PostgreSQL, MySQL):
  Writes -> Primary -> Replica 1, Replica 2
  Reads <- any replica

Leaderless (Cassandra, DynamoDB):
  Writes -> any node (quorum: 2 of 3 must confirm)
  Reads -> any node (quorum: 2 of 3 must agree)`}</Code>
        <Callout type="tip">
          Try it in the lab: install PostgreSQL on db-primary, set up replication to db-replica.
          Kill db-primary and see what happens. Can you promote the replica?
        </Callout>
        <TryItCta text="Set up PostgreSQL replication and test failover." />
      </>
    ),
  },
  {
    id: 'layer5',
    title: 'Layer 5: Messaging',
    content: (
      <>
        <H2>Layer 5: Messaging</H2>
        <P>
          Not every call needs an immediate response. Instead of a phone call (synchronous HTTP),
          use a mailbox (async queue). Service A drops a message, Service B picks it up when ready.
        </P>
        <H3>Three Categories</H3>
        <Table
          headers={['Category', 'Model', 'Message Lifetime', 'Example']}
          rows={[
            ['Event Stream', 'Publish to log, consumers read at their pace', 'Days/weeks (replayable)', 'Kafka'],
            ['Message Queue', 'Send task, one worker picks it up, deleted after', 'Deleted after consumed', 'RabbitMQ, SQS'],
            ['Pub/Sub', 'Publish to topic, ALL subscribers get a copy', 'Transient', 'Google Pub/Sub, SNS'],
          ]}
        />
        <H3>Real Numbers</H3>
        <Table
          headers={['Platform', 'Messages/Day']}
          rows={[
            ['Kafka (LinkedIn)', '7 trillion'],
            ['Kafka (Uber)', '4 trillion'],
            ['Kafka (Shopify)', '80 billion+'],
            ['SQS (all AWS)', '100 billion+'],
          ]}
        />
        <Callout type="info">
          Kafka is the backbone of nearly every large company. One event, many consumers -- each processes independently.
        </Callout>
      </>
    ),
  },
  {
    id: 'layer6',
    title: 'Layer 6: Observability',
    content: (
      <>
        <H2>Layer 6: Observability</H2>
        <P>
          500 services, 5,000 pods, 100K requests/second. Something is slow. WHERE?
          You need three pillars: metrics (numbers over time), logs (event records), traces (request journey).
        </P>
        <H3>Three Pillars</H3>
        <Table
          headers={['Pillar', 'What It Answers', 'Tools']}
          rows={[
            ['Metrics', 'WHAT is broken? Is it getting worse?', 'Prometheus + Grafana'],
            ['Logs', 'WHAT exactly happened? Error messages?', 'ELK, Loki, Splunk'],
            ['Traces', 'WHERE in the chain is the bottleneck?', 'Jaeger, Zipkin, OpenTelemetry'],
          ]}
        />
        <Code>{`Trace: checkout request (580ms total)
+-- api-gateway       15ms
+-- checkout-service  560ms
    +-- cart-service    12ms
    +-- inventory-svc   25ms
    +-- payment-svc    480ms  <- BOTTLENECK
    |   +-- stripe-api 450ms  <- External API
    +-- postgres-write   8ms
    +-- kafka-produce    3ms`}</Code>
        <Callout type="tip">
          The standard free stack: Prometheus (metrics) + Loki (logs) + Jaeger (traces) + Grafana (dashboards).
        </Callout>
      </>
    ),
  },
  {
    id: 'company-size',
    title: 'By Company Size',
    content: (
      <>
        <H2>What Companies Actually Use</H2>
        <H3>Startup (5-20 engineers)</H3>
        <Code>{`3 machines:
+-- App Server: Nginx + your code
+-- Database: PostgreSQL primary
+-- DB Replica: PostgreSQL replica

No Kubernetes. No Kafka. No service mesh.
Just Nginx, PostgreSQL, Redis, and your code.`}</Code>
        <H3>Medium Company (20-100 engineers)</H3>
        <Code>{`10 machines:
+-- ALB (load balancer)
+-- App Server 1-3 (Docker containers)
+-- DB Primary + Replica
+-- Redis (cache)
+-- Kafka (3 brokers)
+-- Observability (Prometheus + Grafana)`}</Code>
        <H3>Large Company (100+ engineers)</H3>
        <Code>{`K8s cluster with 50+ nodes:
+-- Control plane (etcd, API server, scheduler)
+-- Worker nodes (pods auto-scheduled by K8s)
+-- Managed DB (AWS RDS / Google Cloud SQL)
+-- Managed Cache (AWS ElastiCache)
+-- Managed Kafka (AWS MSK / Confluent)
+-- Datadog (managed observability)`}</Code>
        <H3>Company Full Stacks</H3>
        <Table
          headers={['Company', 'Scale', 'Orchestration', 'Data', 'Messaging', 'Key Insight']}
          rows={[
            ['Netflix', '260M users', 'Titus (K8s)', 'Cassandra', 'Kafka (8M/s)', 'Built most tools themselves'],
            ['Uber', '130M users', 'Peloton (K8s)', 'MySQL', 'Kafka (4T/day)', 'Python monolith -> Go microservices'],
            ['Meta', '3B users', 'Twine (custom)', 'MySQL (sharded)', 'Scribe', 'Custom everything at their scale'],
            ['Stripe', 'Billions $/yr', 'K8s (EKS)', 'PostgreSQL', 'Kafka', 'Strong consistency for every cent'],
            ['Spotify', '600M users', 'GKE', 'PG + Bigtable', 'Pub/Sub', 'Built Backstage (developer portal)'],
            ['Discord', '200M users', 'K8s', 'ScyllaDB', 'Kafka', 'Cassandra -> ScyllaDB: p99 40ms->5ms'],
            ['LinkedIn', '900M members', 'K8s', 'Espresso', 'Kafka', 'Invented Kafka'],
          ]}
        />
        <TryItCta text="Build each company size yourself. Start with Small, graduate to Large." />
      </>
    ),
  },
  {
    id: 'patterns',
    title: 'Universal Patterns',
    content: (
      <>
        <H2>5 Patterns Every Company Learns the Hard Way</H2>
        <H3>1. Start Monolith, Split Later</H3>
        <P>
          Every unicorn started as a monolith: Amazon (Perl), Netflix (Java), Uber (Python),
          Shopify (Rails), Airbnb (Rails). Microservices came AFTER they understood their domain boundaries.
        </P>
        <H3>2. The Database Is Always the Bottleneck</H3>
        <P>
          Year 1: single DB. Year 2: add read replicas. Year 3: shard the DB.
          Year 5: build a custom data layer. Facebook, Uber, and LinkedIn all went through this progression.
        </P>
        <H3>3. Kafka Becomes the Backbone</H3>
        <P>
          Nearly every company at scale puts Kafka at the center. It becomes the single source of truth
          for &quot;what happened in the system.&quot; Event sourcing emerges naturally.
        </P>
        <H3>4. Observability Is Non-Negotiable</H3>
        <P>
          You CANNOT debug distributed systems with printf. Every company either pays Datadog millions
          per year or builds custom observability tooling.
        </P>
        <H3>5. Everything Fails, All the Time</H3>
        <Callout type="warning">
          &quot;Everything fails, all the time.&quot; -- Werner Vogels, CTO of Amazon.
          Design for failure: retries, circuit breakers, bulkheads, chaos engineering.
        </Callout>
      </>
    ),
  },
  {
    id: 'try-it',
    title: 'Try It Yourself',
    content: (
      <>
        <H2>Try It Yourself</H2>
        <P>
          The best way to learn distributed systems is to build and break them. Use the DistSim lab to practice.
        </P>
        <H3>Exercise 1: Build a Small Company Stack</H3>
        <P>
          Create a &quot;Small Company&quot; lab. Install Nginx on app-server, PostgreSQL on db-primary.
          Configure Nginx to proxy to a Node.js service you write. Insert data into PostgreSQL from your service.
          Test it works with curl from another machine.
        </P>
        <H3>Exercise 2: Break It</H3>
        <P>
          Using the Chaos panel, inject 500ms network delay between app-server and db-primary.
          Watch your service slow down. Then kill PostgreSQL. Watch your service return errors.
          Now add error handling and a circuit breaker to your code.
        </P>
        <H3>Exercise 3: Scale It</H3>
        <P>
          Create a &quot;Medium Company&quot; lab. Configure Nginx to load balance across 3 app servers.
          Set up Redis caching. Configure Kafka. Write a producer service and a consumer service
          that communicate through Kafka events.
        </P>
        <H3>Exercise 4: Observe It</H3>
        <P>
          Add Prometheus and Grafana. Configure your services to expose /metrics endpoints.
          Set up Prometheus to scrape them. Build a Grafana dashboard showing request rate,
          error rate, and latency. Now inject chaos and watch the dashboard react.
        </P>
        <div className="my-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <h3 className="mb-2 text-base font-semibold text-white">Ready to build?</h3>
          <p className="mb-4 text-sm text-[#525252]">
            Create your first lab and start experimenting with real distributed infrastructure.
          </p>
          <Link
            href="/labs?create=true"
            className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#16a34a]"
          >
            Create a Lab
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" />
            </svg>
          </Link>
        </div>
      </>
    ),
  },
];

export default function LearnPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  const handleSelect = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#1f1f1f]">
        <div className="mx-auto max-w-6xl px-6 pb-6 pt-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Learn Distributed Systems
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#525252]">
            From single server to Netflix-scale -- understand the 6 layers every company uses to build
            reliable, scalable infrastructure.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <Link
              href="/labs?create=true"
              className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-3.5 py-2 text-xs font-medium text-black transition-colors hover:bg-[#16a34a]"
            >
              Create a Lab to Follow Along
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" />
              </svg>
            </Link>
            <span className="text-xs text-[#525252]">11 sections</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <div className="hidden shrink-0 lg:block">
          <SideNav sections={sections} activeId={activeSection} onSelect={handleSelect} />
        </div>

        <div className="min-w-0 flex-1">
          {sections.map((section) => (
            <section key={section.id} id={`section-${section.id}`} className="mb-16">
              {section.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
