// Service hints provide comprehensive, educational guides for each service type.
// Shown when user clicks the ? button on a service badge.
// Covers what it is, who uses it at scale, installation, configuration,
// daily-use commands, verification, ports, and professional tips.

export interface CodeExample {
  title: string;
  language: string; // 'nginx' | 'javascript' | 'python' | 'go' | 'yaml' | 'sql' | 'bash' | 'ini'
  code: string;
  description: string;
}

export interface ServiceHint {
  title: string;
  description: string;
  install: string[];
  config_files: { path: string; description: string }[];
  common_commands: { command: string; description: string }[];
  test_commands: { command: string; description: string }[];
  ports: { port: number; description: string }[];
  tips: string[];
  code_examples?: CodeExample[];
}

export const SERVICE_HINTS: Record<string, ServiceHint> = {
  // ---------------------------------------------------------------------------
  // 1. NGINX
  // ---------------------------------------------------------------------------
  nginx: {
    title: 'Nginx -- Reverse Proxy, Load Balancer & Web Server',
    description:
      'Nginx (pronounced "engine-x") is the most widely deployed reverse proxy and web server on the internet, powering roughly 34% of all websites. It sits in front of your application servers, receives every incoming HTTP/HTTPS request, and decides where to forward it -- to which backend, at what rate, with what caching rules. Airbnb, Dropbox, Netflix, WordPress.com, and GitHub Pages all rely on Nginx. It handles static file serving, TLS termination, rate limiting, WebSocket proxying, and load balancing across multiple backends with configurable algorithms (round-robin, least connections, IP hash, weighted). In a microservices architecture, Nginx is typically the single entry point -- the "front door" -- that routes traffic to dozens of internal services.',
    install: [
      'apt-get update && apt-get install -y nginx',
      'nginx',
    ],
    config_files: [
      { path: '/etc/nginx/nginx.conf', description: 'Main config -- worker processes, events block, http block with upstream definitions and global settings' },
      { path: '/etc/nginx/sites-enabled/default', description: 'Default virtual host -- server block with listen directives, location rules, and proxy_pass targets' },
      { path: '/etc/nginx/conf.d/*.conf', description: 'Drop-in config directory -- each .conf file is auto-included, useful for per-service configs' },
      { path: '/var/log/nginx/access.log', description: 'Access log -- every request with status code, response time, upstream, and client IP' },
      { path: '/var/log/nginx/error.log', description: 'Error log -- config mistakes, upstream failures, connection resets, and permission errors' },
    ],
    common_commands: [
      { command: 'nginx', description: 'Start nginx (runs as daemon by default)' },
      { command: 'nginx -s reload', description: 'Reload config without dropping active connections -- zero-downtime config changes' },
      { command: 'nginx -s stop', description: 'Stop nginx immediately (drops active connections)' },
      { command: 'nginx -s quit', description: 'Graceful stop -- finishes serving active requests, then shuts down' },
      { command: 'nginx -t', description: 'Test config for syntax errors WITHOUT restarting -- always run this before reload' },
      { command: 'nginx -T', description: 'Test config AND print the full resolved configuration to stdout' },
      { command: 'cat /var/log/nginx/access.log | tail -20', description: 'View last 20 access log entries' },
      { command: 'cat /var/log/nginx/error.log | tail -20', description: 'View last 20 error log entries' },
      { command: 'curl -s http://app-server:8080/health', description: 'Test if an upstream backend is reachable from the nginx machine' },
      { command: 'ps aux | grep nginx', description: 'Check nginx master and worker processes' },
    ],
    test_commands: [
      { command: 'curl http://localhost:80', description: 'Test if nginx is serving on the default port' },
      { command: 'curl -I http://localhost:80', description: 'Show response headers only -- check Server header and status code' },
      { command: 'curl -w "\\nHTTP %{http_code} | Total: %{time_total}s | Connect: %{time_connect}s\\n" http://localhost:80', description: 'Show status code and detailed timing breakdown' },
      { command: 'ss -tlnp | grep 80', description: 'Verify port 80 is bound and listening' },
      { command: 'curl -H "Host: app.local" http://localhost:80', description: 'Test virtual host routing by sending a specific Host header' },
    ],
    ports: [
      { port: 80, description: 'HTTP (default)' },
      { port: 443, description: 'HTTPS (when TLS/SSL is configured)' },
    ],
    tips: [
      'ALWAYS run "nginx -t" before "nginx -s reload" -- a syntax error in the config will prevent reload and could take your proxy offline if you restart instead.',
      'The most common mistake is forgetting the semicolon at the end of a directive. Every line inside a block must end with ";" except block openers like "server {" and "location / {".',
      'Use "upstream" blocks for load balancing: upstream backend { server app-server-1:8080; server app-server-2:8080; } then proxy_pass http://backend; in your location block.',
      'Load balancing algorithms: default is round-robin. Add "least_conn;" for fewest active connections, "ip_hash;" for sticky sessions, or "server app:8080 weight=3;" for weighted distribution.',
      'Rate limiting: add "limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;" in the http block, then "limit_req zone=api burst=20 nodelay;" in a location block to allow bursts without delay.',
      'If proxy_pass is not working, check that the upstream hostname resolves: run "getent hosts app-server" from the nginx machine.',
      'A "return 301" directive in a location block overrides proxy_pass in the same block -- nginx processes return before proxy_pass. This is a common source of confusion.',
      'For WebSocket proxying, add these headers: proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";',
      'Enable caching with: proxy_cache_path /tmp/nginx-cache levels=1:2 keys_zone=cache:10m; then "proxy_cache cache;" and "proxy_cache_valid 200 10m;" in your location block.',
      'Set real client IP headers when proxying: proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    ],
    code_examples: [
      {
        title: 'Load Balancer Config',
        language: 'nginx',
        code: `# /etc/nginx/conf.d/load-balancer.conf
# Round-robin load balancing across multiple app servers

upstream app_backend {
    # Nginx distributes requests round-robin by default
    server app-server-1:8080;
    server app-server-2:8080;
    server app-server-3:8080;

    # Optional: mark a server as backup (only used if all others are down)
    # server app-server-4:8080 backup;

    # Optional: weighted distribution (app-server-1 gets 3x more traffic)
    # server app-server-1:8080 weight=3;
}

server {
    listen 80;
    server_name _;

    # Forward all traffic to the upstream group
    location / {
        proxy_pass http://app_backend;

        # Pass the real client IP to backend servers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts -- how long to wait for the backend
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint served by nginx itself
    location /nginx-health {
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }
}`,
        description: 'Distributes incoming HTTP requests across multiple backend app servers using round-robin. Each request goes to the next server in the list. Add weight or least_conn for different strategies.',
      },
      {
        title: 'Rate Limiter Config',
        language: 'nginx',
        code: `# Add to the http {} block in /etc/nginx/nginx.conf
# Creates a shared memory zone "api_limit" (10MB) tracking requests per IP
# Allows 10 requests per second per client IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Optional: separate limit for login endpoints (stricter)
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=2r/s;

server {
    listen 80;
    server_name _;

    # API endpoints: allow bursts of 20 requests, process extras without delay
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        # Return 429 Too Many Requests (default is 503)
        limit_req_status 429;

        proxy_pass http://app_backend;
    }

    # Login endpoint: stricter limit, small burst
    location /api/login {
        limit_req zone=login_limit burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://app_backend;
    }

    # Static files: no rate limiting needed
    location /static/ {
        root /var/www/html;
    }
}`,
        description: 'Protects backend servers from being overwhelmed. The burst parameter allows short traffic spikes. nodelay processes burst requests immediately instead of queuing them.',
      },
      {
        title: 'SSL Termination + Proxy',
        language: 'nginx',
        code: `# /etc/nginx/conf.d/ssl-proxy.conf
# HTTPS on the frontend, plain HTTP to the backend
# Nginx handles all TLS encryption/decryption

server {
    listen 443 ssl;
    server_name app.example.com;

    # SSL certificate and key
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    # Modern TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # SSL session caching for performance
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        # Backend receives plain HTTP (no SSL overhead)
        proxy_pass http://app-server:8080;

        # Tell the backend the original request was HTTPS
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}`,
        description: 'Terminates TLS at the nginx layer so backend servers do not need to handle encryption. This simplifies backend configuration and improves performance since nginx handles TLS very efficiently.',
      },
      {
        title: 'WebSocket Proxy',
        language: 'nginx',
        code: `# /etc/nginx/conf.d/websocket.conf
# Proxy WebSocket connections to a backend server
# WebSockets require HTTP/1.1 with Upgrade headers

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name _;

    # WebSocket endpoint
    location /ws {
        proxy_pass http://app-server:8080;

        # Required for WebSocket: upgrade from HTTP to WS
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Longer timeouts for long-lived WebSocket connections
        proxy_read_timeout 86400s;  # 24 hours
        proxy_send_timeout 86400s;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Regular HTTP traffic
    location / {
        proxy_pass http://app-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`,
        description: 'Proxies WebSocket connections through nginx. The Upgrade and Connection headers tell nginx to switch protocols from HTTP to WebSocket. Without these headers, WebSocket connections will fail.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. POSTGRESQL
  // ---------------------------------------------------------------------------
  postgresql: {
    title: 'PostgreSQL -- Relational Database with ACID Guarantees',
    description:
      'PostgreSQL (often called "Postgres") is the most advanced open-source relational database. It stores data in tables with rows and columns, enforces ACID transactions (Atomicity, Consistency, Isolation, Durability), and supports complex queries with JOIN operations, window functions, CTEs, and JSON columns. Stripe uses Postgres for all payment processing (where a lost transaction means lost money). Instagram runs over 12,000 PostgreSQL shards handling billions of rows. Reddit, GitLab, Apple, and the UK Government Digital Service all rely on it. PostgreSQL is the default choice when you need strong consistency, referential integrity (foreign keys), and the ability to run complex analytical queries alongside transactional workloads.',
    install: [
      'apt-get update && apt-get install -y postgresql postgresql-client',
      'service postgresql start',
    ],
    config_files: [
      { path: '/etc/postgresql/14/main/postgresql.conf', description: 'Main config -- listen_addresses, max_connections, shared_buffers, wal_level, and 300+ tuning parameters' },
      { path: '/etc/postgresql/14/main/pg_hba.conf', description: 'Host-Based Authentication -- controls WHO can connect FROM WHERE using WHICH auth method (md5, scram-sha-256, trust)' },
      { path: '/var/log/postgresql/', description: 'Log directory -- slow queries, connection errors, replication status, and crash recovery logs' },
    ],
    common_commands: [
      { command: 'service postgresql start', description: 'Start the PostgreSQL server' },
      { command: 'service postgresql stop', description: 'Stop the PostgreSQL server gracefully' },
      { command: 'service postgresql status', description: 'Check if PostgreSQL is running and on which port' },
      { command: 'sudo -u postgres psql', description: 'Open the interactive SQL shell as the postgres superuser' },
      { command: 'sudo -u postgres createdb myapp', description: 'Create a new database called "myapp"' },
      { command: 'sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD \'secret123\';"', description: 'Create a new database user with a password' },
      { command: 'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE myapp TO appuser;"', description: 'Grant the user full access to the database' },
      { command: 'sudo -u postgres psql myapp -c "CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(255) UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW());"', description: 'Create a users table with auto-incrementing ID, unique email, and timestamp' },
      { command: 'sudo -u postgres psql myapp -c "INSERT INTO users (name, email) VALUES (\'Alice\', \'alice@example.com\');"', description: 'Insert a row into the users table' },
      { command: 'sudo -u postgres psql myapp -c "SELECT * FROM users;"', description: 'Query all rows from the users table' },
      { command: 'sudo -u postgres psql myapp -c "EXPLAIN ANALYZE SELECT * FROM users WHERE email = \'alice@example.com\';"', description: 'Show the query execution plan with actual timing -- essential for performance tuning' },
      { command: 'sudo -u postgres pg_dump myapp > /tmp/myapp-backup.sql', description: 'Backup the entire database to a SQL file' },
      { command: 'sudo -u postgres psql myapp < /tmp/myapp-backup.sql', description: 'Restore a database from a SQL backup file' },
    ],
    test_commands: [
      { command: 'sudo -u postgres psql -c "SELECT 1;"', description: 'Verify the database engine is responding to queries' },
      { command: 'ss -tlnp | grep 5432', description: 'Verify port 5432 is bound and listening' },
      { command: 'sudo -u postgres psql -c "\\l"', description: 'List all databases on this server' },
      { command: 'sudo -u postgres psql -c "\\du"', description: 'List all database users/roles and their privileges' },
      { command: 'sudo -u postgres psql -c "SELECT pg_is_in_recovery();"', description: 'Check if this server is a primary (false) or replica (true)' },
      { command: 'sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"', description: 'Count active connections -- watch for connection exhaustion' },
    ],
    ports: [
      { port: 5432, description: 'PostgreSQL wire protocol (client connections)' },
    ],
    tips: [
      'The #1 beginner mistake: PostgreSQL only listens on localhost by default. To allow connections from other machines, edit postgresql.conf and set listen_addresses = \'*\', then add a line to pg_hba.conf: "host all all 0.0.0.0/0 md5". Restart after both changes.',
      'Always restart (not just reload) after changing listen_addresses or pg_hba.conf: "service postgresql restart".',
      'For replication (primary/replica), set wal_level = replica and max_wal_senders = 10 on the primary. Then use pg_basebackup on the replica to clone the primary.',
      'Use EXPLAIN ANALYZE before every slow query -- it shows you the actual execution plan and where time is spent. Add indexes based on what it tells you.',
      'Connection pooling is essential in production. PostgreSQL forks a new process per connection (~10MB each). Use PgBouncer in front of Postgres to multiplex thousands of app connections into a small pool.',
      'shared_buffers should be set to 25% of total RAM. effective_cache_size should be 75% of total RAM. These are the two most impactful tuning parameters.',
      'Use \\dt to list tables, \\di to list indexes, \\d tablename to describe a table schema, and \\x to toggle expanded output for wide rows.',
      'Never store passwords in plain text. PostgreSQL supports pgcrypto: SELECT crypt(\'password\', gen_salt(\'bf\'));',
    ],
    code_examples: [
      {
        title: 'Create Database + Tables',
        language: 'sql',
        code: `-- Connect: sudo -u postgres psql

-- Create a database for the application
CREATE DATABASE myapp;

-- Connect to the new database
\\c myapp

-- Create a users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,                     -- Auto-incrementing integer ID
    name VARCHAR(100) NOT NULL,                -- Required name field
    email VARCHAR(255) UNIQUE NOT NULL,        -- Unique email constraint
    created_at TIMESTAMPTZ DEFAULT NOW()       -- Timestamp with timezone
);

-- Create an orders table with a foreign key
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,            -- Price with 2 decimal places
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster lookups by user_id
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Insert sample data
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Charlie', 'charlie@example.com');

INSERT INTO orders (user_id, product, amount, status) VALUES
    (1, 'Laptop', 999.99, 'completed'),
    (1, 'Mouse', 29.99, 'completed'),
    (2, 'Keyboard', 79.99, 'pending'),
    (3, 'Monitor', 449.99, 'shipped');

-- Query: all orders with user names (JOIN)
SELECT u.name, o.product, o.amount, o.status
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- Query: total spending per user (GROUP BY)
SELECT u.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.name
ORDER BY total_spent DESC;`,
        description: 'Complete database setup with tables, foreign keys, indexes, sample data, and common queries. This is the foundation for any application using PostgreSQL.',
      },
      {
        title: 'Replication Setup',
        language: 'bash',
        code: `#!/bin/bash
# PostgreSQL Primary/Replica Replication Setup
# Run these steps to set up streaming replication

# === ON THE PRIMARY (db-primary) ===

# 1. Edit postgresql.conf to enable replication
sudo -u postgres bash -c "cat >> /etc/postgresql/14/main/postgresql.conf << 'CONF'
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1024
listen_addresses = '*'
CONF"

# 2. Create a replication user
sudo -u postgres psql -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'repl_pass';"

# 3. Allow the replica to connect for replication
echo "host replication replicator 0.0.0.0/0 md5" | \\
    sudo tee -a /etc/postgresql/14/main/pg_hba.conf

# 4. Restart primary to apply changes
sudo service postgresql restart

# === ON THE REPLICA (db-replica) ===

# 5. Stop PostgreSQL on the replica
sudo service postgresql stop

# 6. Remove existing data directory
sudo -u postgres rm -rf /var/lib/postgresql/14/main/*

# 7. Clone the primary using pg_basebackup
sudo -u postgres pg_basebackup \\
    -h db-primary -U replicator -p 5432 \\
    -D /var/lib/postgresql/14/main \\
    -Fp -Xs -R -P

# The -R flag creates standby.signal and sets primary_conninfo automatically

# 8. Start the replica
sudo service postgresql start

# 9. Verify replication is working
# On the PRIMARY:
sudo -u postgres psql -c "SELECT client_addr, state FROM pg_stat_replication;"
# On the REPLICA:
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"  # Should return 't' (true)`,
        description: 'Sets up streaming replication from a primary to a replica. The replica continuously receives WAL (Write-Ahead Log) records from the primary, maintaining a near-real-time copy of the database.',
      },
      {
        title: 'Node.js Connection',
        language: 'javascript',
        code: `// npm install pg

const { Pool } = require('pg');

// Connection pool -- reuses connections instead of creating new ones
const pool = new Pool({
  host: 'db-primary',        // DistSim hostname
  port: 5432,
  user: 'appuser',
  password: 'secret123',
  database: 'myapp',
  max: 20,                    // Maximum connections in the pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000,
});

// Test the connection
async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() AS current_time');
    console.log('Connected! Server time:', result.rows[0].current_time);
  } finally {
    client.release(); // Return connection to pool
  }
}

// INSERT a new user
async function createUser(name, email) {
  // Use parameterized queries to prevent SQL injection
  const result = await pool.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, created_at',
    [name, email]
  );
  return result.rows[0]; // { id: 4, created_at: '2024-...' }
}

// SELECT with filtering
async function getUserByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

// Transaction example -- transfer money between accounts
async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

testConnection().catch(console.error);`,
        description: 'Production-ready Node.js PostgreSQL connection with connection pooling, parameterized queries (SQL injection safe), and transaction support for multi-step operations.',
      },
      {
        title: 'Python Connection',
        language: 'python',
        code: `# pip3 install psycopg2-binary

import psycopg2
from psycopg2.extras import RealDictCursor

# Connect to PostgreSQL
conn = psycopg2.connect(
    host='db-primary',        # DistSim hostname
    port=5432,
    user='appuser',
    password='secret123',
    dbname='myapp'
)

# Use RealDictCursor to get results as dictionaries
cursor = conn.cursor(cursor_factory=RealDictCursor)

# INSERT a new user
def create_user(name, email):
    cursor.execute(
        "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id, created_at",
        (name, email)
    )
    conn.commit()  # PostgreSQL requires explicit commit
    return cursor.fetchone()  # {'id': 4, 'created_at': datetime(...)}

# SELECT all users
def get_users():
    cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
    return cursor.fetchall()

# SELECT with parameterized query (safe from SQL injection)
def get_user_by_email(email):
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    return cursor.fetchone()

# Transaction example
def transfer_funds(from_id, to_id, amount):
    try:
        cursor.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s",
            (amount, from_id)
        )
        cursor.execute(
            "UPDATE accounts SET balance = balance + %s WHERE id = %s",
            (amount, to_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e

# Usage
user = create_user('Alice', 'alice@example.com')
print(f"Created user: {user}")

users = get_users()
for u in users:
    print(f"  {u['name']} ({u['email']})")

# Always close when done
cursor.close()
conn.close()`,
        description: 'Python PostgreSQL connection using psycopg2 with dictionary cursors, parameterized queries, and transaction handling. Always use %s placeholders (never f-strings) for query parameters.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. REDIS
  // ---------------------------------------------------------------------------
  redis: {
    title: 'Redis -- In-Memory Data Structure Store & Cache',
    description:
      'Redis (Remote Dictionary Server) stores data entirely in memory (RAM), delivering sub-millisecond read and write latency. Unlike simple key-value caches, Redis supports rich data structures: strings, lists, sets, sorted sets, hashes, streams, bitmaps, and HyperLogLogs. Twitter runs over 10,000 Redis instances for timeline caching and rate limiting. GitHub uses Redis for job queues (Resque/Sidekiq). Pinterest caches user feeds, Stripe handles rate limiting, and Snapchat processes 10+ billion messages per day through Redis. Common patterns include caching (store DB query results in memory), session storage (who is logged in), rate limiting (count requests per IP per second), leaderboards (sorted sets), real-time pub/sub messaging, and distributed locks.',
    install: [
      'apt-get update && apt-get install -y redis-server redis-tools',
      'redis-server --daemonize yes --bind 0.0.0.0 --protected-mode no',
    ],
    config_files: [
      { path: '/etc/redis/redis.conf', description: 'Main config -- bind address, port, maxmemory, eviction policy, persistence (RDB/AOF), replication settings' },
    ],
    common_commands: [
      { command: 'redis-server --daemonize yes --bind 0.0.0.0 --protected-mode no', description: 'Start Redis in background, accessible from all machines in the network' },
      { command: 'redis-cli ping', description: 'Test connection -- should return PONG' },
      { command: 'redis-cli SET user:1:name "Alice"', description: 'Store a string value with a namespaced key' },
      { command: 'redis-cli GET user:1:name', description: 'Retrieve a string value by key' },
      { command: 'redis-cli SET session:abc123 "user_id=42" EX 3600', description: 'Store a value with 1-hour expiration (TTL) -- perfect for sessions' },
      { command: 'redis-cli TTL session:abc123', description: 'Check remaining time-to-live in seconds for a key' },
      { command: 'redis-cli DEL user:1:name', description: 'Delete a key' },
      { command: 'redis-cli HSET user:1 name "Alice" email "alice@test.com" age 30', description: 'Store a hash (like a mini-object with fields) -- efficient for structured data' },
      { command: 'redis-cli HGETALL user:1', description: 'Get all fields and values from a hash' },
      { command: 'redis-cli LPUSH queue:tasks "send_email" "process_payment"', description: 'Push items onto a list (left side) -- use as a job queue' },
      { command: 'redis-cli RPOP queue:tasks', description: 'Pop an item from the list (right side) -- workers consume from here' },
      { command: 'redis-cli ZADD leaderboard 100 "player1" 250 "player2" 75 "player3"', description: 'Add members with scores to a sorted set -- instant leaderboard' },
      { command: 'redis-cli ZREVRANGE leaderboard 0 9 WITHSCORES', description: 'Get top 10 from the leaderboard (highest scores first)' },
      { command: 'redis-cli INCR rate:ip:192.168.1.1', description: 'Atomically increment a counter -- use for rate limiting (count requests per IP)' },
      { command: 'redis-cli PUBLISH events "order_placed"', description: 'Publish a message to a channel (pub/sub pattern)' },
      { command: 'redis-cli SUBSCRIBE events', description: 'Subscribe to a channel to receive messages in real-time' },
      { command: 'redis-cli INFO memory', description: 'Show memory usage statistics -- used_memory, peak, fragmentation ratio' },
      { command: 'redis-cli INFO replication', description: 'Show replication status -- role (master/slave), connected replicas, replication offset' },
      { command: 'redis-cli MONITOR', description: 'Watch ALL commands hitting Redis in real-time (warning: high overhead, use for debugging only)' },
      { command: 'redis-cli DBSIZE', description: 'Count total number of keys in the current database' },
    ],
    test_commands: [
      { command: 'redis-cli ping', description: 'Should return PONG -- confirms the server is running and accepting connections' },
      { command: 'redis-cli -h redis ping', description: 'Test connection from another machine using the hostname "redis"' },
      { command: 'ss -tlnp | grep 6379', description: 'Verify port 6379 is bound and listening' },
      { command: 'redis-cli SET test "hello" && redis-cli GET test', description: 'Write and read back a value -- full round-trip test' },
      { command: 'redis-cli INFO server | head -10', description: 'Show server version, uptime, and process ID' },
    ],
    ports: [
      { port: 6379, description: 'Redis RESP protocol (client connections)' },
      { port: 16379, description: 'Redis Cluster bus (node-to-node communication, only in cluster mode)' },
      { port: 26379, description: 'Redis Sentinel (high availability monitoring, only with Sentinel)' },
    ],
    tips: [
      '"--bind 0.0.0.0" makes Redis accessible from other machines. The default binds to localhost only, which means other machines in your lab cannot connect.',
      '"--protected-mode no" disables the authentication requirement. Fine for learning in DistSim, but in production you must set "requirepass YourStrongPassword" in redis.conf.',
      'ALWAYS set maxmemory in production (e.g., "maxmemory 256mb"). Without it, Redis grows until the OS kills it with OOM (Out of Memory). Pair it with an eviction policy like "maxmemory-policy allkeys-lru".',
      'Redis persistence has two modes: RDB (periodic snapshots, fast recovery, some data loss) and AOF (append every write, slower recovery, minimal data loss). Use both in production: "save 60 1000" for RDB + "appendonly yes" for AOF.',
      'Use key namespacing with colons: "user:42:profile", "session:abc123", "rate:ip:10.0.0.1". This makes keys self-documenting and allows pattern-based operations like KEYS "user:42:*".',
      'Never use KEYS in production -- it scans all keys and blocks the server. Use SCAN instead for iterating over keys safely.',
      'Redis is single-threaded for command execution. One slow command (like KEYS * on a million keys) blocks ALL other clients. Use SCAN, pipeline commands, and avoid O(N) operations on large datasets.',
      'Pipelining sends multiple commands without waiting for individual responses, reducing round-trip overhead by 5-10x. Most Redis client libraries support this natively.',
    ],
    code_examples: [
      {
        title: 'Caching Pattern',
        language: 'bash',
        code: `# Basic caching pattern: SET with TTL, GET, check miss/hit

# Store a value with 300-second (5 minute) expiration
redis-cli -h redis SET "cache:user:42" '{"name":"Alice","email":"alice@test.com"}' EX 300

# Retrieve the cached value
redis-cli -h redis GET "cache:user:42"
# Output: {"name":"Alice","email":"alice@test.com"}

# Check remaining TTL (time-to-live in seconds)
redis-cli -h redis TTL "cache:user:42"
# Output: (integer) 295

# Check if a key exists (1 = hit, 0 = miss)
redis-cli -h redis EXISTS "cache:user:42"
# Output: (integer) 1

redis-cli -h redis EXISTS "cache:user:999"
# Output: (integer) 0  <-- cache miss, need to query the database

# Store a hash (structured data) with TTL
redis-cli -h redis HSET "session:abc123" user_id 42 role "admin" login_time "2024-01-15T10:30:00Z"
redis-cli -h redis EXPIRE "session:abc123" 3600  # Expire in 1 hour

# Get all fields from the hash
redis-cli -h redis HGETALL "session:abc123"
# Output: user_id 42 role admin login_time 2024-01-15T10:30:00Z

# Delete a cached entry (cache invalidation)
redis-cli -h redis DEL "cache:user:42"`,
        description: 'The cache-aside pattern: check Redis first (fast), on cache miss query the database (slow) and store the result in Redis with a TTL. On cache hit, skip the database entirely.',
      },
      {
        title: 'Rate Limiter',
        language: 'bash',
        code: `# Rate limiting pattern using INCR + EXPIRE
# Limit each IP to 100 requests per 60-second window

# Simulate a request from IP 192.168.1.50
IP="192.168.1.50"
WINDOW=60  # seconds

# Increment the counter for this IP (creates key if it doesn't exist)
redis-cli -h redis INCR "ratelimit:$IP"

# Set expiration ONLY if the key is new (TTL = -1 means no expiry set)
# This ensures the window resets after 60 seconds
redis-cli -h redis TTL "ratelimit:$IP"
# If output is -1 (no TTL), set the expiration:
redis-cli -h redis EXPIRE "ratelimit:$IP" $WINDOW

# Check current request count
redis-cli -h redis GET "ratelimit:$IP"
# Output: "1"  (first request in this window)

# Simulate 5 more requests
for i in $(seq 1 5); do
  redis-cli -h redis INCR "ratelimit:$IP"
done

redis-cli -h redis GET "ratelimit:$IP"
# Output: "6"

# Check how many seconds until the window resets
redis-cli -h redis TTL "ratelimit:$IP"
# Output: (integer) 47

# In your application logic:
# if GET "ratelimit:$IP" > 100 then return HTTP 429 Too Many Requests`,
        description: 'Sliding window rate limiter using atomic INCR. Each IP gets a counter that expires after the window. If the count exceeds the limit, reject the request with 429.',
      },
      {
        title: 'Node.js Connection',
        language: 'javascript',
        code: `// npm install ioredis

const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis',        // DistSim hostname
  port: 6379,
  retryStrategy(times) {
    // Reconnect after increasing delay, max 3 seconds
    return Math.min(times * 200, 3000);
  },
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));

// === Cache-Aside Pattern ===
async function getUser(userId) {
  const cacheKey = \`cache:user:\${userId}\`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('Cache HIT');
    return JSON.parse(cached);
  }

  // 2. Cache miss -- query database
  console.log('Cache MISS -- querying database');
  const user = await queryDatabase(userId); // your DB query here

  // 3. Store in cache with 5-minute TTL
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 300);

  return user;
}

// === Rate Limiting ===
async function checkRateLimit(ip, limit = 100, windowSec = 60) {
  const key = \`ratelimit:\${ip}\`;
  const current = await redis.incr(key);

  // Set expiry on first request in the window
  if (current === 1) {
    await redis.expire(key, windowSec);
  }

  return {
    allowed: current <= limit,
    current,
    remaining: Math.max(0, limit - current),
  };
}

// === Session Storage ===
async function setSession(sessionId, data, ttlSeconds = 3600) {
  await redis.hmset(\`session:\${sessionId}\`, data);
  await redis.expire(\`session:\${sessionId}\`, ttlSeconds);
}

async function getSession(sessionId) {
  return await redis.hgetall(\`session:\${sessionId}\`);
}

// Usage
(async () => {
  await redis.set('hello', 'world');
  const value = await redis.get('hello');
  console.log('hello =', value); // "world"

  const rate = await checkRateLimit('192.168.1.50');
  console.log('Rate limit:', rate);
})();`,
        description: 'Production-ready Redis client with cache-aside pattern, rate limiting, and session storage. ioredis is the recommended Node.js Redis client with built-in reconnection and pipeline support.',
      },
      {
        title: 'Pub/Sub',
        language: 'bash',
        code: `# Redis Pub/Sub: real-time messaging between services
# Open TWO terminals for this example

# === TERMINAL 1: Subscriber (start this first) ===
# Subscribe to the "events" channel and wait for messages
redis-cli -h redis SUBSCRIBE events
# Output: Reading messages... (waiting)
# When a message arrives:
#   1) "message"
#   2) "events"
#   3) "order_placed:user42"

# Subscribe to multiple channels with pattern matching
# redis-cli -h redis PSUBSCRIBE "events.*"
# This matches: events.orders, events.payments, events.users

# === TERMINAL 2: Publisher ===
# Publish messages to the "events" channel
redis-cli -h redis PUBLISH events "order_placed:user42"
# Output: (integer) 1  <-- number of subscribers who received it

redis-cli -h redis PUBLISH events "payment_completed:order123"
# Output: (integer) 1

# Publish to a pattern-matched channel
redis-cli -h redis PUBLISH events.orders "new_order:item456"

# Check how many subscribers are listening
redis-cli -h redis PUBSUB NUMSUB events
# Output: 1) "events"  2) (integer) 1

# List all active channels with subscribers
redis-cli -h redis PUBSUB CHANNELS "*"`,
        description: 'Pub/Sub enables real-time messaging: publishers send messages to channels, subscribers receive them instantly. Unlike Kafka, messages are fire-and-forget (not persisted). Use for notifications, cache invalidation, and real-time updates.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. KAFKA
  // ---------------------------------------------------------------------------
  kafka: {
    title: 'Kafka -- Distributed Event Streaming Platform',
    description:
      'Apache Kafka is a distributed event streaming platform designed for high-throughput, fault-tolerant, real-time data pipelines. Unlike traditional message brokers that delete messages after delivery, Kafka persists messages on disk for a configurable retention period (default 7 days), allowing consumers to replay events from any point in time. LinkedIn (where Kafka was created) processes over 7 trillion messages per day. Uber handles 4 trillion messages per day for trip tracking, surge pricing, and driver matching. Netflix uses Kafka for real-time recommendations and content delivery optimization. Kafka is the backbone of event-driven architectures, enabling patterns like event sourcing (rebuilding state from events), CQRS (separate read/write models), and async microservice communication where services produce events without knowing who consumes them.',
    install: [
      '# Kafka requires Java (JDK) as a prerequisite',
      'apt-get update && apt-get install -y default-jdk wget',
      'wget https://downloads.apache.org/kafka/3.6.0/kafka_2.13-3.6.0.tgz',
      'tar xzf kafka_2.13-3.6.0.tgz && cd kafka_2.13-3.6.0',
      '# Start ZooKeeper first (Kafka needs it for cluster coordination):',
      'bin/zookeeper-server-start.sh config/zookeeper.properties &',
      '# Wait 5 seconds for ZooKeeper to start, then start Kafka:',
      'sleep 5 && bin/kafka-server-start.sh config/server.properties &',
    ],
    config_files: [
      { path: '/home/distsim/kafka/config/server.properties', description: 'Broker config -- broker.id, listeners, advertised.listeners, log.dirs, num.partitions, default.replication.factor, log.retention.hours' },
      { path: '/home/distsim/kafka/config/zookeeper.properties', description: 'ZooKeeper config -- dataDir, clientPort (2181), tickTime' },
      { path: '/home/distsim/kafka/config/consumer.properties', description: 'Default consumer config -- group.id, auto.offset.reset, enable.auto.commit' },
      { path: '/home/distsim/kafka/config/producer.properties', description: 'Default producer config -- acks, retries, batch.size, linger.ms' },
    ],
    common_commands: [
      { command: 'cd /home/distsim/kafka && bin/kafka-topics.sh --create --topic orders --partitions 3 --replication-factor 1 --bootstrap-server localhost:9092', description: 'Create a topic called "orders" with 3 partitions for parallel consumption' },
      { command: 'cd /home/distsim/kafka && bin/kafka-topics.sh --list --bootstrap-server localhost:9092', description: 'List all topics on the broker' },
      { command: 'cd /home/distsim/kafka && bin/kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092', description: 'Show topic details: partitions, replicas, leader, ISR (in-sync replicas)' },
      { command: 'cd /home/distsim/kafka && echo "order_placed:user123" | bin/kafka-console-producer.sh --topic orders --bootstrap-server localhost:9092', description: 'Produce a single message to the "orders" topic' },
      { command: 'cd /home/distsim/kafka && bin/kafka-console-consumer.sh --topic orders --from-beginning --bootstrap-server localhost:9092', description: 'Consume all messages from the beginning of the topic' },
      { command: 'cd /home/distsim/kafka && bin/kafka-console-consumer.sh --topic orders --group my-service --bootstrap-server localhost:9092', description: 'Consume as part of a consumer group -- Kafka distributes partitions across group members' },
      { command: 'cd /home/distsim/kafka && bin/kafka-consumer-groups.sh --describe --group my-service --bootstrap-server localhost:9092', description: 'Check consumer group lag -- how far behind each partition consumer is' },
      { command: 'cd /home/distsim/kafka && bin/kafka-consumer-groups.sh --list --bootstrap-server localhost:9092', description: 'List all consumer groups on the broker' },
      { command: 'cd /home/distsim/kafka && bin/kafka-topics.sh --alter --topic orders --partitions 6 --bootstrap-server localhost:9092', description: 'Increase partitions (cannot decrease) -- add more parallelism' },
      { command: 'cd /home/distsim/kafka && bin/kafka-log-dirs.sh --describe --bootstrap-server localhost:9092', description: 'Show disk usage per topic and partition' },
    ],
    test_commands: [
      { command: 'ss -tlnp | grep 9092', description: 'Verify Kafka broker is listening on port 9092' },
      { command: 'ss -tlnp | grep 2181', description: 'Verify ZooKeeper is listening on port 2181' },
      { command: 'cd /home/distsim/kafka && bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 | head -5', description: 'Verify the broker is responding and check API versions' },
      { command: 'cd /home/distsim/kafka && echo "test_message" | bin/kafka-console-producer.sh --topic test --bootstrap-server localhost:9092 && bin/kafka-console-consumer.sh --topic test --from-beginning --max-messages 1 --bootstrap-server localhost:9092', description: 'Full round-trip: produce a message and consume it back' },
    ],
    ports: [
      { port: 9092, description: 'Kafka broker (producer/consumer connections)' },
      { port: 2181, description: 'ZooKeeper (cluster coordination, required by Kafka < 3.4)' },
      { port: 9093, description: 'Kafka broker (SSL listener, if configured)' },
    ],
    tips: [
      'Kafka REQUIRES ZooKeeper to be running first (for versions < 3.4). If Kafka fails to start, check if ZooKeeper is up: "ss -tlnp | grep 2181". Newer Kafka versions support KRaft mode (no ZooKeeper).',
      'Topics are divided into partitions. Each partition is an ordered, immutable log. More partitions = more consumers can read in parallel. Start with 3-6 partitions per topic.',
      'Consumer groups are how Kafka distributes work. If topic "orders" has 3 partitions and consumer group "payment-service" has 3 instances, each instance gets 1 partition. If you add a 4th instance, one will be idle.',
      'Producer "acks" setting controls durability: acks=0 (fire-and-forget, fastest, data loss possible), acks=1 (leader acknowledged, good balance), acks=all (all replicas acknowledged, safest, slowest).',
      'Kafka is NOT a traditional message queue. Messages are not deleted after consumption -- they persist for the configured retention period. Multiple consumer groups can independently read the same messages.',
      'Kafka is heavyweight -- it needs Java, ZooKeeper, and significant memory (1GB+ heap). Expect 30-60 seconds for full startup. If the machine has limited RAM, set KAFKA_HEAP_OPTS="-Xmx512m -Xms512m".',
      'Use "kafka-consumer-groups.sh --describe" to monitor consumer lag. If lag keeps growing, your consumers are too slow -- add more consumers to the group (up to the number of partitions).',
      'Message ordering is guaranteed ONLY within a single partition. If you need all events for user:42 in order, use user_id as the message key -- Kafka hashes the key to determine the partition.',
    ],
    code_examples: [
      {
        title: 'Create Topic + Produce + Consume',
        language: 'bash',
        code: `# Full Kafka CLI workflow: topic creation, producing, and consuming

# Navigate to Kafka installation
cd /home/distsim/kafka

# 1. Create a topic with 3 partitions
bin/kafka-topics.sh --create \\
    --topic orders \\
    --partitions 3 \\
    --replication-factor 1 \\
    --bootstrap-server localhost:9092

# 2. List all topics to verify
bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# 3. Describe the topic (shows partitions, leaders, replicas)
bin/kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092

# 4. Produce messages (interactive -- type messages, press Enter)
echo 'order_created:{"user_id":42,"product":"laptop","amount":999}' | \\
    bin/kafka-console-producer.sh --topic orders --bootstrap-server localhost:9092

echo 'order_created:{"user_id":43,"product":"mouse","amount":29}' | \\
    bin/kafka-console-producer.sh --topic orders --bootstrap-server localhost:9092

# 5. Consume all messages from the beginning
bin/kafka-console-consumer.sh \\
    --topic orders \\
    --from-beginning \\
    --bootstrap-server localhost:9092

# 6. Consume as a consumer group (for parallel processing)
bin/kafka-console-consumer.sh \\
    --topic orders \\
    --group payment-service \\
    --bootstrap-server localhost:9092

# 7. Check consumer group lag (how far behind consumers are)
bin/kafka-consumer-groups.sh \\
    --describe \\
    --group payment-service \\
    --bootstrap-server localhost:9092`,
        description: 'Complete Kafka workflow from topic creation through message production and consumption. Consumer groups enable parallel processing -- Kafka distributes partitions across group members.',
      },
      {
        title: 'Node.js Producer',
        language: 'javascript',
        code: `// npm install kafkajs

const { Kafka } = require('kafkajs');

// Create a Kafka client
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-1:9092'],   // DistSim Kafka broker
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

const producer = kafka.producer();

async function start() {
  // Connect the producer
  await producer.connect();
  console.log('Producer connected to Kafka');

  // Send a single message
  await producer.send({
    topic: 'orders',
    messages: [
      {
        // Key determines which partition the message goes to
        // All messages with the same key go to the same partition (ordering)
        key: 'user-42',
        value: JSON.stringify({
          event: 'order_created',
          user_id: 42,
          product: 'laptop',
          amount: 999.99,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
  console.log('Message sent to "orders" topic');

  // Send a batch of messages
  await producer.send({
    topic: 'orders',
    messages: [
      { key: 'user-42', value: JSON.stringify({ event: 'payment_completed', order_id: 1 }) },
      { key: 'user-43', value: JSON.stringify({ event: 'order_created', user_id: 43 }) },
      { key: 'user-42', value: JSON.stringify({ event: 'order_shipped', order_id: 1 }) },
    ],
  });
  console.log('Batch of 3 messages sent');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await producer.disconnect();
  process.exit(0);
});

start().catch(console.error);`,
        description: 'KafkaJS producer that sends messages with keys for partition routing. Messages with the same key always go to the same partition, guaranteeing ordering per user/entity.',
      },
      {
        title: 'Node.js Consumer',
        language: 'javascript',
        code: `// npm install kafkajs

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: ['kafka-1:9092'],   // DistSim Kafka broker
});

// Consumer group: Kafka distributes partitions across group members
const consumer = kafka.consumer({ groupId: 'payment-service-group' });

async function start() {
  await consumer.connect();
  console.log('Consumer connected to Kafka');

  // Subscribe to the "orders" topic
  await consumer.subscribe({
    topic: 'orders',
    fromBeginning: false,  // Only new messages (set true to replay all)
  });

  // Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      const key = message.key?.toString();

      console.log(\`Received from partition \${partition}:\`, {
        key,
        event: event.event,
        offset: message.offset,
      });

      // Process different event types
      switch (event.event) {
        case 'order_created':
          console.log(\`Processing payment for user \${event.user_id}\`);
          // await processPayment(event);
          break;

        case 'payment_completed':
          console.log(\`Payment confirmed for order \${event.order_id}\`);
          // await confirmOrder(event);
          break;

        default:
          console.log(\`Unknown event: \${event.event}\`);
      }
    },
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  process.exit(0);
});

start().catch(console.error);`,
        description: 'KafkaJS consumer in a consumer group. Kafka automatically assigns partitions to group members. If you run 3 instances of this consumer with 3 partitions, each gets 1 partition.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. MONGODB
  // ---------------------------------------------------------------------------
  mongodb: {
    title: 'MongoDB -- Document Database with Flexible Schema',
    description:
      'MongoDB stores data as JSON-like documents (technically BSON -- Binary JSON) in collections, rather than rows in tables. Each document can have a different structure, which makes MongoDB excellent for rapid development, evolving schemas, and storing nested or hierarchical data without complex JOINs. Coinbase uses MongoDB for their cryptocurrency trading platform. Forbes, eBay, Adobe, EA Games, and Toyota all run MongoDB in production. Unlike relational databases, MongoDB trades strict consistency for flexibility: you can store a user document with embedded addresses, preferences, and order history all in one document rather than spreading it across five tables. MongoDB supports replica sets (automatic failover), sharding (horizontal scaling), aggregation pipelines (complex data transformations), and full-text search indexes.',
    install: [
      'apt-get update && apt-get install -y gnupg wget',
      'wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -',
      'echo "deb http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb.list',
      'apt-get update && apt-get install -y mongodb-org',
      'mongod --bind_ip_all --fork --logpath /var/log/mongodb/mongod.log',
    ],
    config_files: [
      { path: '/etc/mongod.conf', description: 'Main config -- bindIp, port, dbPath, storage engine (WiredTiger), replication, security settings' },
      { path: '/var/log/mongodb/mongod.log', description: 'Server log -- connection events, slow queries, replication status, index builds' },
    ],
    common_commands: [
      { command: 'mongod --bind_ip_all --fork --logpath /var/log/mongodb/mongod.log', description: 'Start MongoDB in background, accessible from all machines' },
      { command: 'mongosh', description: 'Open the MongoDB shell (interactive REPL for running queries)' },
      { command: 'mongosh --eval "db.adminCommand({ping: 1})"', description: 'Test if the server is responding' },
      { command: 'mongosh myapp --eval "db.createCollection(\'users\')"', description: 'Create a collection (like a table) in the "myapp" database' },
      { command: 'mongosh myapp --eval "db.users.insertOne({name: \'Alice\', email: \'alice@test.com\', age: 30, address: {city: \'NYC\', zip: \'10001\'}})"', description: 'Insert a document with nested data -- no schema required' },
      { command: 'mongosh myapp --eval "db.users.find().pretty()"', description: 'Query all documents in a collection with formatted output' },
      { command: 'mongosh myapp --eval "db.users.find({age: {\\$gte: 25}}).pretty()"', description: 'Query with a filter: find users aged 25 or older' },
      { command: 'mongosh myapp --eval "db.users.updateOne({name: \'Alice\'}, {\\$set: {age: 31}})"', description: 'Update a single document -- $set modifies only the specified fields' },
      { command: 'mongosh myapp --eval "db.users.deleteOne({name: \'Alice\'})"', description: 'Delete a single document matching the filter' },
      { command: 'mongosh myapp --eval "db.users.createIndex({email: 1}, {unique: true})"', description: 'Create a unique index on email -- prevents duplicates and speeds up lookups' },
      { command: 'mongosh myapp --eval "db.users.find({email: \'alice@test.com\'}).explain(\'executionStats\')"', description: 'Show query execution plan -- check if indexes are being used' },
      { command: 'mongosh myapp --eval "db.users.aggregate([{\\$group: {_id: \'\\$address.city\', count: {\\$sum: 1}}}, {\\$sort: {count: -1}}])"', description: 'Aggregation pipeline: count users per city, sorted descending' },
      { command: 'mongodump --db myapp --out /tmp/backup/', description: 'Backup the "myapp" database to a directory' },
      { command: 'mongorestore --db myapp /tmp/backup/myapp/', description: 'Restore a database from a backup directory' },
    ],
    test_commands: [
      { command: 'mongosh --eval "db.adminCommand({ping: 1})"', description: 'Verify the server is running and responding' },
      { command: 'ss -tlnp | grep 27017', description: 'Verify port 27017 is bound and listening' },
      { command: 'mongosh --eval "db.serverStatus().connections"', description: 'Check active connection count' },
      { command: 'mongosh --eval "show dbs"', description: 'List all databases and their sizes' },
    ],
    ports: [
      { port: 27017, description: 'MongoDB wire protocol (client connections)' },
      { port: 27018, description: 'MongoDB shard server (in sharded cluster)' },
      { port: 27019, description: 'MongoDB config server (in sharded cluster)' },
    ],
    tips: [
      'MongoDB binds to localhost by default. Use "--bind_ip_all" or set bindIp to 0.0.0.0 in mongod.conf to allow connections from other machines in your lab.',
      'Every document automatically gets an "_id" field (ObjectId) if you do not provide one. This is the primary key and is indexed by default.',
      'Embed related data (addresses inside users) when data is read together. Use references (store user_id in orders) when data is read independently. This is the most important MongoDB design decision.',
      'MongoDB is NOT a replacement for PostgreSQL when you need transactions across multiple collections, complex JOINs, or strict schema enforcement. Use MongoDB when your data is naturally hierarchical or when schemas evolve rapidly.',
      'Always create indexes for fields you query frequently. Without indexes, MongoDB performs a full collection scan (reads every document). Use explain() to verify your queries use indexes.',
      'The aggregation pipeline ($match, $group, $sort, $project, $lookup) is MongoDB\'s answer to SQL GROUP BY and JOIN. Learn it -- it is extremely powerful for data analysis.',
      'In production, always run MongoDB as a replica set (minimum 3 nodes) for automatic failover. A single MongoDB instance is a single point of failure.',
      'Set up authentication in production: mongosh admin --eval "db.createUser({user:\'admin\', pwd:\'secret\', roles:[\'root\']})" then restart with --auth flag.',
    ],
    code_examples: [
      {
        title: 'CRUD Operations',
        language: 'bash',
        code: `# MongoDB CRUD operations using mongosh

# Connect to MongoDB and use the "myapp" database
# (MongoDB creates databases and collections automatically on first use)

# INSERT: add documents to the "users" collection
mongosh myapp --eval '
  db.users.insertMany([
    {
      name: "Alice",
      email: "alice@test.com",
      age: 30,
      address: { city: "NYC", zip: "10001" },
      tags: ["admin", "active"]
    },
    {
      name: "Bob",
      email: "bob@test.com",
      age: 25,
      address: { city: "LA", zip: "90001" },
      tags: ["user", "active"]
    },
    {
      name: "Charlie",
      email: "charlie@test.com",
      age: 35,
      address: { city: "Chicago", zip: "60601" },
      tags: ["user", "inactive"]
    }
  ])
'

# FIND: query documents
mongosh myapp --eval 'db.users.find({ age: { $gte: 30 } }).pretty()'

# FIND with projection (select specific fields)
mongosh myapp --eval 'db.users.find({}, { name: 1, email: 1, _id: 0 }).pretty()'

# FIND by nested field
mongosh myapp --eval 'db.users.find({ "address.city": "NYC" }).pretty()'

# UPDATE: modify a document
mongosh myapp --eval 'db.users.updateOne(
  { name: "Alice" },
  { $set: { age: 31 }, $push: { tags: "verified" } }
)'

# DELETE: remove a document
mongosh myapp --eval 'db.users.deleteOne({ name: "Charlie" })'

# Count documents matching a filter
mongosh myapp --eval 'db.users.countDocuments({ tags: "active" })'`,
        description: 'Complete CRUD operations in MongoDB. Documents are JSON-like objects that can have nested fields, arrays, and mixed types. No schema definition needed -- just insert and go.',
      },
      {
        title: 'Aggregation Pipeline',
        language: 'bash',
        code: `# MongoDB Aggregation Pipeline: complex data transformations
# Pipeline stages process documents in sequence: $match -> $group -> $sort

# First, insert some order data
mongosh myapp --eval '
  db.orders.insertMany([
    { user: "Alice", product: "Laptop", amount: 999, category: "electronics", date: new Date("2024-01-15") },
    { user: "Alice", product: "Mouse", amount: 29, category: "electronics", date: new Date("2024-01-16") },
    { user: "Bob", product: "Book", amount: 15, category: "books", date: new Date("2024-01-15") },
    { user: "Bob", product: "Keyboard", amount: 79, category: "electronics", date: new Date("2024-01-17") },
    { user: "Charlie", product: "Coffee", amount: 12, category: "food", date: new Date("2024-01-15") },
    { user: "Alice", product: "Monitor", amount: 449, category: "electronics", date: new Date("2024-01-18") }
  ])
'

# Aggregation 1: Total spending per user, sorted highest first
mongosh myapp --eval '
  db.orders.aggregate([
    { $group: {
        _id: "$user",
        total_spent: { $sum: "$amount" },
        order_count: { $sum: 1 },
        avg_order: { $avg: "$amount" }
    }},
    { $sort: { total_spent: -1 } }
  ]).pretty()
'

# Aggregation 2: Revenue by category (only electronics)
mongosh myapp --eval '
  db.orders.aggregate([
    { $match: { category: "electronics" } },
    { $group: {
        _id: "$category",
        total_revenue: { $sum: "$amount" },
        products: { $push: "$product" }
    }}
  ]).pretty()
'

# Aggregation 3: Daily order summary
mongosh myapp --eval '
  db.orders.aggregate([
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        daily_total: { $sum: "$amount" },
        orders: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]).pretty()
'`,
        description: 'Aggregation pipelines are MongoDB\'s answer to SQL GROUP BY, HAVING, and complex JOINs. Each stage transforms the data and passes it to the next stage. Extremely powerful for analytics.',
      },
      {
        title: 'Node.js Connection',
        language: 'javascript',
        code: `// npm install mongodb

const { MongoClient } = require('mongodb');

const uri = 'mongodb://mongodb:27017';  // DistSim hostname
const client = new MongoClient(uri);

async function main() {
  // Connect to MongoDB
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db('myapp');
  const users = db.collection('users');

  // INSERT a document
  const result = await users.insertOne({
    name: 'Alice',
    email: 'alice@test.com',
    age: 30,
    address: { city: 'NYC', zip: '10001' },
    createdAt: new Date(),
  });
  console.log('Inserted:', result.insertedId);

  // FIND documents
  const allUsers = await users.find({ age: { $gte: 25 } }).toArray();
  console.log('Users aged 25+:', allUsers);

  // FIND ONE by email
  const user = await users.findOne({ email: 'alice@test.com' });
  console.log('Found user:', user);

  // UPDATE a document
  await users.updateOne(
    { email: 'alice@test.com' },
    { $set: { age: 31 }, $push: { tags: 'verified' } }
  );

  // Aggregation pipeline
  const spending = await db.collection('orders').aggregate([
    { $group: {
        _id: '$user',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
    }},
    { $sort: { total: -1 } },
  ]).toArray();
  console.log('Spending by user:', spending);

  // Create an index for faster queries
  await users.createIndex({ email: 1 }, { unique: true });

  // DELETE a document
  await users.deleteOne({ name: 'Alice' });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});

main().catch(console.error);`,
        description: 'Complete MongoDB Node.js driver example with CRUD operations, aggregation pipelines, and index creation. The driver API mirrors the mongosh commands closely.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. MYSQL
  // ---------------------------------------------------------------------------
  mysql: {
    title: 'MySQL -- The Most Deployed Open-Source Relational Database',
    description:
      'MySQL is the world\'s most popular open-source relational database, trusted for its reliability, simplicity, and performance. Meta (Facebook) operates the largest MySQL deployment on Earth with thousands of servers handling billions of queries per second for the social graph. Uber migrated from PostgreSQL to MySQL for their driver/rider matching system. Shopify runs 900,000+ stores on MySQL. GitHub, Airbnb, Twitter, and Netflix all use MySQL for various workloads. MySQL uses the InnoDB storage engine by default, which provides ACID transactions, row-level locking, and crash recovery. For massive scale, companies use Vitess (developed by YouTube) to shard MySQL across hundreds of servers while maintaining the illusion of a single database.',
    install: [
      'apt-get update && apt-get install -y mysql-server mysql-client',
      'service mysql start',
    ],
    config_files: [
      { path: '/etc/mysql/mysql.conf.d/mysqld.cnf', description: 'Main server config -- bind-address, port, datadir, innodb_buffer_pool_size, server-id (for replication)' },
      { path: '/etc/mysql/my.cnf', description: 'Global config file -- includes files from conf.d/ directory, client and server sections' },
      { path: '/var/log/mysql/error.log', description: 'Error log -- startup errors, crash recovery, replication issues, slow query warnings' },
    ],
    common_commands: [
      { command: 'service mysql start', description: 'Start the MySQL server' },
      { command: 'service mysql stop', description: 'Stop the MySQL server' },
      { command: 'service mysql status', description: 'Check if MySQL is running' },
      { command: 'mysql -u root', description: 'Open the MySQL shell as root (may need -p for password)' },
      { command: 'mysql -u root -e "CREATE DATABASE myapp;"', description: 'Create a new database' },
      { command: 'mysql -u root -e "CREATE USER \'appuser\'@\'%\' IDENTIFIED BY \'secret123\';"', description: 'Create a user that can connect from any host (%)' },
      { command: 'mysql -u root -e "GRANT ALL PRIVILEGES ON myapp.* TO \'appuser\'@\'%\'; FLUSH PRIVILEGES;"', description: 'Grant full access to the database and reload permissions' },
      { command: 'mysql -u root myapp -e "CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(255) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"', description: 'Create a users table with auto-increment ID and timestamp' },
      { command: 'mysql -u root myapp -e "INSERT INTO users (name, email) VALUES (\'Alice\', \'alice@test.com\');"', description: 'Insert a row into the users table' },
      { command: 'mysql -u root myapp -e "SELECT * FROM users;"', description: 'Query all rows from the users table' },
      { command: 'mysql -u root myapp -e "EXPLAIN SELECT * FROM users WHERE email = \'alice@test.com\';"', description: 'Show the query execution plan -- check if indexes are being used' },
      { command: 'mysql -u root -e "SHOW PROCESSLIST;"', description: 'Show all active connections and running queries' },
      { command: 'mysqldump -u root myapp > /tmp/myapp-backup.sql', description: 'Backup the entire database to a SQL file' },
      { command: 'mysql -u root myapp < /tmp/myapp-backup.sql', description: 'Restore a database from a SQL backup file' },
    ],
    test_commands: [
      { command: 'mysql -u root -e "SELECT 1;"', description: 'Verify the database engine is responding' },
      { command: 'ss -tlnp | grep 3306', description: 'Verify port 3306 is bound and listening' },
      { command: 'mysql -u root -e "SHOW DATABASES;"', description: 'List all databases on this server' },
      { command: 'mysql -u root -e "SELECT user, host FROM mysql.user;"', description: 'List all database users and their allowed hosts' },
      { command: 'mysql -u root -e "SHOW GLOBAL STATUS LIKE \'Threads_connected\';"', description: 'Check the number of active connections' },
    ],
    ports: [
      { port: 3306, description: 'MySQL wire protocol (client connections)' },
      { port: 33060, description: 'MySQL X Protocol (document store API, MySQL 8+)' },
    ],
    tips: [
      'MySQL binds to 127.0.0.1 by default. To allow remote connections, edit mysqld.cnf and set bind-address = 0.0.0.0, then restart MySQL. Also ensure the user is created with \'%\' as host (not \'localhost\').',
      'innodb_buffer_pool_size is the single most important tuning parameter. Set it to 70-80% of available RAM on a dedicated MySQL server. It caches table data and indexes in memory.',
      'For replication, set server-id = 1 on the primary and server-id = 2 on the replica (must be unique). Enable binary logging: log_bin = mysql-bin. Then run CHANGE REPLICATION SOURCE on the replica.',
      'Use "EXPLAIN" before slow queries to see if MySQL is doing a full table scan (type: ALL) vs using an index (type: ref or range). Add indexes on columns used in WHERE, JOIN, and ORDER BY clauses.',
      'MySQL\'s default authentication plugin changed in MySQL 8 to caching_sha2_password. If older clients cannot connect, use: ALTER USER \'appuser\'@\'%\' IDENTIFIED WITH mysql_native_password BY \'secret\';',
      'For massive scale, look at Vitess (vitess.io) -- it is a database clustering system that shards MySQL horizontally. YouTube, Slack, Square, and GitHub all use Vitess.',
      'Always use InnoDB engine (the default since MySQL 5.5). MyISAM is legacy -- it lacks transactions, row-level locking, and crash recovery.',
      'Use SHOW ENGINE INNODB STATUS\\G for detailed information about locks, deadlocks, buffer pool stats, and I/O activity.',
    ],
    code_examples: [
      {
        title: 'Create Database + Tables',
        language: 'sql',
        code: `-- Connect: mysql -u root

-- Create a database
CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create an application user
CREATE USER 'appuser'@'%' IDENTIFIED BY 'secret123';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE myapp;

-- Create a users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Create an orders table with foreign key
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Insert sample data
INSERT INTO users (name, email, password_hash) VALUES
    ('Alice', 'alice@example.com', SHA2('password123', 256)),
    ('Bob', 'bob@example.com', SHA2('password456', 256));

INSERT INTO orders (user_id, product, amount, status) VALUES
    (1, 'Laptop', 999.99, 'completed'),
    (1, 'Mouse', 29.99, 'pending'),
    (2, 'Keyboard', 79.99, 'completed');

-- Query with JOIN
SELECT u.name, o.product, o.amount, o.status
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'completed';`,
        description: 'Complete MySQL database setup with proper character encoding, InnoDB engine, foreign keys, indexes, and sample data. Always use utf8mb4 for full Unicode support.',
      },
      {
        title: 'Replication Setup',
        language: 'bash',
        code: `#!/bin/bash
# MySQL Primary/Replica Replication Setup

# === ON THE PRIMARY (db-primary) ===

# 1. Edit MySQL config for replication
cat >> /etc/mysql/mysql.conf.d/mysqld.cnf << 'CONF'
server-id = 1
log_bin = mysql-bin
binlog_format = ROW
bind-address = 0.0.0.0
CONF

# 2. Restart MySQL
service mysql restart

# 3. Create a replication user
mysql -u root -e "
  CREATE USER 'replicator'@'%' IDENTIFIED BY 'repl_pass';
  GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
  FLUSH PRIVILEGES;
"

# 4. Get the binary log position (note File and Position values)
mysql -u root -e "SHOW MASTER STATUS;"
# +------------------+----------+
# | File             | Position |
# +------------------+----------+
# | mysql-bin.000001 |      157 |
# +------------------+----------+

# === ON THE REPLICA (db-replica) ===

# 5. Edit MySQL config
cat >> /etc/mysql/mysql.conf.d/mysqld.cnf << 'CONF'
server-id = 2
relay_log = relay-bin
read_only = 1
bind-address = 0.0.0.0
CONF

# 6. Restart MySQL
service mysql restart

# 7. Configure replication (use File and Position from step 4)
mysql -u root -e "
  CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='db-primary',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='repl_pass',
    SOURCE_LOG_FILE='mysql-bin.000001',
    SOURCE_LOG_POS=157;
  START REPLICA;
"

# 8. Verify replication is working
mysql -u root -e "SHOW REPLICA STATUS\\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind"
# Slave_IO_Running: Yes
# Slave_SQL_Running: Yes
# Seconds_Behind_Master: 0`,
        description: 'Sets up MySQL binary log replication. The replica reads binary log events from the primary and replays them. Monitor Seconds_Behind_Master to track replication lag.',
      },
      {
        title: 'Node.js Connection',
        language: 'javascript',
        code: `// npm install mysql2

const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: 'db-primary',        // DistSim hostname
  port: 3306,
  user: 'appuser',
  password: 'secret123',
  database: 'myapp',
  waitForConnections: true,
  connectionLimit: 20,         // Max connections in pool
  queueLimit: 0,
});

// INSERT a new user
async function createUser(name, email, password) {
  // Parameterized query prevents SQL injection
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, SHA2(?, 256))',
    [name, email, password]
  );
  return { id: result.insertId };
}

// SELECT users
async function getUsers() {
  const [rows] = await pool.execute('SELECT id, name, email, created_at FROM users');
  return rows;
}

// SELECT with filter
async function getUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

// Transaction: create order + update inventory
async function createOrder(userId, product, amount) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, product, amount) VALUES (?, ?, ?)',
      [userId, product, amount]
    );

    await connection.execute(
      'UPDATE inventory SET stock = stock - 1 WHERE product = ? AND stock > 0',
      [product]
    );

    await connection.commit();
    return { orderId: orderResult.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Usage
(async () => {
  const user = await createUser('Alice', 'alice@test.com', 'secret');
  console.log('Created user:', user);

  const users = await getUsers();
  console.log('All users:', users);
})();`,
        description: 'MySQL2 connection with promise-based API, connection pooling, parameterized queries, and transaction support. Always use ? placeholders for query parameters.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. RABBITMQ
  // ---------------------------------------------------------------------------
  rabbitmq: {
    title: 'RabbitMQ -- AMQP Message Broker (Smart Broker, Dumb Consumer)',
    description:
      'RabbitMQ is a message broker that implements the AMQP (Advanced Message Queuing Protocol) standard. Unlike Kafka where consumers pull messages from a log, RabbitMQ pushes messages to consumers and provides sophisticated routing through exchanges and bindings. Think of RabbitMQ as a post office: producers send messages to an exchange (the post office), the exchange routes messages to queues based on binding rules (routing addresses), and consumers pick up messages from their queue. Reddit uses RabbitMQ for asynchronous task processing. Bloomberg handles financial data distribution, and Robinhood processes trade orders through RabbitMQ. It excels at job queues (distribute work across workers), pub/sub (broadcast to all subscribers), RPC (request-reply patterns), and dead letter queues (capture failed messages for retry or investigation).',
    install: [
      'apt-get update && apt-get install -y rabbitmq-server',
      'service rabbitmq-server start',
      '# Enable the management UI (web dashboard):',
      'rabbitmq-plugins enable rabbitmq_management',
    ],
    config_files: [
      { path: '/etc/rabbitmq/rabbitmq.conf', description: 'Main config -- listeners, default_user, default_pass, disk_free_limit, vm_memory_high_watermark' },
      { path: '/etc/rabbitmq/enabled_plugins', description: 'List of enabled plugins (management UI, STOMP, MQTT, etc.)' },
      { path: '/var/log/rabbitmq/', description: 'Log directory -- connection events, channel errors, queue mirroring, memory alarms' },
    ],
    common_commands: [
      { command: 'service rabbitmq-server start', description: 'Start the RabbitMQ server' },
      { command: 'service rabbitmq-server stop', description: 'Stop the RabbitMQ server' },
      { command: 'rabbitmq-plugins enable rabbitmq_management', description: 'Enable the web management UI on port 15672 (login: guest/guest)' },
      { command: 'rabbitmqctl status', description: 'Show server status: Erlang version, uptime, memory, disk, listeners' },
      { command: 'rabbitmqctl list_queues name messages consumers', description: 'List all queues with message count and consumer count' },
      { command: 'rabbitmqctl list_exchanges name type', description: 'List all exchanges and their types (direct, fanout, topic, headers)' },
      { command: 'rabbitmqctl list_bindings', description: 'List all bindings between exchanges and queues' },
      { command: 'rabbitmqctl list_connections', description: 'List all active client connections' },
      { command: 'rabbitmqctl add_user appuser secret123', description: 'Create a new user' },
      { command: 'rabbitmqctl set_permissions -p / appuser ".*" ".*" ".*"', description: 'Grant the user full permissions on the default vhost' },
      { command: 'rabbitmqctl set_user_tags appuser administrator', description: 'Make the user an admin (can access management UI)' },
      { command: 'rabbitmqadmin publish exchange=amq.default routing_key=my_queue payload="Hello World"', description: 'Publish a test message to a queue via the default exchange' },
      { command: 'rabbitmqadmin get queue=my_queue count=1', description: 'Consume one message from a queue (for testing)' },
    ],
    test_commands: [
      { command: 'rabbitmqctl status | head -20', description: 'Verify RabbitMQ is running and show uptime' },
      { command: 'ss -tlnp | grep 5672', description: 'Verify AMQP port 5672 is listening' },
      { command: 'ss -tlnp | grep 15672', description: 'Verify management UI port 15672 is listening' },
      { command: 'curl -u guest:guest http://localhost:15672/api/overview', description: 'Test the management API -- returns cluster overview as JSON' },
      { command: 'rabbitmqctl list_queues', description: 'List queues to verify the broker is operational' },
    ],
    ports: [
      { port: 5672, description: 'AMQP protocol (client connections -- producers and consumers)' },
      { port: 15672, description: 'Management UI and HTTP API (login: guest/guest)' },
      { port: 25672, description: 'Erlang distribution (inter-node clustering communication)' },
      { port: 61613, description: 'STOMP protocol (if STOMP plugin enabled)' },
      { port: 1883, description: 'MQTT protocol (if MQTT plugin enabled)' },
    ],
    tips: [
      'RabbitMQ vs Kafka: RabbitMQ is best for job queues and task distribution (messages are consumed once and deleted). Kafka is best for event streaming and replay (messages persist on disk for days). Use RabbitMQ when you need smart routing, use Kafka when you need a durable event log.',
      'Exchange types control routing: "direct" routes by exact routing key match, "fanout" broadcasts to ALL bound queues (pub/sub), "topic" routes by wildcard pattern (orders.*, *.critical), "headers" routes by message header values.',
      'Always set a dead letter exchange (DLX) on your queues. When a message is rejected or expires, it goes to the DLX queue instead of being lost. Essential for debugging failed messages.',
      'Enable the management UI immediately -- it provides a visual overview of queues, exchanges, bindings, message rates, and connection status. Access it at http://localhost:15672 with guest/guest.',
      'The "guest" user can only connect from localhost by default. For remote connections, create a new user and set permissions.',
      'Set queue TTL (message time-to-live) and queue length limits to prevent unbounded growth. A queue with millions of messages will consume all available RAM and trigger the memory alarm.',
      'Use publisher confirms (confirm.select) for reliable publishing. Without confirms, if the broker crashes after receiving your message but before writing it to disk, the message is lost.',
      'Prefetch count (QoS) controls how many messages a consumer receives before acknowledging. Set it to 1 for fair dispatch (slow consumers get fewer messages). Default unlimited prefetch can overwhelm slow consumers.',
    ],
    code_examples: [
      {
        title: 'Queue Setup via CLI',
        language: 'bash',
        code: `# RabbitMQ queue operations using rabbitmqadmin and rabbitmqctl
# (rabbitmqadmin requires the management plugin to be enabled)

# Enable management plugin (if not already)
rabbitmq-plugins enable rabbitmq_management

# Declare a durable queue (survives broker restart)
rabbitmqadmin declare queue name=task_queue durable=true

# Declare a fanout exchange (broadcasts to all bound queues)
rabbitmqadmin declare exchange name=events type=fanout durable=true

# Bind the queue to the exchange
rabbitmqadmin declare binding source=events destination=task_queue

# Publish a message to the default exchange (direct to queue)
rabbitmqadmin publish exchange=amq.default routing_key=task_queue \
    payload='{"task":"send_email","to":"alice@test.com"}' \
    properties='{"delivery_mode":2}'  # delivery_mode=2 makes it persistent

# Publish to the fanout exchange (all bound queues receive it)
rabbitmqadmin publish exchange=events routing_key="" \
    payload='{"event":"user_created","user_id":42}'

# Consume (get) one message from the queue
rabbitmqadmin get queue=task_queue count=1

# List all queues with message counts
rabbitmqctl list_queues name messages consumers

# List all exchanges
rabbitmqctl list_exchanges name type

# List bindings (exchange -> queue connections)
rabbitmqctl list_bindings

# Purge all messages from a queue (careful!)
rabbitmqadmin purge queue name=task_queue`,
        description: 'Declare queues, exchanges, and bindings via the RabbitMQ CLI. Messages flow: Producer -> Exchange -> Binding -> Queue -> Consumer. The exchange type determines routing logic.',
      },
      {
        title: 'Node.js Producer/Consumer',
        language: 'javascript',
        code: `// npm install amqplib

const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672';  // DistSim hostname
const QUEUE_NAME = 'task_queue';

// === PRODUCER: Send tasks to the queue ===
async function producer() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Declare the queue (idempotent -- safe to call multiple times)
  // durable: true means the queue survives broker restart
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Send messages
  const tasks = [
    { task: 'send_email', to: 'alice@test.com' },
    { task: 'process_payment', order_id: 123, amount: 99.99 },
    { task: 'generate_report', type: 'monthly' },
  ];

  for (const task of tasks) {
    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(task)),
      { persistent: true }  // Message survives broker restart
    );
    console.log('Sent:', task.task);
  }

  // Close after a short delay to ensure messages are flushed
  setTimeout(() => connection.close(), 500);
}

// === CONSUMER: Process tasks from the queue ===
async function consumer() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Process one message at a time (fair dispatch)
  channel.prefetch(1);

  console.log('Waiting for tasks...');

  channel.consume(QUEUE_NAME, async (msg) => {
    const task = JSON.parse(msg.content.toString());
    console.log('Processing:', task.task);

    try {
      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Completed:', task.task);

      // Acknowledge: remove message from queue
      channel.ack(msg);
    } catch (err) {
      console.error('Failed:', task.task, err);
      // Reject and requeue for retry
      channel.nack(msg, false, true);
    }
  });
}

// Run producer or consumer based on command-line argument
if (process.argv[2] === 'produce') producer();
else consumer();`,
        description: 'Work queue pattern with amqplib. Producer sends persistent tasks to a durable queue. Consumer processes one at a time with manual acknowledgment. Failed tasks are requeued for retry.',
      },
      {
        title: 'Dead Letter Exchange',
        language: 'bash',
        code: `# Dead Letter Exchange (DLX) -- capture failed/expired messages
# When a message is rejected or expires, it goes to the DLX instead of being lost

# 1. Create the dead letter exchange and queue
rabbitmqadmin declare exchange name=dlx type=fanout durable=true
rabbitmqadmin declare queue name=dead_letter_queue durable=true
rabbitmqadmin declare binding source=dlx destination=dead_letter_queue

# 2. Create the main work queue with DLX configured
# Messages that are rejected or expire will go to the DLX
rabbitmqadmin declare queue name=work_queue durable=true \
    arguments='{"x-dead-letter-exchange":"dlx","x-message-ttl":60000}'
#   x-dead-letter-exchange: where failed messages go
#   x-message-ttl: messages expire after 60 seconds if not consumed

# 3. Publish a message to the work queue
rabbitmqadmin publish exchange=amq.default routing_key=work_queue \
    payload='{"task":"process_order","order_id":42}'

# 4. If the message is not consumed within 60 seconds, or if a consumer
#    rejects it (nack without requeue), it appears in dead_letter_queue

# 5. Check the dead letter queue for failed messages
rabbitmqadmin get queue=dead_letter_queue count=10

# 6. Monitor both queues
rabbitmqctl list_queues name messages consumers
# work_queue        0    1     (consumer is processing)
# dead_letter_queue 2    0     (2 failed messages waiting for investigation)`,
        description: 'DLX captures messages that fail processing or expire. Essential for debugging: instead of losing failed messages, they accumulate in a separate queue for investigation and retry.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. MEMCACHED
  // ---------------------------------------------------------------------------
  memcached: {
    title: 'Memcached -- High-Performance Distributed Memory Cache',
    description:
      'Memcached is a distributed in-memory key-value cache designed for simplicity and speed. It does one thing extremely well: cache data in RAM to reduce database load. Meta (Facebook) operates the largest Memcached deployment in the world, handling trillions of cache hits per day across thousands of servers to keep Facebook responsive. Wikipedia, YouTube, Twitter, and Reddit all use Memcached to cache database query results, rendered page fragments, and session data. Unlike Redis, Memcached is intentionally simple -- it has no data structures, no persistence, no replication, and no scripting. This simplicity is its strength: Memcached is multi-threaded (Redis is single-threaded) and can saturate network bandwidth on multi-core machines, making it faster than Redis for pure caching workloads. When a Memcached server restarts, all data is gone -- and that is by design.',
    install: [
      'apt-get update && apt-get install -y memcached libmemcached-tools',
      'memcached -d -m 64 -p 11211 -u memcache -l 0.0.0.0',
    ],
    config_files: [
      { path: '/etc/memcached.conf', description: 'Main config -- memory limit (-m), port (-p), listen address (-l), max connections (-c), threads (-t)' },
    ],
    common_commands: [
      { command: 'memcached -d -m 64 -p 11211 -u memcache -l 0.0.0.0', description: 'Start Memcached: daemon mode, 64MB RAM, listen on all interfaces' },
      { command: 'echo "set mykey 0 3600 5\\r\\nhello\\r" | nc localhost 11211', description: 'Store key "mykey" with value "hello", 3600s TTL, 5 bytes' },
      { command: 'echo "get mykey\\r" | nc localhost 11211', description: 'Retrieve the value for key "mykey"' },
      { command: 'echo "delete mykey\\r" | nc localhost 11211', description: 'Delete the key "mykey"' },
      { command: 'echo "incr counter 1\\r" | nc localhost 11211', description: 'Atomically increment a counter by 1 (key must exist as a numeric string)' },
      { command: 'echo "stats\\r" | nc localhost 11211', description: 'Show server statistics: uptime, memory usage, hit ratio, evictions' },
      { command: 'echo "stats slabs\\r" | nc localhost 11211', description: 'Show slab allocation stats -- how memory is divided across item size classes' },
      { command: 'echo "stats items\\r" | nc localhost 11211', description: 'Show item stats per slab -- number of items, age, evictions per class' },
      { command: 'echo "flush_all\\r" | nc localhost 11211', description: 'Invalidate ALL cached items (they become inaccessible but memory is not freed immediately)' },
      { command: 'memcstat --servers=localhost', description: 'Show formatted server statistics (requires libmemcached-tools)' },
    ],
    test_commands: [
      { command: 'ss -tlnp | grep 11211', description: 'Verify port 11211 is bound and listening' },
      { command: 'echo "stats\\r" | nc localhost 11211 | head -5', description: 'Verify the server is responding to stat requests' },
      { command: 'echo "set test_key 0 60 4\\r\\ntest\\r" | nc localhost 11211 && echo "get test_key\\r" | nc localhost 11211', description: 'Full round-trip: store and retrieve a test value' },
      { command: 'echo "version\\r" | nc localhost 11211', description: 'Check the Memcached version' },
    ],
    ports: [
      { port: 11211, description: 'Memcached protocol (TCP and UDP client connections)' },
    ],
    tips: [
      'Memcached vs Redis: Use Memcached when you need a pure cache (no persistence, no data structures) and want multi-threaded performance on multi-core machines. Use Redis when you need data structures (lists, sets, sorted sets), persistence, pub/sub, or Lua scripting.',
      'Always set the -m flag (memory limit in MB). Without it, Memcached uses 64MB by default. When memory is full, it evicts the least recently used (LRU) items to make room for new ones.',
      'Memcached uses slab allocation: items are grouped by size class. A 100-byte item goes into the 128-byte slab. This means some memory is wasted on padding, but allocation is O(1) and avoids fragmentation.',
      'There is NO persistence. When Memcached restarts, all data is gone. Design your application to handle cache misses gracefully -- always fall back to the database.',
      'Use consistent hashing in your client library to distribute keys across multiple Memcached servers. This minimizes cache invalidation when you add or remove servers.',
      'Monitor the "get_hits" vs "get_misses" ratio in stats output. A healthy cache should have a hit ratio above 90%. If misses are high, your TTLs might be too short or your cache is too small.',
      'The -l 0.0.0.0 flag makes Memcached listen on all interfaces. Without it, it only listens on localhost and other machines in your lab cannot connect.',
      'Memcached has NO authentication by default. In production, use SASL authentication or firewall rules to restrict access. In DistSim, this is fine for learning.',
    ],
    code_examples: [
      {
        title: 'Basic Operations',
        language: 'bash',
        code: `# Memcached operations using netcat (nc) or telnet
# Protocol format: command key flags exptime bytes\r\ndata\r\n

# SET a value: key="user:42", flags=0, TTL=3600s, 27 bytes of data
printf "set user:42 0 3600 27\r\n{\"name\":\"Alice\",\"age\":30}\r\n" | nc -q 1 memcached 11211
# Output: STORED

# GET a value
printf "get user:42\r\n" | nc -q 1 memcached 11211
# Output:
# VALUE user:42 0 27
# {"name":"Alice","age":30}
# END

# ADD a value (only if key does NOT exist)
printf "add user:43 0 3600 25\r\n{\"name\":\"Bob\",\"age\":25}\r\n" | nc -q 1 memcached 11211
# Output: STORED (if key was new) or NOT_STORED (if key exists)

# REPLACE a value (only if key EXISTS)
printf "replace user:42 0 3600 27\r\n{\"name\":\"Alice\",\"age\":31}\r\n" | nc -q 1 memcached 11211
# Output: STORED (if key exists) or NOT_STORED (if key missing)

# DELETE a key
printf "delete user:42\r\n" | nc -q 1 memcached 11211
# Output: DELETED

# INCREMENT a counter (key must exist with numeric value)
printf "set counter 0 0 1\r\n0\r\n" | nc -q 1 memcached 11211
printf "incr counter 1\r\n" | nc -q 1 memcached 11211
# Output: 1
printf "incr counter 5\r\n" | nc -q 1 memcached 11211
# Output: 6

# STATS: check server health
printf "stats\r\n" | nc -q 1 memcached 11211 | grep -E "cmd_get|cmd_set|get_hits|get_misses|bytes"

# FLUSH ALL: clear the entire cache
printf "flush_all\r\n" | nc -q 1 memcached 11211
# Output: OK`,
        description: 'Memcached uses a simple text protocol. Keys are strings (max 250 bytes), values are blobs (max 1MB). The flags field is user-defined metadata. TTL of 0 means never expire.',
      },
      {
        title: 'Node.js Connection',
        language: 'javascript',
        code: `// npm install memcached

const Memcached = require('memcached');

// Connect to Memcached server(s)
const memcached = new Memcached('memcached:11211', {
  retries: 3,
  timeout: 5000,
  poolSize: 10,
});

// Helper: promisify Memcached methods
function cacheGet(key) {
  return new Promise((resolve, reject) => {
    memcached.get(key, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function cacheSet(key, value, ttl) {
  return new Promise((resolve, reject) => {
    memcached.set(key, value, ttl, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function cacheDel(key) {
  return new Promise((resolve, reject) => {
    memcached.del(key, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

// Cache-aside pattern for database queries
async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;

  // 1. Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    console.log('Cache HIT for', cacheKey);
    return cached;  // Memcached auto-deserializes JSON
  }

  // 2. Cache miss -- query database
  console.log('Cache MISS for', cacheKey);
  const user = await queryDatabase(userId); // your DB call

  // 3. Store in cache for 5 minutes (300 seconds)
  await cacheSet(cacheKey, user, 300);

  return user;
}

// Usage
(async () => {
  // Store and retrieve a value
  await cacheSet('greeting', 'hello world', 60);
  const value = await cacheGet('greeting');
  console.log('Value:', value);  // "hello world"

  // Store a JSON object (auto-serialized)
  await cacheSet('user:1', { name: 'Alice', age: 30 }, 3600);
  const user = await cacheGet('user:1');
  console.log('User:', user);  // { name: 'Alice', age: 30 }

  // Delete a key
  await cacheDel('greeting');
})();`,
        description: 'Memcached client with cache-aside pattern. Unlike Redis, Memcached only stores key-value pairs (no data structures). It excels at pure caching with its multi-threaded architecture.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. HAPROXY
  // ---------------------------------------------------------------------------
  haproxy: {
    title: 'HAProxy -- The Fastest TCP/HTTP Load Balancer',
    description:
      'HAProxy (High Availability Proxy) is a free, open-source TCP/HTTP load balancer known for being the fastest and most reliable proxy in existence. It can handle over 200,000 HTTP requests per second on a single machine and millions of concurrent TCP connections. GitHub routes all git operations and web traffic through HAProxy. Reddit handles its entire traffic surge during AMAs through HAProxy. Stack Overflow, Tumblr, Airbnb, and Instagram all use HAProxy as their primary load balancer. HAProxy provides Layer 4 (TCP) and Layer 7 (HTTP) load balancing, SSL termination, health checking, sticky sessions, connection draining, ACL-based routing, and a real-time statistics dashboard. Compared to Nginx, HAProxy is purpose-built for load balancing and excels at pure proxying performance, while Nginx is a more general-purpose web server.',
    install: [
      'apt-get update && apt-get install -y haproxy',
      'haproxy -f /etc/haproxy/haproxy.cfg -D',
    ],
    config_files: [
      { path: '/etc/haproxy/haproxy.cfg', description: 'Main config -- global settings, defaults, frontend (listeners), backend (server pools), and listen (combined frontend+backend) sections' },
      { path: '/var/log/haproxy.log', description: 'Access log -- request logs, health check results, connection errors, backend selection' },
    ],
    common_commands: [
      { command: 'haproxy -f /etc/haproxy/haproxy.cfg -D', description: 'Start HAProxy as a daemon with the specified config file' },
      { command: 'haproxy -f /etc/haproxy/haproxy.cfg -c', description: 'Validate the config file for syntax errors without starting' },
      { command: 'haproxy -f /etc/haproxy/haproxy.cfg -D -sf $(cat /var/run/haproxy.pid)', description: 'Reload config with zero downtime -- starts new process, old one drains connections' },
      { command: 'kill -USR1 $(cat /var/run/haproxy.pid)', description: 'Graceful stop -- finish serving active connections, then exit' },
      { command: 'echo "show stat" | socat unix-connect:/var/run/haproxy.sock stdio', description: 'Show real-time statistics via the Unix socket (requires stats socket configured)' },
      { command: 'echo "show info" | socat unix-connect:/var/run/haproxy.sock stdio', description: 'Show process info: uptime, connection rate, memory usage, worker count' },
      { command: 'echo "disable server backend_app/app-server-1" | socat unix-connect:/var/run/haproxy.sock stdio', description: 'Take a backend server out of rotation (for maintenance) without restarting' },
      { command: 'echo "enable server backend_app/app-server-1" | socat unix-connect:/var/run/haproxy.sock stdio', description: 'Put a backend server back into rotation' },
      { command: 'echo "show servers state" | socat unix-connect:/var/run/haproxy.sock stdio', description: 'Show health status of all backend servers' },
      { command: 'cat /var/log/haproxy.log | tail -20', description: 'View recent HAProxy access/error logs' },
    ],
    test_commands: [
      { command: 'curl http://localhost:80', description: 'Test if HAProxy is serving on the frontend port' },
      { command: 'curl http://localhost:8404/stats', description: 'Access the stats dashboard (if stats frontend is configured on port 8404)' },
      { command: 'ss -tlnp | grep haproxy', description: 'Verify which ports HAProxy is listening on' },
      { command: 'haproxy -vv', description: 'Show HAProxy version and compile-time options' },
      { command: 'curl -w "\\nHTTP %{http_code} | Total: %{time_total}s\\n" http://localhost:80', description: 'Test with timing information to verify load balancing latency' },
    ],
    ports: [
      { port: 80, description: 'HTTP frontend (default, configurable)' },
      { port: 443, description: 'HTTPS frontend (when SSL termination is configured)' },
      { port: 8404, description: 'Stats dashboard (common convention, must be configured)' },
    ],
    tips: [
      'HAProxy vs Nginx: HAProxy is purpose-built for load balancing and can handle ~200K req/s in pure proxy mode. Nginx is a general-purpose web server that also does load balancing. Use HAProxy when load balancing is your primary need; use Nginx when you also need to serve static files or run as a web server.',
      'The config has 4 main sections: "global" (process-level settings), "defaults" (default values for frontends/backends), "frontend" (what ports to listen on and how to route), "backend" (which servers to forward to and how to balance).',
      'Always enable health checks on backends: "server app1 app-server-1:8080 check inter 5s fall 3 rise 2". This checks every 5 seconds, marks down after 3 failures, marks up after 2 successes.',
      'Enable the stats page for monitoring: add a "listen stats" section with "bind :8404", "stats enable", "stats uri /stats", "stats auth admin:password". This gives you a real-time dashboard.',
      'Load balancing algorithms: "roundrobin" (default, equal distribution), "leastconn" (fewest active connections -- best for long-lived connections), "source" (sticky by client IP), "uri" (same URI always goes to same server -- good for caching).',
      'Use ACLs for content-based routing: "acl is_api path_beg /api" then "use_backend api_servers if is_api". Route /api traffic to one backend and everything else to another.',
      'Connection draining: when you disable a server via the socket, HAProxy stops sending NEW connections but lets existing ones finish. This is how you do zero-downtime deployments.',
      'Set "option httpchk GET /health" in the backend section for HTTP health checks instead of TCP connect checks. This ensures the application is actually healthy, not just that the port is open.',
    ],
    code_examples: [
      {
        title: 'Load Balancer Config',
        language: 'ini',
        code: `# /etc/haproxy/haproxy.cfg
# Layer 7 HTTP load balancer with health checks

global
    maxconn 4096
    log stdout format raw local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    log global
    option httplog

# Frontend: where clients connect
frontend http_front
    bind *:80
    default_backend app_servers

    # Add useful headers for backend servers
    http-request set-header X-Forwarded-For %[src]
    http-request set-header X-Real-IP %[src]

# Backend: pool of application servers
backend app_servers
    balance roundrobin                          # Load balancing algorithm
    option httpchk GET /health                  # HTTP health check endpoint

    # Health check: every 5s, mark down after 3 failures, up after 2 successes
    server app1 app-server-1:8080 check inter 5s fall 3 rise 2
    server app2 app-server-2:8080 check inter 5s fall 3 rise 2
    server app3 app-server-3:8080 check inter 5s fall 3 rise 2 backup`,
        description: 'HTTP load balancer distributing traffic across app servers with active health checking. Failed servers are automatically removed from rotation and re-added when they recover.',
      },
      {
        title: 'Stats Page Config',
        language: 'ini',
        code: `# Add to /etc/haproxy/haproxy.cfg
# Real-time stats dashboard showing request rates, server health, and connection counts

# Stats page as a dedicated listener
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats                    # Access at http://haproxy:8404/stats
    stats refresh 5s                    # Auto-refresh every 5 seconds
    stats show-legends                  # Show column descriptions
    stats auth admin:password           # Basic auth (change in production)

    # Allow runtime commands via the stats socket
    stats admin if TRUE                 # Enable admin actions (drain, disable)

# Also add a Unix socket for CLI management
global
    stats socket /var/run/haproxy.sock mode 660 level admin
    stats timeout 30s

# Usage:
# - Browser: http://haproxy:8404/stats
# - CLI:     echo "show stat" | socat unix-connect:/var/run/haproxy.sock stdio
# - CLI:     echo "disable server app_servers/app1" | socat unix-connect:/var/run/haproxy.sock stdio`,
        description: 'The stats page is HAProxy\'s built-in monitoring dashboard. It shows per-server health, request rates, response times, error counts, and connection states in real-time.',
      },
      {
        title: 'ACL Routing',
        language: 'ini',
        code: `# /etc/haproxy/haproxy.cfg
# Route traffic to different backends based on URL path and headers

frontend http_front
    bind *:80
    mode http

    # ACL definitions: match request properties
    acl is_api path_beg /api           # URL starts with /api
    acl is_static path_end .css .js .png .jpg .svg
    acl is_websocket hdr(Upgrade) -i WebSocket
    acl is_admin path_beg /admin
    acl from_internal src 10.0.0.0/8   # Request from internal network

    # Route based on ACL matches (first match wins)
    use_backend ws_servers if is_websocket
    use_backend static_servers if is_static
    use_backend api_servers if is_api
    use_backend admin_servers if is_admin from_internal  # Both must match
    default_backend app_servers

# Different backends for different traffic types
backend api_servers
    balance leastconn                   # Least connections for API (variable response times)
    option httpchk GET /api/health
    server api1 api-server-1:8080 check
    server api2 api-server-2:8080 check

backend static_servers
    balance roundrobin
    server static1 static-server:80 check

backend ws_servers
    balance source                      # Sticky by IP for WebSocket persistence
    timeout server 86400s               # Long timeout for WebSocket
    server ws1 ws-server-1:8080 check
    server ws2 ws-server-2:8080 check

backend admin_servers
    server admin1 admin-server:8080

backend app_servers
    balance roundrobin
    server app1 app-server-1:8080 check
    server app2 app-server-2:8080 check`,
        description: 'Content-based routing using ACLs. Route API traffic, static files, WebSocket connections, and admin pages to different backend server pools based on URL path, headers, or source IP.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. MINIO
  // ---------------------------------------------------------------------------
  minio: {
    title: 'MinIO -- S3-Compatible Object Storage',
    description:
      'MinIO is a high-performance, S3-compatible object storage server. It implements the Amazon S3 API, which means any tool or SDK that works with AWS S3 also works with MinIO -- no code changes needed. This makes MinIO the standard choice for running S3-like storage on your own infrastructure (on-premises, in development, or in hybrid cloud setups). Companies use MinIO for storing files, backups, static assets (images, videos, CSS), data lake storage, machine learning datasets, and log archives. MinIO can run as a single server for development or as a distributed cluster with erasure coding for production-grade durability. It is one of the most popular projects on GitHub with a strong community and is used by companies needing local object storage without depending on AWS.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://dl.min.io/server/minio/release/linux-amd64/minio',
      'chmod +x minio',
      'MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=admin123 ./minio server /data --console-address ":9001" &',
    ],
    config_files: [
      { path: '/data/', description: 'Data directory -- where MinIO stores all objects (buckets are subdirectories)' },
    ],
    common_commands: [
      { command: 'MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=admin123 ./minio server /data --console-address ":9001" &', description: 'Start MinIO server with web console on port 9001' },
      { command: 'wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc', description: 'Download the MinIO client (mc) for command-line operations' },
      { command: './mc alias set local http://localhost:9000 admin admin123', description: 'Configure mc to connect to the local MinIO server' },
      { command: './mc mb local/my-bucket', description: 'Create a new bucket called "my-bucket"' },
      { command: './mc ls local/', description: 'List all buckets' },
      { command: './mc cp /tmp/myfile.txt local/my-bucket/', description: 'Upload a file to a bucket' },
      { command: './mc ls local/my-bucket/', description: 'List all objects in a bucket' },
      { command: './mc cat local/my-bucket/myfile.txt', description: 'Display the contents of an object (like cat for S3)' },
      { command: './mc cp local/my-bucket/myfile.txt /tmp/downloaded.txt', description: 'Download an object from a bucket to local filesystem' },
      { command: './mc rm local/my-bucket/myfile.txt', description: 'Delete an object from a bucket' },
      { command: './mc rb local/my-bucket --force', description: 'Delete a bucket and all its contents' },
      { command: './mc share download local/my-bucket/myfile.txt --expire 1h', description: 'Generate a pre-signed URL valid for 1 hour (share with anyone without credentials)' },
      { command: './mc du local/my-bucket/', description: 'Show disk usage for a bucket' },
      { command: './mc admin info local/', description: 'Show server info: version, uptime, storage usage, network' },
    ],
    test_commands: [
      { command: 'curl http://localhost:9000/minio/health/live', description: 'Liveness check -- returns 200 if the server is running' },
      { command: 'curl http://localhost:9000/minio/health/ready', description: 'Readiness check -- returns 200 if the server is ready to accept requests' },
      { command: 'ss -tlnp | grep 9000', description: 'Verify the S3 API port is listening' },
      { command: 'ss -tlnp | grep 9001', description: 'Verify the web console port is listening' },
    ],
    ports: [
      { port: 9000, description: 'S3 API endpoint (client connections, compatible with any S3 SDK)' },
      { port: 9001, description: 'Web console (browser-based management UI)' },
    ],
    tips: [
      'Any AWS S3 SDK or tool (aws-cli, boto3, aws-sdk-js) works with MinIO. Just change the endpoint URL from "s3.amazonaws.com" to "http://minio-server:9000" and provide MinIO credentials.',
      'The web console at port 9001 lets you browse buckets, upload files, manage users, and monitor server health -- use it for quick visual inspection.',
      'Use pre-signed URLs to share objects without giving out credentials. The URL is valid for a configurable duration and allows direct download.',
      'For production, run MinIO in distributed mode across multiple servers with erasure coding. This provides data redundancy -- you can lose up to half your servers and still recover all data.',
      'Set bucket policies for public access: ./mc anonymous set download local/my-bucket to make a bucket publicly readable (useful for static website assets).',
      'MinIO supports S3 event notifications -- trigger webhooks when objects are created, deleted, or accessed. Useful for building data pipelines.',
      'Environment variables MINIO_ROOT_USER and MINIO_ROOT_PASSWORD set the admin credentials. In production, use strong passwords and create additional users with limited permissions.',
      'Use ./mc mirror to sync a local directory to a bucket (or vice versa) -- like rsync for object storage.',
    ],
    code_examples: [
      {
        title: 'Bucket Operations',
        language: 'bash',
        code: `# MinIO CLI (mc) bucket and object operations

# Set up the mc alias to connect to the local MinIO server
./mc alias set local http://localhost:9000 admin admin123

# Create buckets
./mc mb local/uploads
./mc mb local/backups
./mc mb local/static-assets

# List all buckets
./mc ls local/

# Upload a single file
echo "Hello from DistSim!" > /tmp/test.txt
./mc cp /tmp/test.txt local/uploads/

# Upload multiple files
./mc cp /tmp/file1.txt /tmp/file2.txt local/uploads/

# Upload an entire directory (recursive)
./mc cp --recursive /tmp/data/ local/backups/data/

# List objects in a bucket
./mc ls local/uploads/

# Download an object
./mc cp local/uploads/test.txt /tmp/downloaded.txt

# View object contents without downloading
./mc cat local/uploads/test.txt

# Get object metadata (size, content-type, last modified)
./mc stat local/uploads/test.txt

# Show disk usage for a bucket
./mc du local/uploads/

# Copy between buckets
./mc cp local/uploads/test.txt local/backups/test-backup.txt

# Remove an object
./mc rm local/uploads/test.txt

# Remove a bucket and all contents
./mc rb local/uploads --force

# Mirror a local directory to a bucket (like rsync)
./mc mirror /tmp/data/ local/backups/data/`,
        description: 'The mc (MinIO Client) provides an S3-compatible CLI for managing buckets and objects. Works identically with AWS S3 -- just change the alias endpoint.',
      },
      {
        title: 'Pre-signed URL',
        language: 'bash',
        code: `# Generate pre-signed URLs for sharing objects without credentials
# Anyone with the URL can download/upload within the expiry period

# Share a download link valid for 1 hour
./mc share download local/uploads/report.pdf --expire 1h
# Output: URL: http://minio:9000/uploads/report.pdf?X-Amz-...&X-Amz-Expires=3600

# Share a download link valid for 7 days
./mc share download local/uploads/document.pdf --expire 168h

# Share an upload link (allows anyone to upload to this path)
./mc share upload local/uploads/ --expire 24h
# Output: curl command that anyone can use to upload

# Test the pre-signed URL with curl
curl -o /tmp/report.pdf "http://minio:9000/uploads/report.pdf?X-Amz-Algorithm=..."

# Make an entire bucket publicly readable (no pre-signed URL needed)
./mc anonymous set download local/static-assets
# Now anyone can access: http://minio:9000/static-assets/logo.png

# Remove public access
./mc anonymous set none local/static-assets`,
        description: 'Pre-signed URLs grant temporary access to private objects. Perfect for generating download links for users without exposing MinIO credentials to the frontend.',
      },
      {
        title: 'Node.js Upload',
        language: 'javascript',
        code: `// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

// MinIO is S3-compatible -- use the standard AWS SDK
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

// Configure S3 client to point at MinIO
const s3 = new S3Client({
  region: 'us-east-1',               // Required but unused for MinIO
  endpoint: 'http://minio:9000',      // DistSim MinIO hostname
  credentials: {
    accessKeyId: 'admin',
    secretAccessKey: 'admin123',
  },
  forcePathStyle: true,               // Required for MinIO (not virtual-hosted style)
});

// Upload a file
async function uploadFile(bucket, key, filePath) {
  const fileStream = fs.createReadStream(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: 'application/octet-stream',
  }));
  console.log(\`Uploaded \${key} to \${bucket}\`);
}

// Upload a string/buffer directly
async function uploadData(bucket, key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
  console.log(\`Uploaded JSON to \${bucket}/\${key}\`);
}

// List objects in a bucket
async function listObjects(bucket, prefix = '') {
  const response = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  }));
  return response.Contents || [];
}

// Generate a pre-signed download URL (valid for 1 hour)
async function getDownloadUrl(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

// Usage
(async () => {
  await uploadData('uploads', 'data/users.json', [
    { name: 'Alice', email: 'alice@test.com' },
  ]);

  const objects = await listObjects('uploads');
  console.log('Objects:', objects.map((o) => o.Key));

  const url = await getDownloadUrl('uploads', 'data/users.json');
  console.log('Download URL:', url);
})();`,
        description: 'Standard AWS S3 SDK works with MinIO by changing the endpoint URL. This means any code written for AWS S3 works locally with MinIO without modification.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 11. ETCD
  // ---------------------------------------------------------------------------
  etcd: {
    title: 'etcd -- Distributed Key-Value Store (The Brain of Kubernetes)',
    description:
      'etcd (pronounced "et-see-dee") is a strongly consistent, distributed key-value store that uses the Raft consensus algorithm to ensure all nodes in a cluster agree on the same data. It is most famously known as the storage backend for Kubernetes -- every single piece of cluster state (pods, services, deployments, secrets, config maps) lives in etcd. When you run "kubectl get pods", you are reading from etcd. When you create a deployment, the state is written to etcd. If etcd goes down, your entire Kubernetes cluster becomes read-only and no changes can be made. Beyond Kubernetes, etcd is used for service configuration, distributed locks, leader election, and as a coordination service for distributed systems. CoreOS (now part of Red Hat) created etcd specifically for reliable distributed configuration.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://github.com/etcd-io/etcd/releases/download/v3.5.11/etcd-v3.5.11-linux-amd64.tar.gz',
      'tar xzf etcd-v3.5.11-linux-amd64.tar.gz',
      'cd etcd-v3.5.11-linux-amd64',
      './etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://0.0.0.0:2379 &',
    ],
    config_files: [
      { path: '/etc/etcd/etcd.conf', description: 'Main config -- name, data-dir, listen-client-urls, listen-peer-urls, initial-cluster (for multi-node setup)' },
      { path: '/var/lib/etcd/', description: 'Data directory -- Raft WAL (write-ahead log) and snapshot files. This is your cluster state on disk.' },
    ],
    common_commands: [
      { command: './etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://0.0.0.0:2379 &', description: 'Start etcd listening on all interfaces for client connections' },
      { command: './etcdctl put /config/db-host "db-primary"', description: 'Store a key-value pair (set database host config)' },
      { command: './etcdctl get /config/db-host', description: 'Read a value by key' },
      { command: './etcdctl get /config/ --prefix', description: 'Read ALL keys with a given prefix (like ls for a directory)' },
      { command: './etcdctl del /config/db-host', description: 'Delete a key' },
      { command: './etcdctl watch /config/ --prefix', description: 'Watch for changes to any key under /config/ in real-time (blocks until a change occurs)' },
      { command: './etcdctl put /services/web/node-1 "alive" -- --lease=60', description: 'Store a key with a lease (auto-deletes after 60 seconds if not renewed -- useful for service registration)' },
      { command: './etcdctl lease grant 60', description: 'Create a 60-second lease (returns a lease ID to attach to keys)' },
      { command: './etcdctl member list', description: 'List all members of the etcd cluster' },
      { command: './etcdctl endpoint health', description: 'Check the health of the etcd endpoint' },
      { command: './etcdctl endpoint status --write-out=table', description: 'Show cluster status in table format: leader, Raft term, Raft index, DB size' },
      { command: './etcdctl snapshot save /tmp/etcd-backup.db', description: 'Take a snapshot backup of the entire database' },
      { command: './etcdctl snapshot restore /tmp/etcd-backup.db --data-dir /tmp/etcd-restored', description: 'Restore from a snapshot (creates a new data directory)' },
    ],
    test_commands: [
      { command: './etcdctl endpoint health', description: 'Verify etcd is healthy and accepting requests' },
      { command: 'ss -tlnp | grep 2379', description: 'Verify client port 2379 is listening' },
      { command: 'ss -tlnp | grep 2380', description: 'Verify peer port 2380 is listening (for cluster communication)' },
      { command: 'curl http://localhost:2379/health', description: 'HTTP health check endpoint' },
      { command: './etcdctl put test-key "test-value" && ./etcdctl get test-key', description: 'Full round-trip: write and read back a value' },
    ],
    ports: [
      { port: 2379, description: 'Client API (applications connect here to read/write keys)' },
      { port: 2380, description: 'Peer communication (etcd nodes talk to each other for Raft consensus)' },
    ],
    tips: [
      'etcd uses Raft consensus, which means a write is only committed when a majority of nodes acknowledge it. For a 3-node cluster, 2 must be alive. For 5 nodes, 3 must be alive. Always use odd numbers of nodes.',
      'The "watch" command is etcd\'s killer feature. Applications can watch a key prefix and get notified instantly when any key changes. This is how Kubernetes controllers work -- they watch etcd for changes to their resources.',
      'Leases enable service registration: a service writes a key with a 30-second lease and renews it every 10 seconds. If the service dies, the key auto-deletes after 30 seconds, and watchers are notified.',
      'etcd is designed for small amounts of critical data (configuration, coordination). The recommended max DB size is 8GB. Do NOT use etcd as a general-purpose database.',
      'Back up etcd regularly with "etcdctl snapshot save". In Kubernetes, losing etcd data means losing your entire cluster state. Automated backups are non-negotiable in production.',
      'Compaction: etcd keeps a history of all key revisions. Run "etcdctl compaction" periodically (or set --auto-compaction-retention) to reclaim disk space from old revisions.',
      'etcd performance is highly sensitive to disk latency. In production, always use SSD storage. Spinning disks cause Raft leader elections to timeout, leading to cluster instability.',
      'Use --listen-client-urls http://0.0.0.0:2379 to allow connections from other machines. Default localhost binding prevents remote access from other machines in your lab.',
    ],
    code_examples: [
      {
        title: 'KV Operations',
        language: 'bash',
        code: `# etcd key-value operations using etcdctl

# Store key-value pairs (configuration data)
./etcdctl put /config/db-host "db-primary"
./etcdctl put /config/db-port "5432"
./etcdctl put /config/db-name "myapp"
./etcdctl put /config/redis-host "redis"
./etcdctl put /config/redis-port "6379"
./etcdctl put /services/web/node-1 "10.0.0.10:8080"
./etcdctl put /services/web/node-2 "10.0.0.11:8080"
./etcdctl put /services/api/node-1 "10.0.0.20:8080"

# Read a single key
./etcdctl get /config/db-host
# Output:
# /config/db-host
# db-primary

# Read all keys under a prefix (like listing a directory)
./etcdctl get /config/ --prefix
# Output: all /config/* keys and values

# Read only the values (no keys)
./etcdctl get /config/ --prefix --print-value-only

# Read all registered service instances
./etcdctl get /services/ --prefix

# Watch for changes in real-time (blocks until a change occurs)
# Run this in one terminal:
./etcdctl watch /config/ --prefix
# In another terminal, change a value:
# ./etcdctl put /config/db-host "db-replica"
# The watch terminal immediately prints the change

# Delete a key
./etcdctl del /config/redis-port

# Delete all keys under a prefix
./etcdctl del /services/web/ --prefix

# Count keys under a prefix
./etcdctl get /config/ --prefix --count-only`,
        description: 'etcd organizes keys hierarchically using path-like prefixes. The watch command is the killer feature -- applications get notified instantly when configuration changes, enabling dynamic reconfiguration.',
      },
      {
        title: 'Distributed Lock',
        language: 'bash',
        code: `# Distributed lock using etcdctl lock
# Ensures only one process/service can hold the lock at a time

# Terminal 1: Acquire a lock named "deploy-lock"
# This blocks until the lock is acquired, then holds it until the command finishes
./etcdctl lock deploy-lock
# Output: deploy-lock/694d8102457a2501  (the lock key)
# The lock is held until you press Ctrl+C or the process exits

# Terminal 2: Try to acquire the same lock (this will BLOCK until Terminal 1 releases)
./etcdctl lock deploy-lock
# ... waiting for lock ...

# Use a lock to run a command exclusively
# Only one instance of this backup script runs at a time across all machines
./etcdctl lock backup-lock -- bash -c '
  echo "Starting exclusive backup at $(date)"
  pg_dump myapp > /tmp/backup.sql
  echo "Backup completed at $(date)"
'

# Lock with a timeout using a lease
# Create a 30-second lease
LEASE_ID=$(./etcdctl lease grant 30 | grep -oP 'ID is \K[0-9a-f]+')

# Acquire lock with the lease (auto-releases after 30 seconds if process dies)
./etcdctl lock --lease=$LEASE_ID deploy-lock

# Keep the lease alive (renew it) while doing work
./etcdctl lease keep-alive $LEASE_ID &
# ... do work ...
# When done, revoke the lease to release the lock immediately
./etcdctl lease revoke $LEASE_ID`,
        description: 'Distributed locks prevent race conditions when multiple services need exclusive access to a resource. The lease ensures the lock auto-releases if the holder crashes.',
      },
      {
        title: 'Leader Election',
        language: 'bash',
        code: `# Leader election using etcdctl elect
# Multiple instances compete to be leader; only one wins at a time

# Terminal 1: Campaign for leadership as "node-1"
./etcdctl elect scheduler-leader "node-1"
# Output: scheduler-leader/694d8102457a2507
# node-1
# (this node is now the leader)

# Terminal 2: Campaign for leadership as "node-2"
./etcdctl elect scheduler-leader "node-2"
# ... blocks waiting ... (node-2 is a follower)
# If node-1 crashes or disconnects, node-2 automatically becomes leader

# Use leader election to run a command only on the leader
./etcdctl elect scheduler-leader "node-1" -- bash -c '
  echo "I am the leader! Running scheduler..."
  while true; do
    echo "Scheduling tasks at $(date)"
    sleep 10
  done
'

# Check who the current leader is (from any node)
./etcdctl get scheduler-leader --prefix --print-value-only
# Output: node-1

# Practical pattern: service registration with TTL
# Each service instance registers itself with a lease
LEASE=$(./etcdctl lease grant 10 | grep -oP "ID is \K[0-9a-f]+")
./etcdctl put /services/web/node-1 "10.0.0.10:8080" --lease=$LEASE

# Keep renewing the lease while the service is alive
./etcdctl lease keep-alive $LEASE &

# If the service crashes, the key auto-deletes after 10 seconds
# Other services watching /services/web/ get notified`,
        description: 'Leader election ensures exactly one instance runs the leader workload. If the leader crashes, etcd automatically promotes a follower. Used in schedulers, cron runners, and singleton services.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 12. CONSUL
  // ---------------------------------------------------------------------------
  consul: {
    title: 'Consul -- Service Discovery, Health Checking & KV Store',
    description:
      'Consul by HashiCorp is a service mesh solution that combines service discovery, health checking, a key-value store, and multi-datacenter support into one tool. In a microservices architecture, services need to find each other dynamically -- the "payment" service needs to know the IP and port of the "database" service, and that information changes as services scale up, fail over, or redeploy. Consul solves this: each service registers itself with Consul and discovers other services via DNS or HTTP API. Consul continuously runs health checks and automatically removes unhealthy instances from discovery results. Companies running microservices at scale use Consul for service discovery, configuration management, and as the foundation for a service mesh with mutual TLS between services.',
    install: [
      'apt-get update && apt-get install -y wget unzip',
      'wget https://releases.hashicorp.com/consul/1.17.0/consul_1.17.0_linux_amd64.zip',
      'unzip consul_1.17.0_linux_amd64.zip && mv consul /usr/local/bin/',
      'consul agent -dev -client=0.0.0.0 -bind=0.0.0.0 &',
    ],
    config_files: [
      { path: '/etc/consul.d/', description: 'Config directory -- JSON or HCL files for agent config, service definitions, health checks' },
      { path: '/etc/consul.d/consul.hcl', description: 'Main agent config -- data_dir, client_addr, bind_addr, datacenter, server mode, bootstrap_expect' },
    ],
    common_commands: [
      { command: 'consul agent -dev -client=0.0.0.0 -bind=0.0.0.0 &', description: 'Start Consul in dev mode (single node, in-memory, no persistence) accessible from all machines' },
      { command: 'consul members', description: 'List all members of the Consul cluster with their status' },
      { command: 'consul catalog services', description: 'List all registered services' },
      { command: 'consul catalog nodes', description: 'List all registered nodes' },
      { command: 'consul services register -name=web -port=8080 -address=app-server', description: 'Register a service called "web" running on app-server:8080' },
      { command: 'consul catalog services -tags', description: 'List all services with their tags (used for filtering)' },
      { command: 'curl http://localhost:8500/v1/catalog/service/web', description: 'Query the HTTP API for all instances of the "web" service (returns JSON with IP, port, health)' },
      { command: 'dig @localhost -p 8600 web.service.consul SRV', description: 'Query Consul DNS for the "web" service (returns SRV records with host and port)' },
      { command: 'consul kv put config/db-host db-primary', description: 'Store a key-value pair in Consul\'s KV store' },
      { command: 'consul kv get config/db-host', description: 'Read a value from the KV store' },
      { command: 'consul kv get -recurse config/', description: 'List all keys under a prefix' },
      { command: 'consul kv delete config/db-host', description: 'Delete a key from the KV store' },
      { command: 'consul monitor', description: 'Stream Consul agent logs in real-time (useful for debugging)' },
    ],
    test_commands: [
      { command: 'consul members', description: 'Verify the Consul agent is running and show cluster membership' },
      { command: 'ss -tlnp | grep 8500', description: 'Verify the HTTP API port is listening' },
      { command: 'curl http://localhost:8500/v1/status/leader', description: 'Check who the current cluster leader is' },
      { command: 'curl http://localhost:8500/v1/agent/self', description: 'Get detailed info about the local Consul agent' },
      { command: 'consul kv put test-key test-value && consul kv get test-key', description: 'Full round-trip: write and read a KV pair' },
    ],
    ports: [
      { port: 8500, description: 'HTTP API and web UI (browse services, KV store, health checks)' },
      { port: 8600, description: 'DNS interface (resolve service names to IPs via DNS queries)' },
      { port: 8301, description: 'Serf LAN gossip (node-to-node communication within a datacenter)' },
      { port: 8302, description: 'Serf WAN gossip (cross-datacenter communication)' },
      { port: 8300, description: 'RPC (server-to-server Raft consensus and client forwarding)' },
    ],
    tips: [
      'Dev mode (-dev) is perfect for learning in DistSim. It runs a single-node cluster with no persistence. For production, run 3 or 5 server nodes with -server and -bootstrap-expect.',
      'Consul DNS is the simplest way to discover services: any application that can do DNS lookups can find services. Query "web.service.consul" to get the IPs of all healthy "web" instances.',
      'Health checks are automatic -- register a service with an HTTP check (e.g., GET /health every 10s) and Consul automatically removes unhealthy instances from DNS and API results.',
      'The web UI at http://localhost:8500/ui is excellent for visualizing services, nodes, health checks, and the KV store. Use it during development.',
      'Use -client=0.0.0.0 to make the HTTP API and DNS accessible from other machines. Without it, Consul only listens on localhost.',
      'Consul Connect (service mesh) provides automatic mutual TLS between services. Services communicate through sidecar proxies that encrypt traffic without application code changes.',
      'The KV store supports atomic CAS (Check-And-Set) operations for distributed locking and leader election. Use the "?cas=" query parameter with the current ModifyIndex.',
      'Consul watches let you run a script or handler whenever a service, key, or check changes. Similar to etcd watches but with richer trigger options.',
    ],
    code_examples: [
      {
        title: 'Service Registration',
        language: 'bash',
        code: `# Register a service with Consul via the HTTP API
# This tells Consul "I have a web service running on port 8080"

# Register a service with a health check
curl -X PUT http://localhost:8500/v1/agent/service/register -d '{
  "ID": "web-1",
  "Name": "web",
  "Tags": ["primary", "v1.2"],
  "Address": "app-server",
  "Port": 8080,
  "Check": {
    "HTTP": "http://app-server:8080/health",
    "Interval": "10s",
    "Timeout": "3s",
    "DeregisterCriticalServiceAfter": "30s"
  }
}'

# Register a second instance of the same service
curl -X PUT http://localhost:8500/v1/agent/service/register -d '{
  "ID": "web-2",
  "Name": "web",
  "Tags": ["secondary", "v1.2"],
  "Address": "app-server-2",
  "Port": 8080,
  "Check": {
    "HTTP": "http://app-server-2:8080/health",
    "Interval": "10s",
    "Timeout": "3s"
  }
}'

# List all registered services
consul catalog services

# Get all instances of the "web" service (with health info)
curl -s http://localhost:8500/v1/health/service/web?passing=true | python3 -m json.tool

# Deregister a service
curl -X PUT http://localhost:8500/v1/agent/service/deregister/web-1`,
        description: 'Services register themselves with Consul and include health check definitions. Consul continuously monitors health and only returns healthy instances in discovery queries.',
      },
      {
        title: 'DNS Discovery',
        language: 'bash',
        code: `# Discover services using DNS -- any application that does DNS lookups can find services
# Consul runs a DNS server on port 8600

# Look up all healthy instances of the "web" service
dig @localhost -p 8600 web.service.consul SRV
# Output: SRV records with hostname and port for each healthy instance
# web.service.consul.  0  IN  SRV  1 1 8080 app-server.node.dc1.consul.
# web.service.consul.  0  IN  SRV  1 1 8080 app-server-2.node.dc1.consul.

# Look up the IP address of the "web" service
dig @localhost -p 8600 web.service.consul A
# Output: A records with IP addresses

# Filter by tag (only instances tagged "primary")
dig @localhost -p 8600 primary.web.service.consul SRV

# Look up a specific node
dig @localhost -p 8600 app-server.node.consul A

# Use in application config (DNS-based discovery)
# Instead of hardcoding IPs, use Consul DNS:
curl http://web.service.consul:8080/api/users
# Consul resolves "web.service.consul" to a healthy instance

# Configure the system resolver to use Consul DNS
# Add to /etc/resolv.conf or use dnsmasq to forward .consul queries
# Example dnsmasq config:
# server=/consul/127.0.0.1#8600`,
        description: 'DNS-based discovery is the simplest integration path. Applications resolve service-name.service.consul and Consul returns only healthy instance IPs. No client library needed.',
      },
      {
        title: 'KV Store',
        language: 'bash',
        code: `# Consul KV store: distributed configuration management

# Store configuration values
consul kv put config/db/host "db-primary"
consul kv put config/db/port "5432"
consul kv put config/db/name "myapp"
consul kv put config/redis/host "redis"
consul kv put config/feature-flags/new-ui "true"
consul kv put config/feature-flags/dark-mode "false"

# Read a single value
consul kv get config/db/host
# Output: db-primary

# Read all keys under a prefix (recursive)
consul kv get -recurse config/db/
# Output:
# config/db/host:db-primary
# config/db/name:myapp
# config/db/port:5432

# Read with detailed metadata (ModifyIndex for CAS operations)
consul kv get -detailed config/db/host

# Update a value
consul kv put config/db/host "db-replica"

# Atomic CAS (Compare-And-Set) -- only update if the ModifyIndex matches
# This prevents race conditions when multiple services update the same key
consul kv put -cas -modify-index=42 config/db/host "db-new-primary"

# Delete a key
consul kv delete config/feature-flags/dark-mode

# Delete all keys under a prefix
consul kv delete -recurse config/feature-flags/

# Export KV data as JSON (for backup)
consul kv export config/ > /tmp/consul-backup.json

# Import KV data from JSON
consul kv import @/tmp/consul-backup.json`,
        description: 'Consul KV provides distributed configuration with atomic CAS operations. Store feature flags, database endpoints, and service configuration that all services can read dynamically.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 13. VAULT
  // ---------------------------------------------------------------------------
  vault: {
    title: 'Vault -- Secrets Management & Encryption as a Service',
    description:
      'HashiCorp Vault is a secrets management tool that securely stores and controls access to passwords, API keys, certificates, database credentials, and encryption keys. Instead of hardcoding secrets in config files or environment variables (where they get committed to git, logged in plaintext, or leaked in error messages), applications request secrets from Vault at runtime. Vault can also generate dynamic, short-lived credentials: instead of a permanent database password, Vault creates a unique username/password that expires after 1 hour, then automatically revokes it. Vault provides encryption as a service (Transit engine -- encrypt data without your application managing keys), PKI certificate generation, and SSH credential management. Companies managing secrets across multiple services, environments, and teams use Vault as the single source of truth for sensitive data.',
    install: [
      'apt-get update && apt-get install -y wget unzip',
      'wget https://releases.hashicorp.com/vault/1.15.4/vault_1.15.4_linux_amd64.zip',
      'unzip vault_1.15.4_linux_amd64.zip && mv vault /usr/local/bin/',
      '# Start in dev mode (in-memory, auto-unsealed, root token = "root"):',
      'vault server -dev -dev-root-token-id="root" -dev-listen-address="0.0.0.0:8200" &',
      'export VAULT_ADDR="http://127.0.0.1:8200"',
      'export VAULT_TOKEN="root"',
    ],
    config_files: [
      { path: '/etc/vault.d/vault.hcl', description: 'Main config -- listener (address, TLS), storage backend (file, consul, raft), API address, UI enable' },
    ],
    common_commands: [
      { command: 'export VAULT_ADDR="http://127.0.0.1:8200" && export VAULT_TOKEN="root"', description: 'Set environment variables to connect to Vault (required before all vault commands)' },
      { command: 'vault status', description: 'Check Vault seal status, cluster info, storage backend, and version' },
      { command: 'vault kv put secret/myapp db_host="db-primary" db_pass="supersecret" api_key="abc123"', description: 'Store multiple secrets at a path (secret/myapp)' },
      { command: 'vault kv get secret/myapp', description: 'Read all secrets at a path' },
      { command: 'vault kv get -field=db_pass secret/myapp', description: 'Read a single field from a secret path' },
      { command: 'vault kv put secret/myapp db_pass="newsecret"', description: 'Update a secret (creates a new version, old version is preserved)' },
      { command: 'vault kv metadata get secret/myapp', description: 'Show all versions, creation time, and deletion status for a secret path' },
      { command: 'vault kv delete secret/myapp', description: 'Soft-delete the latest version (can be undeleted)' },
      { command: 'vault kv destroy -versions=1 secret/myapp', description: 'Permanently destroy a specific version (cannot be recovered)' },
      { command: 'vault secrets enable transit', description: 'Enable the Transit engine for encryption as a service' },
      { command: 'vault write -f transit/keys/my-key', description: 'Create an encryption key named "my-key" in the Transit engine' },
      { command: 'vault write transit/encrypt/my-key plaintext=$(echo "sensitive data" | base64)', description: 'Encrypt data using the Transit engine (data never leaves Vault unencrypted)' },
      { command: 'vault token create -ttl=1h -policy=readonly', description: 'Create a short-lived token with limited permissions' },
      { command: 'vault secrets list', description: 'List all enabled secrets engines and their paths' },
    ],
    test_commands: [
      { command: 'vault status', description: 'Verify Vault is running, unsealed, and responding' },
      { command: 'ss -tlnp | grep 8200', description: 'Verify port 8200 is bound and listening' },
      { command: 'curl http://localhost:8200/v1/sys/health', description: 'HTTP health check -- returns seal status, cluster info as JSON' },
      { command: 'vault kv put secret/test hello="world" && vault kv get -field=hello secret/test', description: 'Full round-trip: store and retrieve a secret' },
    ],
    ports: [
      { port: 8200, description: 'Vault API and web UI (all client interactions go through this port)' },
      { port: 8201, description: 'Vault cluster communication (for HA/Raft cluster replication)' },
    ],
    tips: [
      'Dev mode (-dev) is perfect for learning: it runs in-memory, auto-unseals, and sets a predictable root token. In production, Vault starts sealed and requires manual unsealing with Shamir key shares.',
      'ALWAYS set VAULT_ADDR and VAULT_TOKEN environment variables before running vault commands. Without them, every command will fail with "connection refused" or "permission denied".',
      'The KV v2 engine (default in dev mode) versions secrets automatically. Every update creates a new version. You can read old versions, undelete soft-deletes, and set a max-versions limit.',
      'Dynamic secrets are Vault\'s most powerful feature: enable the database secrets engine, configure it with a root database connection, and Vault will generate unique, time-limited credentials for each application request. When the TTL expires, Vault revokes the credentials automatically.',
      'Use policies to control access: create a policy that allows read-only access to "secret/myapp/*" and attach it to a token or auth method. Never give applications the root token.',
      'The Transit engine lets you encrypt/decrypt data without managing encryption keys in your application. The keys never leave Vault. This is encryption as a service.',
      'Vault audit logging records every single request and response (with secrets redacted). Enable it with: vault audit enable file file_path=/var/log/vault-audit.log',
      'The web UI at http://localhost:8200/ui provides a visual interface for browsing secrets, managing policies, and checking auth methods. Login with the root token in dev mode.',
    ],
    code_examples: [
      {
        title: 'Store/Read Secrets',
        language: 'bash',
        code: `# HashiCorp Vault: store and retrieve secrets
# Prerequisite: export VAULT_ADDR="http://127.0.0.1:8200" && export VAULT_TOKEN="root"

# Store multiple secrets at a path
vault kv put secret/myapp \
    db_host="db-primary" \
    db_port="5432" \
    db_user="appuser" \
    db_pass="supersecret123" \
    api_key="sk-abc123def456" \
    jwt_secret="my-jwt-signing-key"

# Read all secrets at a path
vault kv get secret/myapp
# Output: table with all key-value pairs

# Read a specific field (useful in scripts)
vault kv get -field=db_pass secret/myapp
# Output: supersecret123

# Read as JSON (for parsing in applications)
vault kv get -format=json secret/myapp | python3 -m json.tool

# Update a secret (creates a new version, old version preserved)
vault kv put secret/myapp db_pass="new-password-789"

# Read a previous version
vault kv get -version=1 secret/myapp

# List all secrets at a path
vault kv list secret/

# Soft-delete (can be undeleted)
vault kv delete secret/myapp

# Undelete
vault kv undelete -versions=2 secret/myapp

# Permanently destroy a specific version
vault kv destroy -versions=1 secret/myapp

# Store environment-specific secrets
vault kv put secret/myapp/production db_host="prod-db.internal" db_pass="prod-secret"
vault kv put secret/myapp/staging db_host="staging-db.internal" db_pass="staging-secret"`,
        description: 'KV v2 secrets engine with automatic versioning. Every update creates a new version. You can read old versions, soft-delete, and permanently destroy specific versions.',
      },
      {
        title: 'Dynamic DB Credentials',
        language: 'bash',
        code: `# Vault Dynamic Secrets: generate unique, short-lived database credentials
# Each application gets its own username/password that auto-expires

# Prerequisite: export VAULT_ADDR and VAULT_TOKEN

# 1. Enable the database secrets engine
vault secrets enable database

# 2. Configure Vault with the PostgreSQL connection
vault write database/config/myapp-db \
    plugin_name=postgresql-database-plugin \
    allowed_roles="app-role" \
    connection_url="postgresql://{{username}}:{{password}}@db-primary:5432/myapp?sslmode=disable" \
    username="vault_admin" \
    password="vault_admin_pass"

# 3. Create a role that defines what credentials look like
vault write database/roles/app-role \
    db_name=myapp-db \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# 4. Request dynamic credentials (each call creates a UNIQUE user)
vault read database/creds/app-role
# Output:
# Key             Value
# lease_id        database/creds/app-role/abc123
# lease_duration  1h
# username        v-token-app-role-abc123def
# password        A1B2-c3d4-E5F6-g7h8

# 5. Use the credentials in your application
# After 1 hour, Vault automatically revokes the user from PostgreSQL

# 6. Renew the lease if you need more time
vault lease renew database/creds/app-role/abc123

# 7. Manually revoke credentials when done
vault lease revoke database/creds/app-role/abc123`,
        description: 'Dynamic secrets are Vault\'s most powerful feature. Each application request gets unique, time-limited credentials. When the TTL expires, Vault automatically revokes them from the database.',
      },
      {
        title: 'Transit Encryption',
        language: 'bash',
        code: `# Vault Transit: Encryption as a Service
# Encrypt/decrypt data without managing encryption keys in your application
# Keys NEVER leave Vault

# Prerequisite: export VAULT_ADDR and VAULT_TOKEN

# 1. Enable the Transit secrets engine
vault secrets enable transit

# 2. Create a named encryption key
vault write -f transit/keys/my-app-key

# 3. Encrypt data (must be base64-encoded)
# Encrypt a credit card number
vault write transit/encrypt/my-app-key \
    plaintext=$(echo -n "4111-1111-1111-1111" | base64)
# Output:
# ciphertext  vault:v1:AbCdEfGhIjKlMnOpQrStUvWxYz123456789=

# 4. Decrypt the ciphertext
vault write transit/decrypt/my-app-key \
    ciphertext="vault:v1:AbCdEfGhIjKlMnOpQrStUvWxYz123456789="
# Output:
# plaintext  NDExMS0xMTExLTExMTEtMTExMQ==

# 5. Decode the base64 result
echo "NDExMS0xMTExLTExMTEtMTExMQ==" | base64 -d
# Output: 4111-1111-1111-1111

# 6. Rotate the encryption key (old data can still be decrypted)
vault write -f transit/keys/my-app-key/rotate

# 7. Re-encrypt old data with the new key version
vault write transit/rewrap/my-app-key \
    ciphertext="vault:v1:AbCdEfGhIjKlMnOpQrStUvWxYz123456789="
# Output: vault:v2:NewCiphertextWithLatestKey...

# 8. Generate random bytes (for tokens, nonces, etc.)
vault write -f transit/random/32 format=base64
# Output: 32 random bytes, base64-encoded`,
        description: 'Transit engine encrypts data without your application managing keys. Store the ciphertext in your database instead of plaintext. Key rotation does not require re-encrypting existing data.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 14. NATS
  // ---------------------------------------------------------------------------
  nats: {
    title: 'NATS -- Lightweight, High-Performance Message Broker',
    description:
      'NATS is an extremely lightweight, high-performance messaging system designed for cloud-native applications, IoT, and microservices. While Kafka focuses on persistent event streaming and RabbitMQ on sophisticated routing, NATS prioritizes simplicity and speed -- it can handle millions of messages per second with sub-millisecond latency in a single binary with zero configuration. NATS supports three messaging patterns: publish/subscribe (broadcast to all subscribers), request/reply (synchronous RPC over messaging), and queue groups (load-balanced message distribution). NATS JetStream adds persistence, exactly-once delivery, and message replay for workloads that need durability. Companies building real-time systems (IoT platforms, edge computing, gaming backends, financial tickers) choose NATS for its minimal overhead and operational simplicity compared to Kafka and RabbitMQ.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.tar.gz',
      'tar xzf nats-server-v2.10.7-linux-amd64.tar.gz',
      'cd nats-server-v2.10.7-linux-amd64',
      './nats-server -a 0.0.0.0 &',
      '# Install the NATS CLI tool:',
      'wget https://github.com/nats-io/natscli/releases/download/v0.1.1/nats-0.1.1-linux-amd64.zip',
      'unzip nats-0.1.1-linux-amd64.zip && mv nats /usr/local/bin/',
    ],
    config_files: [
      { path: '/etc/nats/nats.conf', description: 'Server config -- listen, max_payload, max_connections, jetstream (persistence), cluster (multi-node), authorization' },
    ],
    common_commands: [
      { command: './nats-server -a 0.0.0.0 &', description: 'Start the NATS server listening on all interfaces' },
      { command: './nats-server -a 0.0.0.0 -js &', description: 'Start NATS with JetStream enabled (adds persistence and exactly-once delivery)' },
      { command: 'nats pub orders "order_placed:user123"', description: 'Publish a message to the "orders" subject' },
      { command: 'nats sub orders', description: 'Subscribe to the "orders" subject (receives all messages in real-time)' },
      { command: 'nats sub orders --queue payment-workers', description: 'Subscribe as a queue group member -- NATS distributes messages across group members (load balancing)' },
      { command: 'nats request api.users.get "user_id=42"', description: 'Send a request and wait for a reply (request/reply pattern for RPC)' },
      { command: 'nats reply api.users.get "user data here"', description: 'Set up a replier for the request/reply pattern' },
      { command: 'nats stream add ORDERS --subjects="orders.>" --retention=limits --max-msgs=10000', description: 'Create a JetStream stream for durable message storage (requires -js flag on server)' },
      { command: 'nats consumer add ORDERS my-consumer --pull --deliver=all', description: 'Create a pull consumer for the ORDERS stream' },
      { command: 'nats server info', description: 'Show server version, uptime, connections, routes, and JetStream status' },
      { command: 'nats account info', description: 'Show account limits: max connections, max data, JetStream usage' },
    ],
    test_commands: [
      { command: 'ss -tlnp | grep 4222', description: 'Verify the NATS client port is listening' },
      { command: 'nats server ping', description: 'Ping the NATS server to verify connectivity' },
      { command: 'nats server check connection', description: 'Check if the server accepts connections and basic pub/sub works' },
      { command: 'curl http://localhost:8222/varz', description: 'HTTP monitoring endpoint -- server stats as JSON (if monitoring enabled with -m 8222)' },
    ],
    ports: [
      { port: 4222, description: 'NATS client connections (publishers and subscribers)' },
      { port: 6222, description: 'NATS cluster routing (server-to-server in a cluster)' },
      { port: 8222, description: 'HTTP monitoring (server stats, connections, routes -- if enabled with -m flag)' },
    ],
    tips: [
      'NATS vs Kafka vs RabbitMQ: NATS is for real-time, fire-and-forget messaging with minimal overhead. Kafka is for durable event streaming with replay. RabbitMQ is for smart routing with exchanges and queues. Pick based on your durability and routing needs.',
      'NATS core (without JetStream) is "at most once" delivery -- if no subscriber is listening when a message is published, the message is lost. Enable JetStream (-js flag) when you need persistence and guaranteed delivery.',
      'Queue groups are the simplest way to load-balance work: multiple subscribers with the same queue group name share messages -- each message goes to exactly one member of the group.',
      'Subject hierarchy uses dots as delimiters: "orders.us.created", "orders.eu.shipped". Use ">" for multi-level wildcard (orders.>) and "*" for single-level wildcard (orders.*.created).',
      'NATS server is a single ~20MB binary with zero dependencies. It starts in under a second and uses minimal memory. This makes it ideal for edge deployments and resource-constrained environments.',
      'Request/reply pattern replaces traditional REST for inter-service communication: the requesting service publishes to a subject and waits for a reply. NATS handles the reply routing automatically via ephemeral inbox subjects.',
      'JetStream provides exactly-once semantics via message deduplication (Nats-Msg-Id header), consumer acknowledgments, and redelivery on failure. It is NATS\'s answer to Kafka-style persistence.',
      'Monitor NATS with the HTTP endpoint at port 8222: /varz for server stats, /connz for connections, /subz for subscriptions, /routez for cluster routes. Enable with -m 8222 flag.',
    ],
    code_examples: [
      {
        title: 'Pub/Sub',
        language: 'bash',
        code: `# NATS Pub/Sub: real-time messaging
# Open TWO terminals for this example

# === TERMINAL 1: Subscribe to a subject ===
nats sub "orders.>"
# Subscribes to all subjects starting with "orders."
# Wildcard ">" matches any number of tokens: orders.created, orders.us.shipped, etc.
# Output: Listening on "orders.>"

# === TERMINAL 2: Publish messages ===
nats pub orders.created '{"user_id":42,"product":"laptop","amount":999}'
# Terminal 1 receives: [orders.created] {"user_id":42,"product":"laptop","amount":999}

nats pub orders.shipped '{"order_id":1,"tracking":"ABC123"}'
# Terminal 1 receives: [orders.shipped] {"order_id":1,"tracking":"ABC123"}

nats pub orders.us.created '{"user_id":43,"region":"us"}'
# Terminal 1 receives: [orders.us.created] {"user_id":43,"region":"us"}

# Subscribe with a queue group (load-balanced across group members)
# Run this in 3 terminals -- each message goes to only ONE subscriber
nats sub orders.created --queue payment-workers

# Subscribe with single-level wildcard
nats sub "orders.*.created"
# Matches: orders.us.created, orders.eu.created
# Does NOT match: orders.created, orders.us.west.created`,
        description: 'NATS pub/sub with subject hierarchy. Use "." as delimiter, "*" for single-level wildcard, ">" for multi-level. Queue groups distribute messages for load balancing.',
      },
      {
        title: 'Request/Reply',
        language: 'bash',
        code: `# NATS Request/Reply: synchronous RPC over messaging
# Replaces HTTP for inter-service communication

# === TERMINAL 1: Set up a replier (the "server") ===
# Listens on "api.users.get" and sends back a response
nats reply "api.users.get" '{"id":42,"name":"Alice","email":"alice@test.com"}'
# Output: Listening on "api.users.get" in group "NATS-RPLY-22"

# === TERMINAL 2: Send a request (the "client") ===
nats request "api.users.get" '{"user_id":42}'
# Output:
# Published "api.users.get" with reply "_INBOX.abc123"
# Received: {"id":42,"name":"Alice","email":"alice@test.com"}

# Request with timeout (fails fast if no replier is available)
nats request "api.users.get" '{"user_id":42}' --timeout 5s

# Multiple repliers with queue groups (load-balanced)
# Terminal A: nats reply "api.users.get" --queue user-service '{"from":"A"}'
# Terminal B: nats reply "api.users.get" --queue user-service '{"from":"B"}'
# Requests are distributed across A and B

# Service pattern: different endpoints on different subjects
# nats reply "api.users.get"    --queue user-svc  <response>
# nats reply "api.users.create" --queue user-svc  <response>
# nats reply "api.orders.get"   --queue order-svc <response>`,
        description: 'Request/reply replaces traditional HTTP REST calls between services. NATS handles routing via ephemeral inbox subjects. Faster than HTTP with built-in load balancing via queue groups.',
      },
      {
        title: 'Node.js Client',
        language: 'javascript',
        code: `// npm install nats

const { connect, StringCodec } = require('nats');

const sc = StringCodec();

async function main() {
  // Connect to NATS server
  const nc = await connect({ servers: 'nats://nats:4222' });
  console.log('Connected to NATS');

  // === Pub/Sub ===
  // Subscribe to order events
  const sub = nc.subscribe('orders.>');
  (async () => {
    for await (const msg of sub) {
      const data = JSON.parse(sc.decode(msg.data));
      console.log(\`[\${msg.subject}] Received:\`, data);
    }
  })();

  // Publish an event
  nc.publish('orders.created', sc.encode(JSON.stringify({
    user_id: 42,
    product: 'laptop',
    amount: 999,
    timestamp: new Date().toISOString(),
  })));

  // === Request/Reply (RPC) ===
  // Set up a replier for user lookups
  const replySub = nc.subscribe('api.users.get', { queue: 'user-service' });
  (async () => {
    for await (const msg of replySub) {
      const request = JSON.parse(sc.decode(msg.data));
      console.log('Received request:', request);

      // Send the reply
      const response = { id: request.user_id, name: 'Alice', email: 'alice@test.com' };
      msg.respond(sc.encode(JSON.stringify(response)));
    }
  })();

  // Send a request and wait for reply
  const reply = await nc.request(
    'api.users.get',
    sc.encode(JSON.stringify({ user_id: 42 })),
    { timeout: 5000 }  // 5 second timeout
  );
  const user = JSON.parse(sc.decode(reply.data));
  console.log('Got user:', user);

  // === Queue Group (load-balanced subscription) ===
  const queueSub = nc.subscribe('tasks.process', { queue: 'workers' });
  (async () => {
    for await (const msg of queueSub) {
      const task = JSON.parse(sc.decode(msg.data));
      console.log('Processing task:', task);
    }
  })();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await nc.drain();  // Finish processing in-flight messages
    process.exit(0);
  });
}

main().catch(console.error);`,
        description: 'NATS Node.js client with pub/sub, request/reply RPC, and queue group load balancing. Use drain() for graceful shutdown to finish processing in-flight messages.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 15. ELASTICSEARCH
  // ---------------------------------------------------------------------------
  elasticsearch: {
    title: 'Elasticsearch -- Distributed Search & Analytics Engine',
    description:
      'Elasticsearch is a distributed, RESTful search and analytics engine built on Apache Lucene. It indexes documents (JSON) and provides near-real-time full-text search, structured queries, aggregations, and analytics across massive datasets. Netflix ingests over 1TB of logs per day into Elasticsearch for troubleshooting and operational intelligence. LinkedIn uses it for search across profiles, jobs, and content. Uber indexes trip data, Shopify powers product search, and Wikipedia uses it for its search bar. Elasticsearch is the "E" in the ELK Stack (Elasticsearch + Logstash + Kibana), the most popular open-source log aggregation and analysis platform. Common use cases include application log aggregation (find errors across 100 services), full-text product search (e-commerce), security analytics (SIEM), and business intelligence dashboards.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-linux-x86_64.tar.gz',
      'tar xzf elasticsearch-8.11.0-linux-x86_64.tar.gz',
      'cd elasticsearch-8.11.0',
      '# Disable security for learning (not for production):',
      'echo "xpack.security.enabled: false" >> config/elasticsearch.yml',
      'echo "network.host: 0.0.0.0" >> config/elasticsearch.yml',
      'echo "discovery.type: single-node" >> config/elasticsearch.yml',
      'bin/elasticsearch -d',
    ],
    config_files: [
      { path: '/home/distsim/elasticsearch/config/elasticsearch.yml', description: 'Main config -- cluster.name, node.name, network.host, discovery.type, path.data, xpack.security.enabled' },
      { path: '/home/distsim/elasticsearch/config/jvm.options', description: 'JVM heap settings -- Xms and Xmx (set both to 50% of available RAM, max 32GB)' },
      { path: '/home/distsim/elasticsearch/config/log4j2.properties', description: 'Logging config -- log levels, file rotation, slow query log threshold' },
    ],
    common_commands: [
      { command: 'curl -X PUT http://localhost:9200/products', description: 'Create an index called "products" (like creating a database table)' },
      { command: 'curl -X POST http://localhost:9200/products/_doc -H "Content-Type: application/json" -d \'{"name":"Laptop","price":999,"category":"electronics","description":"High performance laptop with 16GB RAM"}\'', description: 'Index (store) a document in the products index' },
      { command: 'curl http://localhost:9200/products/_search?q=laptop', description: 'Simple search: find documents containing "laptop"' },
      { command: 'curl -X POST http://localhost:9200/products/_search -H "Content-Type: application/json" -d \'{"query":{"match":{"description":"high performance"}}}\'', description: 'Full-text search with relevance scoring using the match query' },
      { command: 'curl -X POST http://localhost:9200/products/_search -H "Content-Type: application/json" -d \'{"query":{"range":{"price":{"gte":500,"lte":1500}}}}\'', description: 'Range query: find products between $500 and $1500' },
      { command: 'curl -X POST http://localhost:9200/products/_search -H "Content-Type: application/json" -d \'{"aggs":{"avg_price":{"avg":{"field":"price"}},"by_category":{"terms":{"field":"category.keyword"}}}}\'', description: 'Aggregation: calculate average price and count by category' },
      { command: 'curl http://localhost:9200/_cat/indices?v', description: 'List all indices with document count, storage size, and health status' },
      { command: 'curl http://localhost:9200/_cat/health?v', description: 'Show cluster health: green (all good), yellow (replicas missing), red (primary shards missing)' },
      { command: 'curl http://localhost:9200/_cat/nodes?v', description: 'List all nodes in the cluster with CPU, memory, and disk usage' },
      { command: 'curl -X DELETE http://localhost:9200/products', description: 'Delete an index and all its documents (irreversible)' },
      { command: 'curl http://localhost:9200/products/_count', description: 'Count total documents in the products index' },
      { command: 'curl http://localhost:9200/products/_mapping', description: 'Show the field mapping (schema) for the products index' },
    ],
    test_commands: [
      { command: 'curl http://localhost:9200', description: 'Verify Elasticsearch is running -- returns cluster name, version, and tagline' },
      { command: 'ss -tlnp | grep 9200', description: 'Verify the HTTP API port is listening' },
      { command: 'curl http://localhost:9200/_cat/health?v', description: 'Check cluster health status (green/yellow/red)' },
      { command: 'curl http://localhost:9200/_cluster/stats?pretty | head -20', description: 'Show cluster-wide statistics' },
    ],
    ports: [
      { port: 9200, description: 'HTTP REST API (client connections, search queries, indexing)' },
      { port: 9300, description: 'Transport protocol (node-to-node cluster communication)' },
    ],
    tips: [
      'Elasticsearch is NOT a primary database. It is a search engine built for querying, not for ACID transactions. Always keep your source of truth in PostgreSQL/MySQL and index data into Elasticsearch for search.',
      'Set heap size (Xms and Xmx in jvm.options) to 50% of available RAM, but never more than 32GB. Above 32GB, Java loses compressed object pointers and performance drops dramatically.',
      'Index mappings are like schemas -- they define field types. Elasticsearch auto-detects types, but for production, define explicit mappings. A string can be "text" (full-text searchable) or "keyword" (exact match, aggregatable).',
      'Use _bulk API for indexing large amounts of data. Single-document indexing is 10-100x slower than bulk indexing. Batch 1000-5000 documents per request.',
      'Cluster health "yellow" means all primary shards are assigned but some replicas are not (often because you only have one node). "Red" means some primary shards are unassigned -- data is potentially unavailable.',
      'For log aggregation (ELK Stack), use Logstash or Filebeat to ship logs from your services to Elasticsearch, then visualize with Kibana on port 5601.',
      'Set "discovery.type: single-node" for development. Without it, Elasticsearch tries to form a cluster and may hang waiting for other nodes.',
      'Use "network.host: 0.0.0.0" to allow connections from other machines. Default is localhost only. Also set "xpack.security.enabled: false" for learning (enables security-free access).',
    ],
    code_examples: [
      {
        title: 'Index + Search',
        language: 'bash',
        code: `# Elasticsearch: index documents and search them

# Create an index with explicit field mappings
curl -X PUT "http://localhost:9200/products" -H "Content-Type: application/json" -d '{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "in_stock": { "type": "boolean" },
      "created_at": { "type": "date" }
    }
  }
}'

# Index (store) documents
curl -X POST "http://localhost:9200/products/_doc" -H "Content-Type: application/json" -d '{
  "name": "Laptop Pro 16",
  "description": "High performance laptop with 32GB RAM and M3 chip",
  "category": "electronics",
  "price": 1999.99,
  "in_stock": true,
  "created_at": "2024-01-15"
}'

curl -X POST "http://localhost:9200/products/_doc" -H "Content-Type: application/json" -d '{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse with USB-C charging",
  "category": "electronics",
  "price": 49.99,
  "in_stock": true,
  "created_at": "2024-01-16"
}'

curl -X POST "http://localhost:9200/products/_doc" -H "Content-Type: application/json" -d '{
  "name": "Python Programming",
  "description": "Learn Python programming from beginner to advanced",
  "category": "books",
  "price": 39.99,
  "in_stock": false,
  "created_at": "2024-01-10"
}'

# Simple search: find products matching "laptop"
curl "http://localhost:9200/products/_search?q=laptop&pretty"

# Structured search with filters
curl -X POST "http://localhost:9200/products/_search?pretty" -H "Content-Type: application/json" -d '{
  "query": {
    "bool": {
      "must": { "match": { "description": "high performance" } },
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 100, "lte": 2000 } } },
        { "term": { "in_stock": true } }
      ]
    }
  }
}'`,
        description: 'Create an index with typed mappings, index documents, and search using both simple and structured queries. The bool query combines full-text search (must) with exact filters (filter).',
      },
      {
        title: 'Full-Text Search with Highlights',
        language: 'bash',
        code: `# Full-text search with highlighting and relevance scoring

# Search with highlighted matches
curl -X POST "http://localhost:9200/products/_search?pretty" -H "Content-Type: application/json" -d '{
  "query": {
    "multi_match": {
      "query": "high performance laptop",
      "fields": ["name^3", "description"],
      "fuzziness": "AUTO"
    }
  },
  "highlight": {
    "fields": {
      "name": {},
      "description": {}
    },
    "pre_tags": ["<em>"],
    "post_tags": ["</em>"]
  },
  "sort": [
    { "_score": "desc" },
    { "price": "asc" }
  ],
  "from": 0,
  "size": 10
}'
# Output includes:
#   "highlight": { "description": ["<em>High</em> <em>performance</em> <em>laptop</em>..."] }
# The ^3 on "name" boosts name matches 3x in relevance scoring
# "fuzziness": "AUTO" handles typos (e.g., "laptp" still matches "laptop")

# Aggregation: average price and count by category
curl -X POST "http://localhost:9200/products/_search?pretty" -H "Content-Type: application/json" -d '{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category" },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } },
        "price_range": { "stats": { "field": "price" } }
      }
    }
  }
}'`,
        description: 'Multi-field search with relevance boosting, fuzzy matching for typo tolerance, highlighted results, and nested aggregations for analytics. The core of any search feature.',
      },
      {
        title: 'Log Aggregation Config',
        language: 'yaml',
        code: `# Logstash pipeline config: /etc/logstash/conf.d/app-logs.conf
# Collects logs from services, parses them, and sends to Elasticsearch

input {
  # Read logs from files
  file {
    path => "/var/log/app/*.log"
    start_position => "beginning"
    sincedb_path => "/var/lib/logstash/sincedb"
    codec => "json"
  }

  # Accept logs via TCP (services send logs here)
  tcp {
    port => 5044
    codec => json_lines
  }

  # Accept logs from Filebeat
  beats {
    port => 5045
  }
}

filter {
  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss" ]
    target => "@timestamp"
  }

  # Add geographic info from IP address
  if [client_ip] {
    geoip {
      source => "client_ip"
    }
  }

  # Parse log level and add severity
  if [level] {
    mutate {
      uppercase => [ "level" ]
    }
  }

  # Extract fields from message using grok pattern
  if [message] =~ "HTTP" {
    grok {
      match => {
        "message" => "%{IPORHOST:client_ip} - %{DATA:user} \\[%{HTTPDATE:timestamp}\\] \"%{WORD:method} %{DATA:request} HTTP/%{NUMBER:http_version}\" %{NUMBER:response_code} %{NUMBER:bytes}"
      }
    }
  }
}

output {
  # Send to Elasticsearch
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"    # Daily index rotation
  }

  # Also output to stdout for debugging
  # stdout { codec => rubydebug }
}`,
        description: 'Logstash pipeline that collects logs from files and TCP, parses them with filters (date, grok, geoip), and ships to Elasticsearch with daily index rotation. The "L" in the ELK stack.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 16. PROMETHEUS
  // ---------------------------------------------------------------------------
  prometheus: {
    title: 'Prometheus -- Metrics Collection, Time-Series DB & Alerting',
    description:
      'Prometheus is an open-source monitoring system and time-series database that scrapes metrics from your services at regular intervals (default: every 15 seconds) and stores them with timestamps. It was built at SoundCloud, inspired by Google\'s Borgmon, and is now the de facto standard for monitoring in the Kubernetes ecosystem -- over 80% of Kubernetes deployments use Prometheus. Your services expose a /metrics HTTP endpoint in a specific text format, and Prometheus pulls (scrapes) those metrics. You then query the data using PromQL (Prometheus Query Language) to answer questions like "what is the request rate?", "what is the 99th percentile latency?", "how many errors in the last 5 minutes?". Prometheus includes a built-in alerting engine (Alertmanager) that sends notifications via email, Slack, or PagerDuty when thresholds are breached.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz',
      'tar xzf prometheus-2.48.0.linux-amd64.tar.gz',
      'cd prometheus-2.48.0.linux-amd64',
      './prometheus --config.file=prometheus.yml --web.listen-address=0.0.0.0:9090 &',
    ],
    config_files: [
      { path: '/etc/prometheus/prometheus.yml', description: 'Main config -- global scrape interval, scrape_configs (target endpoints to scrape), alerting rules, remote_write' },
      { path: '/etc/prometheus/alert.rules.yml', description: 'Alerting rules -- define conditions that trigger alerts (e.g., error rate > 5% for 5 minutes)' },
    ],
    common_commands: [
      { command: './prometheus --config.file=prometheus.yml --web.listen-address=0.0.0.0:9090 &', description: 'Start Prometheus with config file, listening on all interfaces' },
      { command: 'curl http://localhost:9090/-/healthy', description: 'Health check -- returns 200 if Prometheus is running' },
      { command: 'curl http://localhost:9090/api/v1/targets', description: 'List all scrape targets and their status (up/down, last scrape time, errors)' },
      { command: 'curl "http://localhost:9090/api/v1/query?query=up"', description: 'PromQL: check which targets are up (1) or down (0)' },
      { command: 'curl "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])"', description: 'PromQL: calculate the per-second request rate over the last 5 minutes' },
      { command: 'curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[5m]))"', description: 'PromQL: calculate the 99th percentile (p99) request latency' },
      { command: 'curl "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total{status=~\\"5..\\"}[5m]))/sum(rate(http_requests_total[5m]))"', description: 'PromQL: calculate the error rate (5xx responses / total responses)' },
      { command: 'curl "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes"', description: 'PromQL: check memory usage of scraped services' },
      { command: 'curl http://localhost:9090/api/v1/label/__name__/values | python3 -m json.tool | head -30', description: 'List all available metric names in the database' },
      { command: 'kill -SIGHUP $(pidof prometheus)', description: 'Reload the config file without restarting (picks up new scrape targets and alert rules)' },
    ],
    test_commands: [
      { command: 'curl http://localhost:9090/-/healthy', description: 'Verify Prometheus is running and healthy' },
      { command: 'ss -tlnp | grep 9090', description: 'Verify port 9090 is bound and listening' },
      { command: 'curl http://localhost:9090/api/v1/targets | python3 -m json.tool | head -20', description: 'Check that scrape targets are configured and being scraped' },
      { command: 'curl http://localhost:9090/metrics | head -20', description: 'Prometheus scrapes itself -- check its own /metrics endpoint' },
    ],
    ports: [
      { port: 9090, description: 'Prometheus web UI, API, and PromQL query endpoint' },
    ],
    tips: [
      'Your services MUST expose a /metrics endpoint in Prometheus text format. Most languages have libraries: prometheus_client (Python), promhttp (Go), prom-client (Node.js). Without /metrics, Prometheus has nothing to scrape.',
      'The RED method for monitoring services: Rate (requests per second), Errors (failed requests per second), Duration (latency distribution). These three metrics answer "is my service healthy?".',
      'The USE method for monitoring infrastructure: Utilization (how busy), Saturation (how overloaded), Errors (how broken). Apply to CPU, memory, disk, and network.',
      'PromQL rate() only works on counter metrics (values that only go up). Use irate() for volatile, fine-grained instant rates. Use increase() for the total increase over a time window.',
      'Add your services to scrape_configs in prometheus.yml: scrape_configs: [{job_name: "my-app", static_configs: [{targets: ["app-server:8080"]}]}]. Then reload with SIGHUP.',
      'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) is the standard p99 latency query. It requires your service to expose a histogram metric (not a summary).',
      'Prometheus stores data locally on disk. Default retention is 15 days. For long-term storage, use remote_write to send data to Thanos, Cortex, or Mimir.',
      'Open http://localhost:9090 in a browser for the built-in query UI. Type a metric name and click Execute. The Graph tab visualizes results over time.',
    ],
    code_examples: [
      {
        title: 'Scrape Config',
        language: 'yaml',
        code: `# prometheus.yml -- Prometheus configuration file
# Defines what to scrape and how often

global:
  scrape_interval: 15s        # How often to scrape targets (default)
  evaluation_interval: 15s    # How often to evaluate alerting rules
  scrape_timeout: 10s         # Timeout per scrape request

# Alertmanager configuration (for sending alerts)
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Load alerting rules from files
rule_files:
  - "alert.rules.yml"

# Scrape configurations -- what endpoints to pull metrics from
scrape_configs:
  # Prometheus scrapes itself
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Your Go/Node.js/Python application servers
  - job_name: "app-servers"
    scrape_interval: 10s       # Override global interval for this job
    static_configs:
      - targets:
          - "app-server-1:8080"
          - "app-server-2:8080"
        labels:
          environment: "lab"
          team: "backend"

  # Nginx (requires nginx_exporter or stub_status module)
  - job_name: "nginx"
    static_configs:
      - targets: ["nginx-lb:9113"]

  # PostgreSQL (requires postgres_exporter)
  - job_name: "postgresql"
    static_configs:
      - targets: ["db-primary:9187"]

  # Redis (requires redis_exporter)
  - job_name: "redis"
    static_configs:
      - targets: ["redis:9121"]

  # Node exporter (system-level CPU, memory, disk metrics)
  - job_name: "node"
    static_configs:
      - targets:
          - "app-server-1:9100"
          - "app-server-2:9100"
          - "db-primary:9100"`,
        description: 'Prometheus configuration with multiple scrape targets. Each job defines a group of targets exposing /metrics endpoints. Prometheus pulls metrics at the configured interval.',
      },
      {
        title: 'PromQL Queries',
        language: 'bash',
        code: `# PromQL: Prometheus Query Language examples
# Run these in the Prometheus UI (http://localhost:9090) or via API

# === REQUEST RATE ===
# Requests per second over the last 5 minutes
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=rate(http_requests_total[5m])'

# Requests per second by status code
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=sum(rate(http_requests_total[5m])) by (status_code)'

# === ERROR RATE ===
# Percentage of 5xx errors over total requests
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100'

# === LATENCY (P99, P95, P50) ===
# 99th percentile latency (requires histogram metric)
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'

# 95th percentile
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'

# === RESOURCE USAGE ===
# Memory usage in MB
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=process_resident_memory_bytes / 1024 / 1024'

# CPU usage percentage (per instance)
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=rate(process_cpu_seconds_total[5m]) * 100'

# === CHECK TARGETS ===
# Which targets are up (1) or down (0)
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=up'

# === TOP 5 most frequent endpoints ===
curl 'http://localhost:9090/api/v1/query' --data-urlencode \
  'query=topk(5, sum(rate(http_requests_total[5m])) by (handler))'`,
        description: 'Essential PromQL queries for the RED method (Rate, Errors, Duration). These are the queries you will use most often in Grafana dashboards and alerting rules.',
      },
      {
        title: 'Alert Rules',
        language: 'yaml',
        code: `# alert.rules.yml -- Prometheus alerting rules
# Place in the same directory as prometheus.yml

groups:
  - name: service-alerts
    rules:
      # Alert: High error rate (more than 5% of requests are 5xx)
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.05
        for: 5m                     # Must be true for 5 minutes before firing
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # Alert: High latency (p99 > 1 second)
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High p99 latency"
          description: "P99 latency is {{ $value | humanizeDuration }}"

      # Alert: Service is down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.job }} target {{ $labels.instance }} has been down for more than 1 minute"

      # Alert: High memory usage (> 80%)
      - alert: HighMemoryUsage
        expr: |
          process_resident_memory_bytes / 1024 / 1024 > 512
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanize }}MB"`,
        description: 'Alerting rules define conditions that trigger notifications. The "for" duration prevents flapping (brief spikes do not trigger). Annotations provide human-readable context in alert messages.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 17. GRAFANA
  // ---------------------------------------------------------------------------
  grafana: {
    title: 'Grafana -- Visualization Dashboards for Metrics, Logs & Traces',
    description:
      'Grafana is the most popular open-source visualization and dashboarding platform for monitoring data. It connects to dozens of data sources (Prometheus, Elasticsearch, PostgreSQL, MySQL, InfluxDB, Loki, Jaeger, and more) and renders real-time dashboards with charts, graphs, gauges, tables, and heatmaps. Nearly every company that uses Prometheus uses Grafana to visualize the data -- they are the iconic monitoring pair. Grafana lets you build dashboards that answer critical questions at a glance: "what is the current request rate?", "is the error rate spiking?", "what is the p99 latency?", "which nodes are running hot?". You can set up alerts directly in Grafana, share dashboards with your team, and import thousands of pre-built community dashboards from grafana.com/dashboards.',
    install: [
      'apt-get update && apt-get install -y wget adduser libfontconfig1',
      'wget https://dl.grafana.com/oss/release/grafana_10.2.0_amd64.deb',
      'dpkg -i grafana_10.2.0_amd64.deb',
      'service grafana-server start',
    ],
    config_files: [
      { path: '/etc/grafana/grafana.ini', description: 'Main config -- HTTP port, admin password, auth settings, SMTP for alerts, database, log level' },
      { path: '/etc/grafana/provisioning/datasources/', description: 'Datasource provisioning -- YAML files to auto-configure data sources (Prometheus, Elasticsearch, etc.) on startup' },
      { path: '/etc/grafana/provisioning/dashboards/', description: 'Dashboard provisioning -- YAML files to auto-load dashboard JSON files on startup' },
      { path: '/var/log/grafana/grafana.log', description: 'Application log -- login events, datasource errors, rendering issues, alert notifications' },
    ],
    common_commands: [
      { command: 'service grafana-server start', description: 'Start the Grafana server' },
      { command: 'service grafana-server stop', description: 'Stop the Grafana server' },
      { command: 'service grafana-server status', description: 'Check if Grafana is running' },
      { command: 'curl -X POST http://admin:admin@localhost:3000/api/datasources -H "Content-Type: application/json" -d \'{"name":"Prometheus","type":"prometheus","url":"http://prometheus-server:9090","access":"proxy","isDefault":true}\'', description: 'Add Prometheus as a data source via API (replace prometheus-server with the actual hostname)' },
      { command: 'curl http://admin:admin@localhost:3000/api/datasources', description: 'List all configured data sources' },
      { command: 'curl http://admin:admin@localhost:3000/api/search', description: 'List all dashboards' },
      { command: 'curl http://admin:admin@localhost:3000/api/health', description: 'Health check -- returns version and database status' },
      { command: 'grafana-cli plugins install grafana-piechart-panel', description: 'Install a community plugin (pie chart panel in this example)' },
      { command: 'grafana-cli admin reset-admin-password newpassword', description: 'Reset the admin password from the CLI' },
      { command: 'curl -X POST http://admin:admin@localhost:3000/api/dashboards/db -H "Content-Type: application/json" -d \'{"dashboard":{"title":"My Dashboard","panels":[]},"overwrite":false}\'', description: 'Create an empty dashboard via API' },
    ],
    test_commands: [
      { command: 'curl http://localhost:3000/api/health', description: 'Verify Grafana is running and the database is connected' },
      { command: 'ss -tlnp | grep 3000', description: 'Verify port 3000 is bound and listening' },
      { command: 'curl -u admin:admin http://localhost:3000/api/datasources', description: 'Verify data sources are configured' },
      { command: 'curl http://localhost:3000/login', description: 'Verify the web UI is accessible' },
    ],
    ports: [
      { port: 3000, description: 'Grafana web UI and API (default login: admin / admin)' },
    ],
    tips: [
      'Default login is admin/admin. You will be prompted to change the password on first login. For DistSim labs, you can keep admin/admin.',
      'To add Prometheus as a data source: login to the web UI -> Configuration (gear icon) -> Data Sources -> Add data source -> Prometheus -> URL: http://prometheus-server:9090 -> Save & Test.',
      'Essential dashboard panels for any service: (1) Request Rate: rate(http_requests_total[5m]), (2) Error Rate: sum(rate(http_requests_total{status=~"5.."}[5m])), (3) p99 Latency: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])).',
      'Import pre-built dashboards from grafana.com/dashboards. Popular ones: Node Exporter Full (ID: 1860), Redis (ID: 763), PostgreSQL (ID: 9628), Nginx (ID: 12708).',
      'Use dashboard variables (Settings -> Variables) to make dashboards dynamic. Add a variable like $instance that queries Prometheus for label values, then use it in panel queries: rate(http_requests_total{instance="$instance"}[5m]).',
      'Grafana can alert directly: set up an alert rule on any panel with a condition (e.g., "error rate > 5% for 5 minutes") and a notification channel (Slack, email, webhook).',
      'Dashboard JSON can be exported (Share -> Export) and imported. Store dashboard JSON in git for version control. Use provisioning to auto-load dashboards on Grafana startup.',
      'Use the Explore page (compass icon) for ad-hoc queries without creating a dashboard. Great for debugging and one-off investigations.',
    ],
    code_examples: [
      {
        title: 'Datasource Provisioning',
        language: 'yaml',
        code: `# /etc/grafana/provisioning/datasources/prometheus.yml
# Auto-configures Prometheus as a data source on Grafana startup
# No manual setup needed -- Grafana reads this file on boot

apiVersion: 1

datasources:
  # Prometheus for metrics
  - name: Prometheus
    type: prometheus
    access: proxy                     # Grafana proxies requests to Prometheus
    url: http://prometheus-server:9090
    isDefault: true                   # Default datasource for new panels
    editable: true
    jsonData:
      timeInterval: "15s"             # Matches Prometheus scrape interval
      httpMethod: POST                # Use POST for large queries

  # Elasticsearch for logs (if using ELK stack)
  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "app-logs-*"            # Index pattern to query
    jsonData:
      timeField: "@timestamp"
      esVersion: "8.0.0"
      logMessageField: "message"
      logLevelField: "level"

  # Jaeger for traces (if using distributed tracing)
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686`,
        description: 'Datasource provisioning auto-configures connections on startup. Store this YAML in git and deploy it with Grafana -- no manual clicking needed. Supports Prometheus, Elasticsearch, Jaeger, and 50+ other sources.',
      },
      {
        title: 'Dashboard JSON',
        language: 'json',
        code: `{
  "dashboard": {
    "title": "Service Overview",
    "tags": ["generated", "distsim"],
    "timezone": "browser",
    "refresh": "10s",
    "time": { "from": "now-1h", "to": "now" },
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (instance)",
            "legendFormat": "{{instance}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "color": { "mode": "palette-classic" }
          }
        }
      },
      {
        "title": "Error Rate (%)",
        "type": "stat",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~'5..'}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "yellow" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "P99 Latency",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.5, "color": "yellow" },
                { "value": 1, "color": "red" }
              ]
            }
          }
        }
      }
    ]
  },
  "overwrite": true
}`,
        description: 'Dashboard JSON with three essential panels: request rate time series, error rate stat, and P99 latency gauge. Import via the Grafana API or UI (Dashboards -> Import -> Paste JSON).',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 18. JAEGER
  // ---------------------------------------------------------------------------
  jaeger: {
    title: 'Jaeger -- Distributed Tracing (Follow Requests Across Services)',
    description:
      'Jaeger (pronounced "YAY-ger", German for "hunter") is a distributed tracing system built by Uber Technologies to monitor and troubleshoot microservice architectures. When a single user request flows through 5, 10, or 20 services (API gateway -> auth -> user-service -> payment -> inventory -> notification), Jaeger records the entire journey as a "trace" -- showing exactly which services were called, in what order, how long each one took, and where failures occurred. Each trace is made up of "spans" (one per service hop), and spans can be nested to show parent-child relationships. Uber handles over 4,000 microservices, and Jaeger is how they debug "why is this checkout request slow?" by pinpointing the exact service causing the bottleneck. Jaeger is part of the Cloud Native Computing Foundation (CNCF) and is the most popular open-source distributed tracing backend alongside Zipkin.',
    install: [
      'apt-get update && apt-get install -y wget',
      'wget https://github.com/jaegertracing/jaeger/releases/download/v1.51.0/jaeger-1.51.0-linux-amd64.tar.gz',
      'tar xzf jaeger-1.51.0-linux-amd64.tar.gz',
      'cd jaeger-1.51.0-linux-amd64',
      './jaeger-all-in-one --collector.otlp.enabled &',
    ],
    config_files: [
      { path: 'N/A (command-line flags)', description: 'Jaeger all-in-one is configured via CLI flags. Key flags: --collector.otlp.enabled (accept OpenTelemetry), --memory.max-traces (limit in-memory storage)' },
    ],
    common_commands: [
      { command: './jaeger-all-in-one --collector.otlp.enabled &', description: 'Start Jaeger all-in-one (collector + query + UI) with OpenTelemetry support' },
      { command: 'curl http://localhost:16686/', description: 'Open the Jaeger UI in a browser to search and view traces' },
      { command: 'curl http://localhost:16686/api/services', description: 'List all services that have reported traces' },
      { command: 'curl "http://localhost:16686/api/traces?service=my-app&limit=10"', description: 'Query the 10 most recent traces for the "my-app" service' },
      { command: 'curl "http://localhost:16686/api/traces?service=my-app&tags=http.status_code%3D500&limit=10"', description: 'Find traces with errors (HTTP 500 status code)' },
      { command: 'curl http://localhost:14269/metrics', description: 'Prometheus metrics endpoint for monitoring Jaeger itself' },
      { command: 'curl http://localhost:16686/api/dependencies?endTs=$(date +%s)000', description: 'Get the service dependency graph (which services call which)' },
      { command: 'curl http://localhost:14269/', description: 'Admin endpoint for Jaeger health and readiness' },
    ],
    test_commands: [
      { command: 'curl http://localhost:16686/', description: 'Verify the Jaeger UI is accessible' },
      { command: 'ss -tlnp | grep 16686', description: 'Verify the UI port is listening' },
      { command: 'ss -tlnp | grep 4317', description: 'Verify the OpenTelemetry gRPC port is listening' },
      { command: 'ss -tlnp | grep 14268', description: 'Verify the Jaeger collector HTTP port is listening' },
      { command: 'curl http://localhost:14269/', description: 'Check Jaeger admin/health endpoint' },
    ],
    ports: [
      { port: 16686, description: 'Jaeger web UI (search traces, view service dependencies, analyze latency)' },
      { port: 14268, description: 'Jaeger collector HTTP (receives traces in Jaeger format)' },
      { port: 4317, description: 'OpenTelemetry gRPC (recommended way to send traces from your services)' },
      { port: 4318, description: 'OpenTelemetry HTTP (alternative to gRPC for sending traces)' },
      { port: 14269, description: 'Admin/health endpoint and Prometheus metrics for monitoring Jaeger' },
    ],
    tips: [
      'Your services must be instrumented with OpenTelemetry SDK to send traces to Jaeger. Libraries: opentelemetry-sdk (Python), go.opentelemetry.io/otel (Go), @opentelemetry/sdk-trace-node (Node.js).',
      'The critical concept is "context propagation": when Service A calls Service B, it must pass the trace ID in HTTP headers (traceparent header in W3C format). Without this, Jaeger sees isolated spans instead of connected traces.',
      'Use the Jaeger UI to debug latency: find a slow trace, expand it, and look at the timeline. The longest span is your bottleneck. Common culprits: database queries, external API calls, serialization.',
      'The dependency graph (System Architecture tab in the UI) shows which services call which -- automatically derived from trace data. This is invaluable for understanding microservice architecture.',
      'jaeger-all-in-one stores traces in memory by default. Traces are lost on restart. For persistence, configure Elasticsearch or Cassandra as the storage backend.',
      'Tag your spans with meaningful attributes: http.method, http.status_code, db.statement, error=true. These become searchable in the Jaeger UI and are essential for filtering.',
      'Set sampling to control trace volume in production. "const" sampler with param=1 traces everything (good for dev), probabilistic sampler with param=0.1 traces 10% of requests (good for production).',
      'OpenTelemetry is the future -- instrument your services with OpenTelemetry SDK and send to Jaeger via OTLP (port 4317). This lets you switch tracing backends without code changes.',
    ],
    code_examples: [
      {
        title: 'OpenTelemetry Node.js Setup',
        language: 'javascript',
        code: `// npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
// npm install @opentelemetry/exporter-trace-otlp-grpc

// tracing.js -- MUST be loaded BEFORE your application code
// Run with: node --require ./tracing.js index.js

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure the OpenTelemetry SDK
const sdk = new NodeSDK({
  // Identify this service in Jaeger
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    'deployment.environment': 'lab',
  }),

  // Send traces to Jaeger via OTLP gRPC
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://jaeger:4317',   // DistSim Jaeger hostname
  }),

  // Auto-instrument: Express, HTTP, PostgreSQL, Redis, etc.
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
    }),
  ],
});

// Start the SDK
sdk.start();
console.log('OpenTelemetry tracing initialized');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.shutdown();
  process.exit(0);
});

// That's it! Your Express routes, HTTP calls, and DB queries
// are now automatically traced and visible in the Jaeger UI.`,
        description: 'Auto-instrumentation traces Express routes, HTTP requests, database queries, and Redis calls without changing application code. Traces appear in the Jaeger UI within seconds.',
      },
      {
        title: 'Trace Context Propagation',
        language: 'javascript',
        code: `// Trace context propagation between services
// When Service A calls Service B, pass the trace context in HTTP headers
// This connects spans from both services into a single trace

const { context, trace, SpanStatusCode } = require('@opentelemetry/api');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');

const propagator = new W3CTraceContextPropagator();

// === SERVICE A: Making an outgoing HTTP call ===
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/checkout', async (req, res) => {
  const tracer = trace.getTracer('order-service');

  // Create a span for this operation
  const span = tracer.startSpan('process-checkout');

  try {
    // Add custom attributes to the span (visible in Jaeger)
    span.setAttribute('user.id', 42);
    span.setAttribute('order.amount', 99.99);

    // Propagate trace context to the next service
    // This injects the 'traceparent' header automatically
    const headers = {};
    propagator.inject(context.active(), headers, {
      set: (carrier, key, value) => { carrier[key] = value; },
    });

    // Call the payment service with trace headers
    const response = await fetch('http://payment-service:8080/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,  // Includes 'traceparent' header
      },
      body: JSON.stringify({ user_id: 42, amount: 99.99 }),
    });

    span.setAttribute('http.status_code', response.status);
    span.setStatus({ code: SpanStatusCode.OK });
    res.json({ status: 'checkout complete' });
  } catch (err) {
    // Record the error in the span (visible in Jaeger as a red trace)
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    res.status(500).json({ error: err.message });
  } finally {
    span.end();
  }
});

// === SERVICE B: Receiving the trace context ===
// With auto-instrumentation, Express automatically extracts
// the 'traceparent' header and continues the trace.
// No manual propagation code needed on the receiving side!

app.listen(8080);`,
        description: 'Context propagation connects spans across services into one trace. The traceparent HTTP header carries trace ID and span ID. With auto-instrumentation, this happens automatically for Express and HTTP calls.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 19. CUSTOM GO SERVICE
  // ---------------------------------------------------------------------------
  custom_go: {
    title: 'Go Service -- Custom HTTP Server',
    description:
      'A Go HTTP service you write yourself. Go (Golang) is a statically typed, compiled language designed at Google for building fast, reliable, and efficient backend services. Its standard library includes a production-ready HTTP server (net/http), making it possible to build high-performance APIs without any external framework. Go compiles to a single binary with no dependencies, starts in milliseconds, and handles tens of thousands of concurrent connections via goroutines. Uber, Google, Docker, Kubernetes, Cloudflare, and Twitch all use Go for critical backend services. In DistSim, your Go service can connect to PostgreSQL, MySQL, MongoDB, Redis, Memcached, Kafka, RabbitMQ, NATS, or other HTTP services.',
    install: [
      '# Go may be pre-installed. Check first:',
      'go version',
      '# If not installed:',
      'apt-get update && apt-get install -y golang',
      '# Or download the latest version:',
      'wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz',
      'tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz',
      'export PATH=$PATH:/usr/local/go/bin',
    ],
    config_files: [
      { path: '/home/distsim/app/main.go', description: 'Main application file -- HTTP handlers, routing, database connections, and server startup' },
      { path: '/home/distsim/app/go.mod', description: 'Go module file -- module name and dependency versions (created with "go mod init")' },
    ],
    common_commands: [
      { command: 'cd /home/distsim/app && go mod init myapp', description: 'Initialize a Go module (creates go.mod for dependency management)' },
      { command: 'cd /home/distsim/app && go run main.go &', description: 'Run the service directly from source (compiles and runs in one step)' },
      { command: 'cd /home/distsim/app && go build -o service main.go && ./service &', description: 'Compile to binary and run -- faster startup, smaller memory footprint' },
      { command: 'cd /home/distsim/app && go get github.com/lib/pq', description: 'Install PostgreSQL driver for database connections' },
      { command: 'cd /home/distsim/app && go get github.com/go-redis/redis/v9', description: 'Install Redis client library' },
      { command: 'cd /home/distsim/app && go get github.com/segmentio/kafka-go', description: 'Install Kafka client library for producing/consuming messages' },
      { command: 'cd /home/distsim/app && go get github.com/prometheus/client_golang/prometheus/promhttp', description: 'Install Prometheus client library to expose /metrics endpoint' },
      { command: 'cd /home/distsim/app && go get go.opentelemetry.io/otel', description: 'Install OpenTelemetry SDK for distributed tracing (sends traces to Jaeger)' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl http://localhost:8080/metrics', description: 'Test the Prometheus metrics endpoint (requires promhttp handler)' },
    ],
    test_commands: [
      { command: 'curl http://localhost:8080', description: 'Test if the service is running and responding' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl -w "\\nHTTP %{http_code} | Time: %{time_total}s\\n" http://localhost:8080', description: 'Test with timing information' },
      { command: 'ss -tlnp | grep 8080', description: 'Verify port 8080 is listening' },
      { command: 'go version', description: 'Check the installed Go version' },
    ],
    ports: [
      { port: 8080, description: 'HTTP (default for Go services)' },
    ],
    tips: [
      'Click the service badge to open the code editor with a starter template.',
      'Always add a /health endpoint that returns 200 OK. Load balancers (Nginx, HAProxy) and orchestrators (Consul, Kubernetes) use this to know if your service is alive.',
      'Expose a /metrics endpoint using promhttp.Handler() so Prometheus can scrape your service. This is how you get request rate, latency, and error dashboards in Grafana.',
      'For graceful shutdown: use signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM) and call server.Shutdown(ctx). This lets active requests finish before the process exits.',
      'Connect to PostgreSQL: import "database/sql" and _ "github.com/lib/pq", then sql.Open("postgres", "host=db-primary port=5432 user=appuser password=secret dbname=myapp sslmode=disable").',
      'Connect to Redis: import "github.com/go-redis/redis/v9", then redis.NewClient(&redis.Options{Addr: "redis:6379"}).',
      'Use "go run" for development (rebuilds on every run) and "go build" for production (compile once, deploy the binary).',
      'Go handles concurrency with goroutines -- each HTTP request runs in its own goroutine automatically. No thread pools to configure.',
    ],
    code_examples: [
      {
        title: 'HTTP Server with DB',
        language: 'go',
        code: `// main.go -- Go HTTP server with PostgreSQL connection
// go mod init myapp && go get github.com/lib/pq

package main

import (
\t"database/sql"
\t"encoding/json"
\t"fmt"
\t"log"
\t"net/http"
\t"os"
\t"os/signal"
\t"context"
\t"time"

\t_ "github.com/lib/pq"
)

var db *sql.DB

type User struct {
\tID        int       \`json:"id"\`
\tName      string    \`json:"name"\`
\tEmail     string    \`json:"email"\`
\tCreatedAt time.Time \`json:"created_at"\`
}

func main() {
\t// Connect to PostgreSQL
\tvar err error
\tdb, err = sql.Open("postgres",
\t\t"host=db-primary port=5432 user=appuser password=secret123 dbname=myapp sslmode=disable")
\tif err != nil {
\t\tlog.Fatal("Failed to connect to database:", err)
\t}
\tdb.SetMaxOpenConns(25)
\tdb.SetMaxIdleConns(5)

\tif err = db.Ping(); err != nil {
\t\tlog.Fatal("Database unreachable:", err)
\t}
\tlog.Println("Connected to PostgreSQL")

\t// Routes
\thttp.HandleFunc("/health", healthHandler)
\thttp.HandleFunc("/api/users", usersHandler)

\t// Start server with graceful shutdown
\tserver := &http.Server{Addr: ":8080"}

\tgo func() {
\t\tlog.Println("Server listening on :8080")
\t\tif err := server.ListenAndServe(); err != http.ErrServerClosed {
\t\t\tlog.Fatal(err)
\t\t}
\t}()

\t// Wait for interrupt signal
\tstop := make(chan os.Signal, 1)
\tsignal.Notify(stop, os.Interrupt)
\t<-stop

\tctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
\tdefer cancel()
\tserver.Shutdown(ctx)
\tdb.Close()
\tlog.Println("Server stopped gracefully")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
\tif err := db.Ping(); err != nil {
\t\thttp.Error(w, "database unreachable", 503)
\t\treturn
\t}
\tjson.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "application/json")

\tswitch r.Method {
\tcase "GET":
\t\trows, err := db.Query("SELECT id, name, email, created_at FROM users")
\t\tif err != nil {
\t\t\thttp.Error(w, err.Error(), 500)
\t\t\treturn
\t\t}
\t\tdefer rows.Close()

\t\tvar users []User
\t\tfor rows.Next() {
\t\t\tvar u User
\t\t\trows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
\t\t\tusers = append(users, u)
\t\t}
\t\tjson.NewEncoder(w).Encode(users)

\tcase "POST":
\t\tvar u User
\t\tjson.NewDecoder(r.Body).Decode(&u)
\t\terr := db.QueryRow(
\t\t\t"INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
\t\t\tu.Name, u.Email,
\t\t).Scan(&u.ID)
\t\tif err != nil {
\t\t\thttp.Error(w, err.Error(), 500)
\t\t\treturn
\t\t}
\t\tw.WriteHeader(201)
\t\tjson.NewEncoder(w).Encode(u)
\t}
}`,
        description: 'Production-ready Go HTTP server with PostgreSQL, connection pooling, health check, REST API, and graceful shutdown. Uses only the standard library plus a database driver.',
      },
      {
        title: 'Metrics Endpoint',
        language: 'go',
        code: `// Add Prometheus metrics to your Go service
// go get github.com/prometheus/client_golang/prometheus
// go get github.com/prometheus/client_golang/prometheus/promhttp

package main

import (
\t"net/http"
\t"time"

\t"github.com/prometheus/client_golang/prometheus"
\t"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Define metrics
var (
\thttpRequestsTotal = prometheus.NewCounterVec(
\t\tprometheus.CounterOpts{
\t\t\tName: "http_requests_total",
\t\t\tHelp: "Total number of HTTP requests",
\t\t},
\t\t[]string{"method", "handler", "status_code"},
\t)

\thttpRequestDuration = prometheus.NewHistogramVec(
\t\tprometheus.HistogramOpts{
\t\t\tName:    "http_request_duration_seconds",
\t\t\tHelp:    "HTTP request duration in seconds",
\t\t\tBuckets: prometheus.DefBuckets, // .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
\t\t},
\t\t[]string{"method", "handler"},
\t)

\tactiveConnections = prometheus.NewGauge(
\t\tprometheus.GaugeOpts{
\t\t\tName: "http_active_connections",
\t\t\tHelp: "Number of active HTTP connections",
\t\t},
\t)
)

func init() {
\tprometheus.MustRegister(httpRequestsTotal)
\tprometheus.MustRegister(httpRequestDuration)
\tprometheus.MustRegister(activeConnections)
}

// Middleware that records metrics for every request
func metricsMiddleware(handler string, next http.HandlerFunc) http.HandlerFunc {
\treturn func(w http.ResponseWriter, r *http.Request) {
\t\tactiveConnections.Inc()
\t\tdefer activeConnections.Dec()

\t\tstart := time.Now()
\t\t// Wrap ResponseWriter to capture status code
\t\trw := &responseWriter{ResponseWriter: w, statusCode: 200}
\t\tnext(rw, r)

\t\tduration := time.Since(start).Seconds()
\t\thttpRequestsTotal.WithLabelValues(r.Method, handler, fmt.Sprintf("%d", rw.statusCode)).Inc()
\t\thttpRequestDuration.WithLabelValues(r.Method, handler).Observe(duration)
\t}
}

type responseWriter struct {
\thttp.ResponseWriter
\tstatusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
\trw.statusCode = code
\trw.ResponseWriter.WriteHeader(code)
}

func main() {
\thttp.HandleFunc("/api/users", metricsMiddleware("users", usersHandler))
\thttp.HandleFunc("/health", metricsMiddleware("health", healthHandler))

\t// Expose /metrics for Prometheus to scrape
\thttp.Handle("/metrics", promhttp.Handler())

\thttp.ListenAndServe(":8080", nil)
}`,
        description: 'Prometheus metrics with counters (requests), histograms (latency), and gauges (active connections). The /metrics endpoint is scraped by Prometheus every 15 seconds.',
      },
      {
        title: 'Kafka Consumer',
        language: 'go',
        code: `// Kafka consumer in Go using segmentio/kafka-go
// go get github.com/segmentio/kafka-go

package main

import (
\t"context"
\t"encoding/json"
\t"fmt"
\t"log"
\t"os"
\t"os/signal"

\t"github.com/segmentio/kafka-go"
)

type OrderEvent struct {
\tEvent     string  \`json:"event"\`
\tUserID    int     \`json:"user_id"\`
\tProduct   string  \`json:"product"\`
\tAmount    float64 \`json:"amount"\`
\tTimestamp string  \`json:"timestamp"\`
}

func main() {
\t// Create a consumer that reads from the "orders" topic
\t// as part of the "payment-service" consumer group
\treader := kafka.NewReader(kafka.ReaderConfig{
\t\tBrokers:  []string{"kafka-1:9092"},  // DistSim Kafka broker
\t\tTopic:    "orders",
\t\tGroupID:  "payment-service",          // Consumer group
\t\tMinBytes: 1,                           // Fetch as soon as 1 byte is available
\t\tMaxBytes: 10e6,                        // Max 10MB per fetch
\t})
\tdefer reader.Close()

\t// Context for graceful shutdown
\tctx, cancel := context.WithCancel(context.Background())

\t// Handle shutdown signal
\tgo func() {
\t\tsig := make(chan os.Signal, 1)
\t\tsignal.Notify(sig, os.Interrupt)
\t\t<-sig
\t\tlog.Println("Shutting down consumer...")
\t\tcancel()
\t}()

\tlog.Println("Consumer started, waiting for messages...")

\tfor {
\t\t// Read the next message (blocks until one is available)
\t\tmsg, err := reader.ReadMessage(ctx)
\t\tif err != nil {
\t\t\tif ctx.Err() != nil {
\t\t\t\tbreak // Context cancelled, shutting down
\t\t\t}
\t\t\tlog.Printf("Error reading message: %v", err)
\t\t\tcontinue
\t\t}

\t\t// Parse the event
\t\tvar event OrderEvent
\t\tif err := json.Unmarshal(msg.Value, &event); err != nil {
\t\t\tlog.Printf("Failed to parse message: %v", err)
\t\t\tcontinue
\t\t}

\t\t// Process the event
\t\tlog.Printf("Partition %d | Offset %d | Event: %s | User: %d | Amount: $%.2f",
\t\t\tmsg.Partition, msg.Offset, event.Event, event.UserID, event.Amount)

\t\tswitch event.Event {
\t\tcase "order_created":
\t\t\tfmt.Printf("  -> Processing payment for user %d: $%.2f\\n", event.UserID, event.Amount)
\t\tcase "order_shipped":
\t\t\tfmt.Printf("  -> Sending shipment notification for user %d\\n", event.UserID)
\t\tdefault:
\t\t\tfmt.Printf("  -> Unknown event: %s\\n", event.Event)
\t\t}
\t}

\tlog.Println("Consumer stopped")
}`,
        description: 'Kafka consumer with consumer group, message parsing, event routing, and graceful shutdown. kafka-go handles partition assignment and offset commits automatically within the consumer group.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 20. CUSTOM NODE SERVICE
  // ---------------------------------------------------------------------------
  custom_node: {
    title: 'Node.js Service -- JavaScript HTTP Server',
    description:
      'A Node.js HTTP service you write yourself. Node.js runs JavaScript on the server using the V8 engine (the same engine inside Chrome). It uses a single-threaded event loop with non-blocking I/O, making it excellent for I/O-heavy workloads like API servers, real-time apps (WebSockets), and microservices. LinkedIn, PayPal, Netflix, Walmart, and NASA all use Node.js for backend services. The npm ecosystem is the largest package registry in the world with over 2 million packages. In DistSim, your Node.js service can connect to PostgreSQL, MySQL, MongoDB, Redis, Memcached, Kafka, RabbitMQ, NATS, or other HTTP services using npm packages.',
    install: [
      '# Node.js is pre-installed on this machine.',
      'node --version',
      'npm --version',
      '# To initialize a project and install dependencies:',
      'cd /home/distsim/app && npm init -y',
      'npm install express',
    ],
    config_files: [
      { path: '/home/distsim/app/index.js', description: 'Main application file -- Express routes, middleware, database connections, and server startup' },
      { path: '/home/distsim/app/package.json', description: 'Project manifest -- name, version, dependencies, scripts (created with "npm init -y")' },
    ],
    common_commands: [
      { command: 'cd /home/distsim/app && npm init -y', description: 'Initialize a Node.js project (creates package.json)' },
      { command: 'node /home/distsim/app/index.js &', description: 'Run the service in background' },
      { command: 'cd /home/distsim/app && npm install express', description: 'Install Express web framework (the most popular Node.js framework)' },
      { command: 'cd /home/distsim/app && npm install pg', description: 'Install PostgreSQL client library' },
      { command: 'cd /home/distsim/app && npm install mysql2', description: 'Install MySQL client library' },
      { command: 'cd /home/distsim/app && npm install ioredis', description: 'Install Redis client library (ioredis is the best Node.js Redis client)' },
      { command: 'cd /home/distsim/app && npm install kafkajs', description: 'Install Kafka client library for producing/consuming messages' },
      { command: 'cd /home/distsim/app && npm install prom-client', description: 'Install Prometheus client library to expose /metrics endpoint' },
      { command: 'cd /home/distsim/app && npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node', description: 'Install OpenTelemetry SDK for distributed tracing (auto-instruments Express, HTTP, DB calls)' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl http://localhost:8080/metrics', description: 'Test the Prometheus metrics endpoint (requires prom-client)' },
    ],
    test_commands: [
      { command: 'curl http://localhost:8080', description: 'Test if the service is running and responding' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl -w "\\nHTTP %{http_code} | Time: %{time_total}s\\n" http://localhost:8080', description: 'Test with timing information' },
      { command: 'ss -tlnp | grep 8080', description: 'Verify port 8080 is listening' },
      { command: 'node --version', description: 'Check the installed Node.js version' },
    ],
    ports: [
      { port: 8080, description: 'HTTP (default)' },
    ],
    tips: [
      'Node.js is pre-installed on this machine. Click the service badge to open the code editor with a starter template.',
      'Always add a /health endpoint: app.get("/health", (req, res) => res.json({status: "ok"})). Load balancers and service discovery tools need this.',
      'Expose /metrics with prom-client: const client = require("prom-client"); client.collectDefaultMetrics(); app.get("/metrics", async (req, res) => { res.set("Content-Type", client.register.contentType); res.end(await client.register.metrics()); });',
      'For graceful shutdown: process.on("SIGTERM", () => { server.close(() => { db.end(); process.exit(0); }); }); -- close the HTTP server, then database connections, then exit.',
      'Connect to PostgreSQL: const { Pool } = require("pg"); const pool = new Pool({host: "db-primary", port: 5432, user: "appuser", password: "secret", database: "myapp"});',
      'Connect to Redis: const Redis = require("ioredis"); const redis = new Redis({host: "redis", port: 6379});',
      'Node.js is single-threaded. CPU-heavy work blocks the event loop and kills throughput. Use worker_threads for CPU-bound tasks or offload to a Go/Rust service.',
      'Use "node index.js &" to run in background. Check running processes with "ps aux | grep node". Kill with "kill $(pidof node)".',
    ],
    code_examples: [
      {
        title: 'Express API with PostgreSQL',
        language: 'javascript',
        code: `// index.js -- Express REST API with PostgreSQL
// npm install express pg

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: 'db-primary',       // DistSim hostname
  port: 5432,
  user: 'appuser',
  password: 'secret123',
  database: 'myapp',
  max: 20,
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create user
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
app.delete('/api/users/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ deleted: result.rows[0] });
});

// Graceful shutdown
const server = app.listen(8080, '0.0.0.0', () => {
  console.log('Server listening on :8080');
});

process.on('SIGTERM', () => {
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});`,
        description: 'Complete REST API with CRUD operations, parameterized queries, error handling (duplicate key, not found), health check, and graceful shutdown.',
      },
      {
        title: 'Redis Caching Middleware',
        language: 'javascript',
        code: `// Redis cache-aside middleware for Express
// npm install ioredis

const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis',            // DistSim hostname
  port: 6379,
});

// Cache middleware factory
// Usage: app.get('/api/users', cache(300), usersHandler)
function cache(ttlSeconds = 60) {
  return async (req, res, next) => {
    // Build a cache key from the request
    const cacheKey = \`cache:\${req.originalUrl}\`;

    try {
      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(\`Cache HIT: \${cacheKey}\`);
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }

      // Cache miss -- override res.json to capture the response
      console.log(\`Cache MISS: \${cacheKey}\`);
      res.set('X-Cache', 'MISS');

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Store in cache with TTL
        redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds)
          .catch((err) => console.error('Cache write error:', err));
        return originalJson(data);
      };

      next();
    } catch (err) {
      // If Redis is down, skip cache and serve from DB
      console.error('Redis error, skipping cache:', err.message);
      next();
    }
  };
}

// Cache invalidation helper
async function invalidateCache(pattern) {
  const keys = await redis.keys(\`cache:\${pattern}\`);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(\`Invalidated \${keys.length} cache keys matching \${pattern}\`);
  }
}

// Usage in routes:
// app.get('/api/users', cache(300), getUsers);        // Cache for 5 min
// app.get('/api/users/:id', cache(60), getUser);      // Cache for 1 min
// app.post('/api/users', createUser);                  // No cache
// After creating a user, invalidate: invalidateCache('/api/users*')

module.exports = { cache, invalidateCache };`,
        description: 'Transparent caching middleware that intercepts responses and stores them in Redis. Cache hits skip the database entirely. Includes cache invalidation helper and Redis failure fallback.',
      },
      {
        title: 'Prometheus Metrics',
        language: 'javascript',
        code: `// Prometheus metrics for a Node.js Express service
// npm install prom-client

const client = require('prom-client');

// Collect default Node.js metrics (event loop lag, heap size, GC, etc.)
client.collectDefaultMetrics({ prefix: 'node_' });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of requests currently being processed',
});

// Metrics middleware -- add to Express before your routes
function metricsMiddleware(req, res, next) {
  activeRequests.inc();
  const start = Date.now();

  // Capture when the response finishes
  res.on('finish', () => {
    activeRequests.dec();
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe(
      { method: req.method, route: route },
      duration
    );
  });

  next();
}

// Metrics endpoint -- Prometheus scrapes this
async function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

// Usage:
// const app = express();
// app.use(metricsMiddleware);
// app.get('/metrics', metricsHandler);
// app.get('/api/users', usersHandler);
// app.listen(8080);

module.exports = { metricsMiddleware, metricsHandler };`,
        description: 'Prometheus metrics with counters, histograms, and gauges. The middleware automatically tracks every request. Expose /metrics for Prometheus to scrape. These metrics power Grafana dashboards.',
      },
      {
        title: 'Kafka Producer',
        language: 'javascript',
        code: `// Publish Kafka events from an Express API
// npm install kafkajs express

const { Kafka } = require('kafkajs');
const express = require('express');

const app = express();
app.use(express.json());

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'api-service',
  brokers: ['kafka-1:9092'],   // DistSim Kafka broker
});

const producer = kafka.producer();
let producerReady = false;

// Connect on startup
(async () => {
  await producer.connect();
  producerReady = true;
  console.log('Kafka producer connected');
})();

// Helper: publish an event to Kafka
async function publishEvent(topic, key, event) {
  if (!producerReady) {
    console.warn('Kafka producer not ready, skipping event');
    return;
  }

  await producer.send({
    topic,
    messages: [{
      key,
      value: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        source: 'api-service',
      }),
    }],
  });
}

// POST /api/orders -- creates order AND publishes Kafka event
app.post('/api/orders', async (req, res) => {
  const { user_id, product, amount } = req.body;

  try {
    // 1. Save to database (your DB logic here)
    const order = { id: Date.now(), user_id, product, amount, status: 'created' };

    // 2. Publish event to Kafka
    // Key = user_id ensures all events for the same user go to the same partition
    await publishEvent('orders', \`user-\${user_id}\`, {
      event: 'order_created',
      order_id: order.id,
      user_id,
      product,
      amount,
    });

    console.log(\`Order \${order.id} created and event published\`);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/ship -- publishes shipment event
app.post('/api/orders/:id/ship', async (req, res) => {
  const orderId = req.params.id;

  await publishEvent('orders', \`order-\${orderId}\`, {
    event: 'order_shipped',
    order_id: orderId,
    tracking: \`TRACK-\${Date.now()}\`,
  });

  res.json({ status: 'shipped', order_id: orderId });
});

// Graceful shutdown
const server = app.listen(8080, () => console.log('API on :8080'));

process.on('SIGTERM', async () => {
  server.close();
  await producer.disconnect();
  process.exit(0);
});`,
        description: 'Event-driven API that publishes Kafka events on every state change. Downstream services (payment, notification, analytics) consume these events independently without the API knowing about them.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 21. CUSTOM PYTHON SERVICE
  // ---------------------------------------------------------------------------
  custom_python: {
    title: 'Python Service -- HTTP Server',
    description:
      'A Python HTTP service you write yourself. Python is the most popular programming language in the world (as of 2024), known for its readability and vast ecosystem. Flask and FastAPI are the most common frameworks for building HTTP APIs in Python. Instagram runs the largest Python deployment (Django) serving over 2 billion users. Spotify, Dropbox, Reddit, Stripe, and Netflix all use Python for backend services, data pipelines, and ML inference. Python is not the fastest language for raw HTTP throughput (Go and Rust are 5-10x faster), but its development speed and library ecosystem make it the top choice for rapid prototyping, data-heavy services, and ML-integrated APIs. In DistSim, your Python service can connect to any database, cache, or message broker using pip packages.',
    install: [
      '# Python3 is pre-installed on this machine.',
      'python3 --version',
      'pip3 --version',
      '# Install common frameworks and libraries:',
      'pip3 install flask requests',
    ],
    config_files: [
      { path: '/home/distsim/app/app.py', description: 'Main application file -- Flask routes, database connections, middleware, and server startup' },
      { path: '/home/distsim/app/requirements.txt', description: 'Dependency file -- list of pip packages with versions (created manually or with "pip3 freeze > requirements.txt")' },
    ],
    common_commands: [
      { command: 'python3 /home/distsim/app/app.py &', description: 'Run the service in background' },
      { command: 'pip3 install flask', description: 'Install Flask web framework (lightweight, most popular micro-framework)' },
      { command: 'pip3 install fastapi uvicorn', description: 'Install FastAPI (modern, async, auto-generates OpenAPI docs) with uvicorn ASGI server' },
      { command: 'pip3 install psycopg2-binary', description: 'Install PostgreSQL client library' },
      { command: 'pip3 install pymysql', description: 'Install MySQL client library' },
      { command: 'pip3 install pymongo', description: 'Install MongoDB client library' },
      { command: 'pip3 install redis', description: 'Install Redis client library' },
      { command: 'pip3 install kafka-python', description: 'Install Kafka client library for producing/consuming messages' },
      { command: 'pip3 install prometheus-client', description: 'Install Prometheus client library to expose /metrics endpoint' },
      { command: 'pip3 install opentelemetry-sdk opentelemetry-instrumentation-flask', description: 'Install OpenTelemetry SDK for distributed tracing (auto-instruments Flask)' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl http://localhost:8080/metrics', description: 'Test the Prometheus metrics endpoint (requires prometheus_client)' },
    ],
    test_commands: [
      { command: 'curl http://localhost:8080', description: 'Test if the service is running and responding' },
      { command: 'curl http://localhost:8080/health', description: 'Test the health check endpoint' },
      { command: 'curl -w "\\nHTTP %{http_code} | Time: %{time_total}s\\n" http://localhost:8080', description: 'Test with timing information' },
      { command: 'ss -tlnp | grep 8080', description: 'Verify port 8080 is listening' },
      { command: 'python3 --version', description: 'Check the installed Python version' },
    ],
    ports: [
      { port: 8080, description: 'HTTP (default)' },
    ],
    tips: [
      'Python3 is pre-installed on this machine. Click the service badge to open the code editor with a starter template.',
      'Always add a /health endpoint: @app.route("/health") def health(): return jsonify({"status": "ok"}), 200. Every load balancer and health checker needs this.',
      'Expose /metrics with prometheus_client: from prometheus_client import make_wsgi_app; from werkzeug.middleware.dispatcher import DispatcherMiddleware; app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {"/metrics": make_wsgi_app()}).',
      'For graceful shutdown with Flask: import signal, sys; signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit(0)). For production, use Gunicorn with --graceful-timeout.',
      'Connect to PostgreSQL: import psycopg2; conn = psycopg2.connect(host="db-primary", port=5432, user="appuser", password="secret", dbname="myapp").',
      'Connect to Redis: import redis; r = redis.Redis(host="redis", port=6379, decode_responses=True).',
      'Flask\'s built-in server is single-threaded and NOT suitable for production. Use Gunicorn for production: "pip3 install gunicorn && gunicorn -w 4 -b 0.0.0.0:8080 app:app" (4 worker processes).',
      'Use "python3 app.py &" to run in background. Check running processes with "ps aux | grep python". Kill with "kill $(pidof python3)".',
    ],
    code_examples: [
      {
        title: 'Flask API with PostgreSQL',
        language: 'python',
        code: `# app.py -- Flask REST API with PostgreSQL
# pip3 install flask psycopg2-binary

from flask import Flask, jsonify, request
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

# Database connection
def get_db():
    return psycopg2.connect(
        host='db-primary',       # DistSim hostname
        port=5432,
        user='appuser',
        password='secret123',
        dbname='myapp',
        cursor_factory=RealDictCursor
    )

# Health check
@app.route('/health')
def health():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        conn.close()
        return jsonify({'status': 'ok', 'db': 'connected'})
    except Exception as e:
        return jsonify({'status': 'error', 'db': str(e)}), 503

# GET all users
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT * FROM users ORDER BY created_at DESC')
    users = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(users)

# GET single user
@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)

# POST create user
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            'INSERT INTO users (name, email) VALUES (%s, %s) RETURNING *',
            (data['name'], data['email'])
        )
        user = cur.fetchone()
        conn.commit()
        return jsonify(user), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'error': 'Email already exists'}), 409
    finally:
        cur.close()
        conn.close()

# DELETE user
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('DELETE FROM users WHERE id = %s RETURNING *', (user_id,))
    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'deleted': user})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)`,
        description: 'Complete Flask REST API with CRUD, parameterized queries, error handling, and proper connection management. Use Gunicorn in production: gunicorn -w 4 -b 0.0.0.0:8080 app:app.',
      },
      {
        title: 'Redis Session Store',
        language: 'python',
        code: `# Redis-based session management for Flask
# pip3 install flask redis uuid

import redis
import uuid
import json
import time
from flask import Flask, jsonify, request, g
from functools import wraps

app = Flask(__name__)

# Connect to Redis
r = redis.Redis(
    host='redis',          # DistSim hostname
    port=6379,
    decode_responses=True  # Return strings instead of bytes
)

SESSION_TTL = 3600  # Sessions expire after 1 hour

# Create a new session
def create_session(user_id, user_data):
    session_id = str(uuid.uuid4())
    session_data = {
        'user_id': user_id,
        'created_at': time.time(),
        **user_data
    }
    # Store session in Redis with TTL
    r.setex(
        f'session:{session_id}',
        SESSION_TTL,
        json.dumps(session_data)
    )
    return session_id

# Get session data
def get_session(session_id):
    data = r.get(f'session:{session_id}')
    if data:
        # Refresh TTL on access (sliding expiration)
        r.expire(f'session:{session_id}', SESSION_TTL)
        return json.loads(data)
    return None

# Delete a session (logout)
def destroy_session(session_id):
    r.delete(f'session:{session_id}')

# Authentication middleware
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return jsonify({'error': 'Missing X-Session-ID header'}), 401

        session = get_session(session_id)
        if not session:
            return jsonify({'error': 'Session expired or invalid'}), 401

        g.session = session  # Make session available to the handler
        return f(*args, **kwargs)
    return decorated

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    # In production: validate credentials against database
    user_id = data.get('user_id', 1)
    session_id = create_session(user_id, {
        'name': data.get('name', 'Alice'),
        'role': data.get('role', 'user')
    })
    return jsonify({'session_id': session_id, 'expires_in': SESSION_TTL})

# Protected endpoint
@app.route('/api/profile')
@require_auth
def profile():
    return jsonify({'session': g.session})

# Logout endpoint
@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    session_id = request.headers.get('X-Session-ID')
    destroy_session(session_id)
    return jsonify({'status': 'logged out'})

# Count active sessions
@app.route('/api/sessions/count')
def session_count():
    count = len(r.keys('session:*'))
    return jsonify({'active_sessions': count})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)`,
        description: 'Redis session store with sliding expiration, authentication middleware, and login/logout endpoints. Sessions are stored in Redis so they persist across application restarts and work across multiple app instances.',
      },
      {
        title: 'Prometheus Metrics',
        language: 'python',
        code: `# Prometheus metrics for a Flask application
# pip3 install flask prometheus-client

from flask import Flask, request
from prometheus_client import (
    Counter, Histogram, Gauge,
    generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry, multiprocess
)
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from prometheus_client import make_wsgi_app
import time

app = Flask(__name__)

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

ACTIVE_REQUESTS = Gauge(
    'http_active_requests',
    'Number of requests currently being processed'
)

DB_QUERY_DURATION = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],  # select, insert, update, delete
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
)

# Metrics middleware
@app.before_request
def before_request():
    ACTIVE_REQUESTS.inc()
    request._start_time = time.time()

@app.after_request
def after_request(response):
    ACTIVE_REQUESTS.dec()
    duration = time.time() - request._start_time
    endpoint = request.endpoint or 'unknown'

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=response.status_code
    ).inc()

    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=endpoint
    ).observe(duration)

    return response

# Expose /metrics endpoint
@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

# Example: instrument database queries
def timed_query(query_type):
    """Context manager to time database queries"""
    class Timer:
        def __enter__(self):
            self.start = time.time()
            return self
        def __exit__(self, *args):
            DB_QUERY_DURATION.labels(query_type=query_type).observe(
                time.time() - self.start
            )
    return Timer()

# Usage:
# with timed_query('select'):
#     cursor.execute('SELECT * FROM users')

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)`,
        description: 'Flask middleware that automatically tracks request count, duration, and active connections. Includes a database query timer. Prometheus scrapes /metrics every 15 seconds.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 22. API TESTER
  // ---------------------------------------------------------------------------
  api_tester: {
    title: 'API Tester -- HTTP Request Tool for Testing Your Lab',
    description:
      'The API Tester lets you make HTTP requests to any service in your DistSim lab from any machine. It is like having Postman or Insomnia running inside your infrastructure, so you experience the real network path, latency, DNS resolution, and load balancer behavior. You can test individual endpoints, chain requests together (create a user, then fetch that user), set custom headers, send JSON bodies, and measure response times. The API Tester runs on the machine where it is installed, which means requests originate from that machine\'s network position -- testing from behind a load balancer gives different results than testing from outside it. Use it to verify services are running, test API endpoints, debug connectivity issues, and measure performance under different network conditions (like after adding chaos/latency).',
    install: [
      '# No installation needed -- uses curl which is pre-installed on all machines.',
      'curl --version',
    ],
    config_files: [],
    common_commands: [
      { command: 'curl http://app-server:8080/', description: 'Simple GET request to an app server' },
      { command: 'curl -X POST http://app-server:8080/api/users -H "Content-Type: application/json" -d \'{"name":"Alice","email":"alice@test.com"}\'', description: 'POST request with a JSON body to create a resource' },
      { command: 'curl -X PUT http://app-server:8080/api/users/1 -H "Content-Type: application/json" -d \'{"name":"Alice Updated"}\'', description: 'PUT request to update a resource' },
      { command: 'curl -X DELETE http://app-server:8080/api/users/1', description: 'DELETE request to remove a resource' },
      { command: 'curl -I http://app-server:8080/', description: 'HEAD request -- show response headers only (status code, content-type, server)' },
      { command: 'curl -v http://app-server:8080/', description: 'Verbose mode -- show the full request/response including headers and TLS details' },
      { command: 'curl -w "\\nHTTP %{http_code} | DNS: %{time_namelookup}s | Connect: %{time_connect}s | TTFB: %{time_starttransfer}s | Total: %{time_total}s\\n" http://app-server:8080/', description: 'Detailed timing breakdown: DNS resolution, TCP connect, time to first byte, total time' },
      { command: 'curl -H "Authorization: Bearer <token>" http://app-server:8080/api/protected', description: 'Send a request with an Authorization header (Bearer token)' },
      { command: 'curl -H "X-Request-ID: test-123" http://app-server:8080/', description: 'Send a custom request ID header for tracing a specific request through logs' },
      { command: 'curl -o /dev/null -s -w "%{http_code}" http://app-server:8080/health', description: 'Silent health check -- output only the HTTP status code (useful in scripts)' },
      { command: 'for i in $(seq 1 10); do curl -s -w "%{http_code} %{time_total}s\\n" -o /dev/null http://app-server:8080/; done', description: 'Send 10 requests in a loop and show status code + response time for each (basic load testing)' },
      { command: 'curl -s http://app-server:8080/api/users | python3 -m json.tool', description: 'GET request with pretty-printed JSON output' },
    ],
    test_commands: [
      { command: 'curl http://app-server:8080/health', description: 'Check if the target service is healthy' },
      { command: 'getent hosts app-server', description: 'Verify DNS resolution -- does the hostname resolve to an IP?' },
      { command: 'curl -w "\\nHTTP %{http_code} | Total: %{time_total}s\\n" http://app-server:8080/', description: 'Quick connectivity and latency test' },
    ],
    ports: [],
    tips: [
      'Click the api_tester badge to open the visual API tester panel for a GUI experience.',
      'Requests originate FROM the machine where api_tester is installed. Testing from "client" gives different results than testing from "load-balancer" -- you are testing the real network path.',
      'Use machine hostnames (not IPs) in your requests -- they resolve via DNS inside the DistSim network. This is how real microservice communication works.',
      'Chain requests to test workflows: create a user (POST), read it back (GET), update it (PUT), delete it (DELETE), verify it is gone (GET should return 404).',
      'Use environment variables for reusable values: export BASE_URL="http://app-server:8080" then curl $BASE_URL/api/users. Makes switching between services easy.',
      'The timing breakdown (-w flag) is invaluable for debugging: high time_namelookup means DNS issues, high time_connect means network issues, high time_starttransfer means the server is slow.',
      'Test chaos: add network delay to a connection in DistSim, then run the timing command. You will see the latency increase in real-time -- this is how you validate chaos engineering experiments.',
      'For load testing beyond curl loops, install "ab" (Apache Bench): apt-get install -y apache2-utils, then "ab -n 1000 -c 10 http://app-server:8080/" sends 1000 requests with 10 concurrent.',
    ],
    code_examples: [
      {
        title: 'Common Test Patterns',
        language: 'bash',
        code: `# Common API testing patterns using curl

# === Health Check ===
curl -s http://app-server:8080/health | python3 -m json.tool
# Expected: {"status": "ok"}

# === CRUD Workflow ===
# 1. CREATE a user (POST)
curl -s -X POST http://app-server:8080/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice","email":"alice@test.com"}' | python3 -m json.tool
# Save the returned ID for subsequent requests

# 2. READ the user back (GET)
curl -s http://app-server:8080/api/users/1 | python3 -m json.tool

# 3. UPDATE the user (PUT)
curl -s -X PUT http://app-server:8080/api/users/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice Updated"}' | python3 -m json.tool

# 4. DELETE the user (DELETE)
curl -s -X DELETE http://app-server:8080/api/users/1 | python3 -m json.tool

# 5. VERIFY deletion (should return 404)
curl -s -o /dev/null -w "%{http_code}" http://app-server:8080/api/users/1
# Expected: 404

# === With Authentication ===
# Login and capture the token
TOKEN=$(curl -s -X POST http://app-server:8080/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@test.com","password":"secret"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Use the token in subsequent requests
curl -s http://app-server:8080/api/protected \\
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# === Detailed Timing ===
curl -w "\\n--- Timing ---\\nDNS:     %{time_namelookup}s\\nConnect: %{time_connect}s\\nTTFB:    %{time_starttransfer}s\\nTotal:   %{time_total}s\\nStatus:  %{http_code}\\n" \\
  -s -o /dev/null http://app-server:8080/api/users`,
        description: 'Standard test patterns for verifying API functionality: health checks, full CRUD lifecycle, authenticated requests, and detailed timing breakdown for performance analysis.',
      },
      {
        title: 'Load Test Script',
        language: 'bash',
        code: `#!/bin/bash
# Simple load test script using curl
# Tests request rate, response times, and error rates

TARGET="http://app-server:8080/api/users"
NUM_REQUESTS=100
CONCURRENT=10    # Number of parallel requests

echo "=== Load Test: $NUM_REQUESTS requests, $CONCURRENT concurrent ==="
echo "Target: $TARGET"
echo ""

# Sequential test with timing
echo "--- Sequential Test (baseline) ---"
TOTAL_TIME=0
ERRORS=0
for i in $(seq 1 $NUM_REQUESTS); do
  RESULT=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" $TARGET)
  STATUS=$(echo $RESULT | cut -d' ' -f1)
  TIME=$(echo $RESULT | cut -d' ' -f2)

  if [ "$STATUS" != "200" ]; then
    ERRORS=$((ERRORS + 1))
  fi

  TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)

  # Print progress every 10 requests
  if [ $((i % 10)) -eq 0 ]; then
    AVG=$(echo "scale=3; $TOTAL_TIME / $i" | bc)
    echo "  [$i/$NUM_REQUESTS] Status: $STATUS | Time: \${TIME}s | Avg: \${AVG}s | Errors: $ERRORS"
  fi
done

AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $NUM_REQUESTS" | bc)
ERROR_RATE=$(echo "scale=1; $ERRORS * 100 / $NUM_REQUESTS" | bc)
RPS=$(echo "scale=1; $NUM_REQUESTS / $TOTAL_TIME" | bc)

echo ""
echo "--- Results ---"
echo "Total Requests: $NUM_REQUESTS"
echo "Total Time:     \${TOTAL_TIME}s"
echo "Avg Latency:    \${AVG_TIME}s"
echo "Requests/sec:   $RPS"
echo "Errors:         $ERRORS ($ERROR_RATE%)"
echo ""

# Parallel burst test using background processes
echo "--- Burst Test ($CONCURRENT concurrent) ---"
START=$(date +%s%N)
for i in $(seq 1 $CONCURRENT); do
  (
    for j in $(seq 1 $((NUM_REQUESTS / CONCURRENT))); do
      curl -s -o /dev/null -w "%{http_code}\\n" $TARGET
    done
  ) &
done
wait
END=$(date +%s%N)

BURST_TIME=$(echo "scale=3; ($END - $START) / 1000000000" | bc)
BURST_RPS=$(echo "scale=1; $NUM_REQUESTS / $BURST_TIME" | bc)
echo "Burst Time:     \${BURST_TIME}s"
echo "Burst RPS:      $BURST_RPS"`,
        description: 'Load testing script with sequential baseline and concurrent burst mode. Measures average latency, requests per second, and error rate. Use to compare performance before and after changes.',
      },
    ],
  },
};
