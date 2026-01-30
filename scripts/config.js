/**
 * Configuración compartida para scripts de utilidad
 * Lee las credenciales desde el archivo .env del backend
 */
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde backend/.env
const envPath = path.join(__dirname, '..', 'backend', '.env');

if (!fs.existsSync(envPath)) {
  console.error('Error: No se encontró el archivo backend/.env');
  console.error('Asegúrate de que el archivo existe con las credenciales de la base de datos.');
  process.exit(1);
}

// Parsear el archivo .env manualmente (sin dependencias externas)
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

/**
 * Configuración de la base de datos
 */
const dbConfig = {
  host: envVars.DATABASE_HOST || 'localhost',
  port: parseInt(envVars.DATABASE_PORT || '5432', 10),
  user: envVars.DATABASE_USER || 'postgres',
  password: envVars.DATABASE_PASSWORD || '',
  database: envVars.DATABASE_NAME || 'postgres',
  ssl: envVars.DATABASE_SSL === 'true',
};

/**
 * Crea y retorna un cliente de PostgreSQL conectado
 * @returns {Promise<import('pg').Client>}
 */
async function createDbClient() {
  const { Client } = require('pg');
  const client = new Client(dbConfig);
  await client.connect();
  console.log('Conectado a la base de datos');
  return client;
}

/**
 * Configuración de la API (para scripts de testing)
 */
const apiConfig = {
  baseUrl: `http://localhost:${envVars.PORT || 3000}`,
  port: parseInt(envVars.PORT || '3000', 10),
};

module.exports = {
  dbConfig,
  apiConfig,
  createDbClient,
};
