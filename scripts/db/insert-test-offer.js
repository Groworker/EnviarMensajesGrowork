/**
 * Script para insertar una oferta de prueba en la base de datos
 * Ejecutar con: npm run script:insert-test-offer
 */
const { createDbClient } = require('../config');

async function insertTestOffer() {
  const client = await createDbClient();

  try {
    const query = `
      INSERT INTO job_offers
        (hotel, empresa, puesto, ciudad, pais, email, fecha_scrape, url_oferta, texto_oferta)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
      RETURNING id, empresa, puesto, email, pais, ciudad;
    `;

    const values = [
      'Hotel Prueba Test',
      'Empresa de Prueba',
      'Gerente de Prueba',
      'Berlin',
      'Alemania',
      'borgesinmas@gmail.com',
      'https://prueba.test',
      'Oferta de prueba para testing'
    ];

    const result = await client.query(query, values);

    console.log('\nOferta de prueba insertada:');
    console.log('ID:', result.rows[0].id);
    console.log('Empresa:', result.rows[0].empresa);
    console.log('Puesto:', result.rows[0].puesto);
    console.log('Email:', result.rows[0].email);
    console.log('Pais:', result.rows[0].pais);
    console.log('Ciudad:', result.rows[0].ciudad);

    return result.rows[0];
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

insertTestOffer()
  .then(() => {
    console.log('\nScript completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript fallo:', error);
    process.exit(1);
  });
