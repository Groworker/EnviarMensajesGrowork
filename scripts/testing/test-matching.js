/**
 * Script de prueba para verificar el matching de criterios
 * Ejecutar con: npm run script:test-matching
 *
 * NOTA: El backend debe estar corriendo en localhost:3000
 */
const http = require('http');
const { apiConfig } = require('../config');

async function testMatching() {
  console.log('PRUEBA DE CONFIGURACION DE MATCHING\n');
  console.log('='.repeat(60));

  // 1. Configurar criterios para el cliente 29 (Ultimo)
  const newSettings = {
    active: true,
    isWarmupActive: true,
    minDailyEmails: 2,
    maxDailyEmails: 100,
    currentDailyLimit: 2,
    targetDailyLimit: 50,
    matchingCriteria: {
      matchMode: 'any',  // OR logic
      jobTitleMatchMode: 'contains',
      enabledFilters: ['countries', 'cities', 'jobTitle']
    }
  };

  console.log('\nPASO 1: Guardando criterios...');
  console.log('Criterios a guardar:', JSON.stringify(newSettings.matchingCriteria, null, 2));

  const postData = JSON.stringify(newSettings);
  const options = {
    hostname: 'localhost',
    port: apiConfig.port,
    path: '/api/clients/29/settings',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Criterios guardados correctamente');
          resolve(JSON.parse(data));
        } else {
          console.error('Error al guardar:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  // 2. Verificar que se guardaron
  console.log('\nPASO 2: Verificando que se guardaron...');

  await new Promise((resolve, reject) => {
    http.get(`http://localhost:${apiConfig.port}/api/clients/29`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const client = JSON.parse(data);
        console.log('\n=== DATOS DEL CLIENTE ===');
        console.log('Paises:', client.paisesInteres?.values || client.paisesInteres);
        console.log('Ciudades:', client.ciudadesInteres?.values || client.ciudadesInteres);
        console.log('Puesto:', client.jobTitle);

        console.log('\n=== CONFIGURACION DE MATCHING ===');
        const criteria = client.sendSettings.matchingCriteria;
        console.log('Match Mode:', criteria.matchMode || 'all (default)');
        console.log('Job Title Mode:', criteria.jobTitleMatchMode || 'contains (default)');
        console.log('Filtros activos:', criteria.enabledFilters || ['todos (default)']);

        console.log('\n=== QUERY SQL QUE SE GENERARA ===');

        const paises = Array.isArray(client.paisesInteres?.values)
          ? client.paisesInteres.values
          : typeof client.paisesInteres?.values === 'string'
          ? [client.paisesInteres.values]
          : [];

        const ciudades = Array.isArray(client.ciudadesInteres?.values)
          ? client.ciudadesInteres.values
          : typeof client.ciudadesInteres?.values === 'string'
          ? [client.ciudadesInteres.values]
          : [];

        const conditions = [];

        if (!criteria.enabledFilters || criteria.enabledFilters.length === 0 || criteria.enabledFilters.includes('countries')) {
          if (paises.length > 0) {
            conditions.push(`offer.pais IN (${paises.map(p => `'${p}'`).join(', ')})`);
          }
        }

        if (!criteria.enabledFilters || criteria.enabledFilters.length === 0 || criteria.enabledFilters.includes('cities')) {
          if (ciudades.length > 0) {
            conditions.push(`offer.ciudad IN (${ciudades.map(c => `'${c}'`).join(', ')})`);
          }
        }

        if (!criteria.enabledFilters || criteria.enabledFilters.length === 0 || criteria.enabledFilters.includes('jobTitle')) {
          if (client.jobTitle) {
            const mode = criteria.jobTitleMatchMode || 'contains';
            if (mode === 'exact') {
              conditions.push(`LOWER(offer.puesto) = LOWER('${client.jobTitle}')`);
            } else {
              conditions.push(`offer.puesto ILIKE '%${client.jobTitle}%'`);
            }
          }
        }

        const operator = criteria.matchMode === 'any' ? ' OR ' : ' AND ';
        const whereClause = conditions.length > 0
          ? `WHERE (\n    ${conditions.join(`\n    ${operator}\n    `)}\n  )`
          : 'WHERE 1=1 -- Sin filtros configurados';

        console.log(`
SELECT * FROM job_offers offer
${whereClause}
  AND offer.id NOT IN (SELECT job_offer_id FROM email_sends WHERE client_id = 29)
  AND offer.email NOT IN (SELECT email FROM email_reputation WHERE is_bounced = true OR is_invalid = true)
ORDER BY offer.fechaScrape DESC
LIMIT 5;
`);

        console.log('\n' + '='.repeat(60));
        console.log('PRUEBA COMPLETADA\n');
        console.log('INTERPRETACION:');
        if (criteria.matchMode === 'any') {
          console.log('   - Las ofertas deben cumplir AL MENOS UNA de las condiciones');
        } else {
          console.log('   - Las ofertas deben cumplir TODAS las condiciones');
        }

        console.log('\nPROXIMOS PASOS:');
        console.log('   1. Espera al scheduler (6:00 AM) o ejecutalo manualmente');
        console.log('   2. El worker procesara el SendJob cada minuto');
        console.log('   3. Verifica en la tabla email_sends que se envien emails');

        resolve();
      });
    }).on('error', reject);
  });
}

testMatching().catch(console.error);
